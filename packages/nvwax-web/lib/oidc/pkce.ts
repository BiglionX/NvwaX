/**
 * PKCE（Proof Key for Code Exchange, RFC 7636）工具
 *
 * - code_verifier：43–128 字符，字符集 [A-Z a-z 0-9 - . _ ~]
 * - code_challenge = BASE64URL(SHA256(ASCII(code_verifier))) — S256
 *
 * 兼容性：浏览器与 Node 20+ 均通过 globalThis.crypto.subtle 暴露 Web Crypto。
 * 适配 Next.js 15 的 Node / Edge 两种 server runtime。
 */

// RFC 7636 推荐的字符集
const PKCE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

const DEFAULT_VERIFIER_LENGTH = 64; // 落在 43–128 区间

function getCrypto(): Crypto {
  if (
    typeof globalThis === 'undefined' ||
    typeof globalThis.crypto?.getRandomValues !== 'function' ||
    typeof globalThis.crypto?.subtle?.digest !== 'function'
  ) {
    throw new Error('Web Crypto API is not available in this runtime');
  }
  return globalThis.crypto;
}

/**
 * 生成 PKCE code_verifier。
 * 长度 43–128（默认 64），字符集严格限定 RFC 7636 范围。
 */
export function generateCodeVerifier(length: number = DEFAULT_VERIFIER_LENGTH): string {
  if (length < 43 || length > 128) {
    throw new Error(`code_verifier length must be between 43 and 128, got ${length}`);
  }
  return generateFromAlphabet(length);
}

/**
 * 从 PKCE 字符集随机生成定长字符串。
 * state / nonce 复用此底层（避免 43 长度下限误伤）。
 */
function generateFromAlphabet(length: number): string {
  const crypto = getCrypto();
  // 采样次数取 2 倍长度以摊平模偏置（ALPHABET 长度 66，与 256 不互质）
  const bytes = new Uint8Array(length * 2);
  crypto.getRandomValues(bytes);

  let out = '';
  for (let i = 0; i < length; i++) {
    // 使用拒绝采样避免模偏置：丢弃 ≥ 252 的字节（66 * 3 = 198，252 是 66 的整数倍 - 4 边界）
    const byte = bytes[i * 2]!;
    if (byte < 252) {
      out += PKCE_ALPHABET[byte % PKCE_ALPHABET.length];
    } else {
      // 退路用下一个字节重采，确保严格定长
      out += PKCE_ALPHABET[bytes[i * 2 + 1]! % PKCE_ALPHABET.length];
    }
  }
  return out;
}

/**
 * 派生 PKCE code_challenge（S256 方法）。
 *  challenge = BASE64URL(SHA256(ASCII(verifier)))
 */
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  if (!verifier) {
    throw new Error('code_verifier is required');
  }
  const crypto = getCrypto();
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * 生成 OIDC state（防 CSRF）。
 * 长度 22+ 字节熵即可，默认 32。
 * 字符集与 PKCE 一致；不复用 generateCodeVerifier（避免 PKCE 43 长度下限误伤）。
 */
export function generateState(length: number = 32): string {
  if (length < 22 || length > 256) {
    throw new Error(`state length must be between 22 and 256, got ${length}`);
  }
  return generateFromAlphabet(length);
}

/**
 * 生成 OIDC nonce（防 ID token 重放）。
 * 长度 22+ 字节熵即可，默认 32。
 * 字符集与 PKCE 一致；不复用 generateCodeVerifier（避免 PKCE 43 长度下限误伤）。
 */
export function generateNonce(length: number = 32): string {
  if (length < 22 || length > 256) {
    throw new Error(`nonce length must be between 22 and 256, got ${length}`);
  }
  return generateFromAlphabet(length);
}

// ─────────── 内部工具 ───────────

function base64UrlEncode(bytes: Uint8Array): string {
  // Node 20+ 与浏览器均提供 globalThis.btoa；Node < 16 走 Buffer 兜底
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
