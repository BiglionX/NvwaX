/**
 * Session Cookie 加密（AES-256-GCM）
 *
 * 用途：把 OIDC tokens 加密后存到 httpOnly cookie。
 *       即便 cookie 被泄露（中间人 / 浏览器扩展），没有 key 也无法解出。
 *
 * 格式（base64）：
 *   [12 bytes IV][16 bytes AuthTag][N bytes ciphertext]
 *
 * Key 派生：OIDC_SESSION_SECRET（base64 字符串）直接当 256-bit key 使用。
 *           若长度不是 32 字节，抛错（强制运维用 openssl rand -base64 32）。
 */

const ALGO = 'AES-GCM';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.OIDC_SESSION_SECRET;
  if (!secret) {
    throw new Error('[session] OIDC_SESSION_SECRET is not set');
  }
  // 允许 base64 编码的 32 字节串，也允许 32 字节明文字符串（dev 兜底）
  let keyBytes: Uint8Array;
  try {
    const decoded = base64ToBytes(secret);
    if (decoded.length === 32) {
      keyBytes = decoded;
    } else {
      keyBytes = new TextEncoder().encode(secret);
    }
  } catch {
    keyBytes = new TextEncoder().encode(secret);
  }

  if (keyBytes.length !== 32) {
    throw new Error(
      `[session] OIDC_SESSION_SECRET must be 32 bytes (256 bits), got ${keyBytes.length}`,
    );
  }
  return crypto.subtle.importKey('raw', keyBytes as BufferSource, ALGO, false, ['encrypt', 'decrypt']);
}

function getCrypto(): Crypto {
  if (typeof globalThis.crypto?.subtle === 'undefined') {
    throw new Error('[session] Web Crypto subtle API is not available');
  }
  return globalThis.crypto;
}

export async function encryptForCookie(plaintext: string): Promise<string> {
  const c = getCrypto();
  const key = await getKey();
  const iv = c.getRandomValues(new Uint8Array(IV_LENGTH));
  const data = new TextEncoder().encode(plaintext);
  const ciphertextWithTag = new Uint8Array(await c.subtle.encrypt({ name: ALGO, iv }, key, data as BufferSource));
  // Web Crypto AES-GCM 把 auth tag 拼在密文末尾（最后 16 字节）
  const out = new Uint8Array(IV_LENGTH + ciphertextWithTag.byteLength);
  out.set(iv, 0);
  out.set(ciphertextWithTag, IV_LENGTH);
  return bytesToBase64(out);
}

export async function decryptFromCookie(payload: string): Promise<string> {
  const c = getCrypto();
  const key = await getKey();
  const buf = base64ToBytes(payload);
  if (buf.byteLength < IV_LENGTH + TAG_LENGTH) {
    throw new Error('[session] payload too short');
  }
  const iv = buf.slice(0, IV_LENGTH);
  const ciphertextWithTag = buf.slice(IV_LENGTH);
  const plain = await c.subtle.decrypt({ name: ALGO, iv }, key, ciphertextWithTag as BufferSource);
  return new TextDecoder().decode(plain);
}

// ─────────── 内部工具 ───────────

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 =
    typeof globalThis.btoa === 'function'
      ? globalThis.btoa(binary)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (globalThis as any).Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64ToBytes(b64: string): Uint8Array {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4);
  let binary: string;
  if (typeof globalThis.atob === 'function') {
    binary = globalThis.atob(padded);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    binary = (globalThis as any).Buffer.from(padded, 'base64').toString('binary');
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
