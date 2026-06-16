/**
 * PKCE 工具函数 (RFC 7636)
 *
 * 仅依赖 Node `crypto`，不依赖 jose 或 Express。
 * 用于 OAuth 2.0 Authorization Code + PKCE 流程的
 * code_verifier 生成、code_challenge 派生与校验。
 *
 * 安全要点：
 * - 使用 crypto.randomBytes（CSPRNG）
 * - 使用 base64url 无 padding 编码
 * - 使用 crypto.timingSafeEqual 防止时序攻击
 */

import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

/** RFC 7636 §4.1 推荐的 code_verifier 长度区间（字符数） */
const MIN_VERIFIER_LENGTH = 43;
const MAX_VERIFIER_LENGTH = 128;

/** 默认 code_verifier 字节数（64 字节 → 86 字符 base64url） */
const DEFAULT_VERIFIER_BYTES = 64;

/**
 * 生成一个符合 RFC 7636 §4.1 的 code_verifier。
 *
 * 长度 = ceil(N * 4 / 3) base64url 字符，落在 43-128 区间。
 * 默认 64 字节随机源 → 86 字符输出。
 *
 * @param bytes 随机字节数（默认 64），输出长度必须落在 [43, 128]
 * @returns base64url 编码的 code_verifier
 */
export function generateCodeVerifier(bytes: number = DEFAULT_VERIFIER_BYTES): string {
  if (bytes < 32) {
    // 至少需要 32 字节才能保证输出 ≥ 43 字符
    throw new Error('PKCE: bytes must be >= 32 to produce a valid verifier');
  }

  const buf = randomBytes(bytes);
  return bufferToBase64Url(buf);
}

/**
 * 根据 code_verifier 和 method 派生 code_challenge。
 *
 * @param verifier code_verifier
 * @param method 'S256' 或 'plain'
 * @returns code_challenge（base64url 编码）
 */
export function deriveCodeChallenge(
  verifier: string,
  method: 'S256' | 'plain',
): string {
  assertValidVerifier(verifier);

  if (method === 'plain') {
    return verifier;
  }

  if (method === 'S256') {
    return bufferToBase64Url(
      createHash('sha256').update(verifier, 'ascii').digest(),
    );
  }

  throw new Error(`PKCE: unsupported code_challenge_method: ${method}`);
}

/**
 * 校验 code_verifier 与 code_challenge 是否匹配。
 *
 * 使用 constant-time 比较防时序攻击。
 *
 * @param verifier 客户端传来的 code_verifier
 * @param challenge 服务端之前签发的 code_challenge
 * @param method 'S256' 或 'plain'
 * @returns true 表示匹配
 */
export function verifyCodeChallenge(
  verifier: string,
  challenge: string,
  method: 'S256' | 'plain',
): boolean {
  try {
    const derived = deriveCodeChallenge(verifier, method);
    if (derived.length !== challenge.length) return false;
    return timingSafeStringEqual(derived, challenge);
  } catch {
    return false;
  }
}

// ──────────── 内部工具 ────────────

function bufferToBase64Url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function assertValidVerifier(verifier: string): void {
  if (
    verifier.length < MIN_VERIFIER_LENGTH ||
    verifier.length > MAX_VERIFIER_LENGTH
  ) {
    throw new Error(
      `PKCE: code_verifier length must be in [${MIN_VERIFIER_LENGTH}, ${MAX_VERIFIER_LENGTH}], got ${verifier.length}`,
    );
  }
  if (!/^[A-Za-z0-9\-._~]+$/.test(verifier)) {
    throw new Error(
      'PKCE: code_verifier must only contain [A-Z][a-z][0-9]-._~',
    );
  }
}

/**
 * constant-time 字符串比较（先 equal-length，再 timingSafeEqual Buffer）。
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}