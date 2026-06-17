/**
 * PKCE 工具单测（RFC 7636）
 *
 * 覆盖：
 * - generateCodeVerifier 长度边界 / 字符集 / 随机性 / 严格定长
 * - deriveCodeChallenge 与 RFC 7636 Appendix B 测试向量
 * - generateState / generateNonce 与 generateCodeVerifier 行为一致
 */

import { describe, it, expect } from 'vitest';
import {
  generateCodeVerifier,
  deriveCodeChallenge,
  generateState,
  generateNonce,
} from './pkce';

const PKCE_ALPHABET = /^[A-Za-z0-9\-._~]+$/;
const BASE64URL_RE = /^[A-Za-z0-9\-_]+$/;

describe('PKCE: generateCodeVerifier', () => {
  it('默认生成长度为 64 的 verifier', () => {
    const v = generateCodeVerifier();
    expect(v).toHaveLength(64);
  });

  it('接受 43-128 边界长度', () => {
    expect(generateCodeVerifier(43)).toHaveLength(43);
    expect(generateCodeVerifier(44)).toHaveLength(44);
    expect(generateCodeVerifier(127)).toHaveLength(127);
    expect(generateCodeVerifier(128)).toHaveLength(128);
  });

  it('越界长度（< 43）抛错', () => {
    expect(() => generateCodeVerifier(42)).toThrow(/between 43 and 128/);
    expect(() => generateCodeVerifier(0)).toThrow(/between 43 and 128/);
  });

  it('越界长度（> 128）抛错', () => {
    expect(() => generateCodeVerifier(129)).toThrow(/between 43 and 128/);
    expect(() => generateCodeVerifier(1024)).toThrow(/between 43 and 128/);
  });

  it('字符集严格限定 RFC 7636 范围 [A-Z a-z 0-9 - . _ ~]', () => {
    for (let i = 0; i < 20; i++) {
      const v = generateCodeVerifier();
      expect(v).toMatch(PKCE_ALPHABET);
    }
  });

  it('10000 次调用长度严格定长（拒绝采样不退化）', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 10000; i++) {
      seen.add(generateCodeVerifier().length);
    }
    expect(seen.size).toBe(1);
    expect([...seen][0]).toBe(64);
  });

  it('两次调用结果不等（随机性）', () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
  });
});

describe('PKCE: deriveCodeChallenge', () => {
  // RFC 7636 Appendix B 测试向量
  // verifier → S256 challenge
  it('RFC 7636 Appendix B 测试向量', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await deriveCodeChallenge(verifier);
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('空串抛错', async () => {
    await expect(deriveCodeChallenge('')).rejects.toThrow(/required/);
  });

  it('输出仅 base64url 字符集（无 +/=）', async () => {
    const v = generateCodeVerifier();
    const c = await deriveCodeChallenge(v);
    expect(c).toMatch(BASE64URL_RE);
    expect(c).not.toMatch(/[+/=]/);
  });

  it('输出长度固定为 43（SHA-256 → base64url）', async () => {
    const v = generateCodeVerifier();
    const c = await deriveCodeChallenge(v);
    expect(c).toHaveLength(43);
  });
});

describe('PKCE: generateState / generateNonce', () => {
  it('generateState 默认长度 32', () => {
    expect(generateState()).toHaveLength(32);
  });

  it('generateNonce 默认长度 32', () => {
    expect(generateNonce()).toHaveLength(32);
  });

  it('generateState 字符集限定', () => {
    expect(generateState()).toMatch(PKCE_ALPHABET);
  });

  it('generateNonce 字符集限定', () => {
    expect(generateNonce()).toMatch(PKCE_ALPHABET);
  });

  it('两次调用结果不等', () => {
    expect(generateState()).not.toBe(generateState());
    expect(generateNonce()).not.toBe(generateNonce());
  });
});
