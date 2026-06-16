/**
 * PKCE 工具函数单元测试（RFC 7636）
 *
 * 用例：
 * 1. S256 校验通过 RFC 7636 Appendix B 标准测试向量
 * 2. 拒绝篡改 verifier / 错误 method / 长度越界
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateCodeVerifier,
  deriveCodeChallenge,
  verifyCodeChallenge,
} from '../pkce.util.js';

describe('PKCE util (RFC 7636)', () => {
  // ──────────── Case 1: S256 标准向量 ────────────
  describe('Case 1: S256 with RFC 7636 Appendix B vector', () => {
    it('verifies the standard S256 vector', () => {
      // RFC 7636 §B.1 / §B.2 标准测试向量
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      expect(deriveCodeChallenge(verifier, 'S256')).toBe(challenge);
      expect(verifyCodeChallenge(verifier, challenge, 'S256')).toBe(true);
    });

    it('generates a verifier of valid length and verify-able S256 challenge', () => {
      const verifier = generateCodeVerifier();
      // 64 字节 → 86 字符 base64url
      expect(verifier.length).toBe(86);
      expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);

      const challenge = deriveCodeChallenge(verifier, 'S256');
      expect(challenge.length).toBeGreaterThan(0);
      expect(verifyCodeChallenge(verifier, challenge, 'S256')).toBe(true);
    });

    it('plain method returns the verifier itself', () => {
      const verifier = generateCodeVerifier();
      expect(deriveCodeChallenge(verifier, 'plain')).toBe(verifier);
      expect(verifyCodeChallenge(verifier, verifier, 'plain')).toBe(true);
    });
  });

  // ──────────── Case 2: 反例 ────────────
  describe('Case 2: rejects tampered verifier / wrong method / invalid length', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

    it('rejects a tampered verifier', () => {
      const tampered = 'X' + verifier.slice(1);
      expect(verifyCodeChallenge(tampered, challenge, 'S256')).toBe(false);
    });

    it('rejects plain method when S256 challenge is expected', () => {
      // verifier 本身 ≠ S256 派生结果
      expect(verifyCodeChallenge(verifier, challenge, 'plain')).toBe(false);
    });

    it('rejects an out-of-range length verifier', () => {
      const short = 'a'.repeat(30); // 短于 43
      expect(() => deriveCodeChallenge(short, 'S256')).toThrow(/length/);
      expect(() => deriveCodeChallenge(short, 'plain')).toThrow(/length/);

      const long = 'a'.repeat(129); // 长于 128
      expect(() => deriveCodeChallenge(long, 'S256')).toThrow(/length/);
    });

    it('rejects verifier with invalid characters', () => {
      const invalid = 'a'.repeat(42) + '!'; // 长度合法但含非法字符
      expect(() => deriveCodeChallenge(invalid, 'S256')).toThrow(
        /must only contain/,
      );
    });

    it('rejects unsupported challenge method', () => {
      expect(() =>
        // @ts-expect-error: 故意传入非法值
        deriveCodeChallenge(verifier, 'S512'),
      ).toThrow(/unsupported/);
    });

    it('rejects when challenge length differs', () => {
      const shortChallenge = 'abc';
      expect(verifyCodeChallenge(verifier, shortChallenge, 'S256')).toBe(false);
    });
  });
});
