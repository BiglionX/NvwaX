/**
 * Session Cookie 加密单测（AES-256-GCM）
 *
 * 覆盖：
 * - 加密 → 解密往返（普通 ASCII / 中文 / emoji / JSON / 边界长度）
 * - IV 随机性：两次同 plaintext → 不同密文
 * - 输出 base64url 字符集
 * - Key 派生：OIDC_SESSION_SECRET 缺失 / 长度非 32 字节抛错
 * - Key 派生：base64 编码 32 字节 / UTF-8 明文 32 字节
 * - payload 长度不足 / 篡改 → 解密失败
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encryptForCookie, decryptFromCookie } from './cookie-crypto';

// 32 字节 base64 编码的固定 secret（test fixture）
const BASE64_SECRET_32 = Buffer.from('a'.repeat(32)).toString('base64');
// 32 字节明文 secret
const UTF8_SECRET_32 = 'a'.repeat(32);
// 16 字节 secret（合法 AES key 长度之外的）
const BAD_SECRET_16 = 'a'.repeat(16);
// 64 字节 secret（过大）
const BAD_SECRET_64 = 'a'.repeat(64);

const ORIGINAL_ENV = process.env.OIDC_SESSION_SECRET;

beforeEach(() => {
  // 默认：每个 test 走合法的 32 字节 base64 secret
  process.env.OIDC_SESSION_SECRET = BASE64_SECRET_32;
});

afterEach(() => {
  process.env.OIDC_SESSION_SECRET = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

describe('cookie-crypto: 加密 → 解密往返', () => {
  it('普通 ASCII 字符串往返一致', async () => {
    const plain = 'hello world';
    const enc = await encryptForCookie(plain);
    const dec = await decryptFromCookie(enc);
    expect(dec).toBe(plain);
  });

  it('中文 + emoji + JSON 完整还原', async () => {
    const plain = JSON.stringify({ name: '张三', emoji: '🚀🔥', sub: 'user-001' });
    const enc = await encryptForCookie(plain);
    const dec = await decryptFromCookie(enc);
    expect(dec).toBe(plain);
  });

  it('空串往返（不应抛错）', async () => {
    const enc = await encryptForCookie('');
    const dec = await decryptFromCookie(enc);
    expect(dec).toBe('');
  });

  it('长字符串（> 4KB）往返一致', async () => {
    const plain = 'x'.repeat(5000);
    const enc = await encryptForCookie(plain);
    const dec = await decryptFromCookie(enc);
    expect(dec).toBe(plain);
  });
});

describe('cookie-crypto: 输出格式', () => {
  it('两次加密同一 plaintext 密文不同（IV 随机）', async () => {
    const plain = 'same-plaintext';
    const enc1 = await encryptForCookie(plain);
    const enc2 = await encryptForCookie(plain);
    expect(enc1).not.toBe(enc2);
  });

  it('密文长度合规：base64 解码后 = 28 + plaintext_byte_len', async () => {
    const plain = 'abc'; // 3 字节
    const enc = await encryptForCookie(plain);
    // base64url → base64：补齐 padding 再解
    const padded = enc.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (padded.length % 4)) % 4);
    const decoded = Buffer.from(padded + padding, 'base64');
    // 12 bytes IV + 16 bytes Tag + N bytes ciphertext
    expect(decoded.byteLength).toBe(28 + new TextEncoder().encode(plain).byteLength);
  });

  it('输出仅 base64url 字符集（无 + / = ）', async () => {
    for (let i = 0; i < 20; i++) {
      const enc = await encryptForCookie(`payload-${i}-${Math.random()}`);
      expect(enc).toMatch(/^[A-Za-z0-9\-_]+$/);
    }
  });
});

describe('cookie-crypto: OIDC_SESSION_SECRET 校验', () => {
  it('缺失 OIDC_SESSION_SECRET 抛错', async () => {
    delete process.env.OIDC_SESSION_SECRET;
    await expect(encryptForCookie('x')).rejects.toThrow(/OIDC_SESSION_SECRET is not set/);
    await expect(decryptFromCookie('AAAA')).rejects.toThrow(/OIDC_SESSION_SECRET is not set/);
  });

  it('secret 长度 16 字节（不是 32）抛错', async () => {
    process.env.OIDC_SESSION_SECRET = BAD_SECRET_16;
    await expect(encryptForCookie('x')).rejects.toThrow(/must be 32 bytes/);
  });

  it('secret 长度 64 字节抛错', async () => {
    process.env.OIDC_SESSION_SECRET = BAD_SECRET_64;
    await expect(encryptForCookie('x')).rejects.toThrow(/must be 32 bytes/);
  });

  it('secret 是 base64 编码的 32 字节 → 正常加解密', async () => {
    process.env.OIDC_SESSION_SECRET = BASE64_SECRET_32;
    const enc = await encryptForCookie('hello');
    const dec = await decryptFromCookie(enc);
    expect(dec).toBe('hello');
  });

  it('secret 是 UTF-8 明文 32 字节 → 正常加解密', async () => {
    process.env.OIDC_SESSION_SECRET = UTF8_SECRET_32;
    const enc = await encryptForCookie('hello');
    const dec = await decryptFromCookie(enc);
    expect(dec).toBe('hello');
  });

  it('两个不同 secret 不能互相解密（key 派生独立）', async () => {
    process.env.OIDC_SESSION_SECRET = BASE64_SECRET_32;
    const enc = await encryptForCookie('hello');
    // 切换到不同 secret
    process.env.OIDC_SESSION_SECRET = Buffer.from('b'.repeat(32)).toString('base64');
    await expect(decryptFromCookie(enc)).rejects.toBeTruthy();
  });
});

describe('cookie-crypto: payload 完整性', () => {
  it('payload 字节 < 28 抛 "payload too short"', async () => {
    // 任何 < 28 字节的输入都应抛错
    // 先造一个 10 字节的"假 payload"（base64 编码后是 14 字符）
    const tiny = Buffer.from('short').toString('base64url');
    await expect(decryptFromCookie(tiny)).rejects.toThrow(/payload too short/);
  });

  it('篡改 payload（翻转密文最后 1 字节）→ 解密失败', async () => {
    const enc = await encryptForCookie('hello');
    // 把最后 1 个 base64url 字符换掉
    const last = enc.charAt(enc.length - 1);
    const replacement = last === 'A' ? 'B' : 'A';
    const tampered = enc.slice(0, -1) + replacement;
    await expect(decryptFromCookie(tampered)).rejects.toBeTruthy();
  });

  it('完全乱码 payload → 解密失败（不抛 too short 外的固定错）', async () => {
    const garbage = 'Y'.repeat(40); // 足够长，> 28 字节
    await expect(decryptFromCookie(garbage)).rejects.toBeTruthy();
  });
});
