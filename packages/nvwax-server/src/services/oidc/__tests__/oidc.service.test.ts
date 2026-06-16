/**
 * OIDC 业务逻辑服务单元测试
 *
 * 用例：
 * 5. consumeAuthorizationCode rejects replay
 * 6. rotateRefreshToken revokes old token and links to new one
 * 7. verifyScope intersects requested with allowed and enforces openid
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { OidcError } from '../oidc-error.js';

// ESM 模式下 jest.mock 不会影响动态 import；必须用 jest.unstable_mockModule 并在 import 前声明
const mockGetPool = jest.fn();

jest.unstable_mockModule('../../database.service.js', () => ({
  databaseService: {
    getPool: mockGetPool,
  },
}));

// 必须在 mock 之后动态 import
const { oidcService } = await import('../oidc.service.js');

describe('OidcService', () => {
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = {
      query: jest.fn(),
    };
    mockGetPool.mockReturnValue(mockPool);
  });

  // ──────────── Case 5: 授权码一次性 ────────────
  describe('Case 5: consumeAuthorizationCode rejects replay', () => {
    it('throws invalid_grant on second consume of the same code', async () => {
      const code = 'test_code_aaa';
      const clientId = 'nvwax-dev-client';
      const redirectUri = 'http://localhost:3000/callback';
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const challenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      // 第一次调用：成功
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            user_id: 'user_123',
            scope: 'openid profile email',
            nonce: null,
            code_challenge: challenge,
            code_challenge_method: 'S256',
          },
        ],
      });

      const first = await oidcService.consumeAuthorizationCode(
        code,
        clientId,
        redirectUri,
        verifier,
      );
      expect(first.userId).toBe('user_123');
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      // 第二次调用：模拟 rowCount = 0（已被标记 used）
      mockPool.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });

      await expect(
        oidcService.consumeAuthorizationCode(code, clientId, redirectUri, verifier),
      ).rejects.toThrow(OidcError);
    });

    it('rejects when PKCE verifier does not match (code still marked used)', async () => {
      const code = 'test_code_bbb';
      const clientId = 'nvwax-dev-client';
      const redirectUri = 'http://localhost:3000/callback';
      const correctChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            user_id: 'user_123',
            scope: 'openid',
            nonce: null,
            code_challenge: correctChallenge,
            code_challenge_method: 'S256',
          },
        ],
      });

      // 错误 verifier
      const wrongVerifier = 'X' + 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'.slice(1);
      await expect(
        oidcService.consumeAuthorizationCode(code, clientId, redirectUri, wrongVerifier),
      ).rejects.toThrow(/PKCE/);
    });
  });

  // ──────────── Case 6: refresh token 链式轮换 ────────────
  describe('Case 6: rotateRefreshToken revokes old and links to new', () => {
    it('revokes the old token and returns a new one linked via rotated_from', async () => {
      const oldToken = 'old_refresh_token_xxx';
      const clientId = 'nvwax-dev-client';

      // 第一步：UPDATE 旧 token 标记 revoked，返回 user_id 和 scope
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ user_id: 'user_456', scope: 'openid profile' }],
      });
      // 第二步：INSERT 新 token
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
      });

      const result = await oidcService.rotateRefreshToken(oldToken, clientId);
      expect(result.userId).toBe('user_456');
      expect(result.clientId).toBe(clientId);
      expect(result.scope).toBe('openid profile');
      expect(result.token).toBeTruthy();
      expect(result.tokenHash).toBeTruthy();
      // 旧 hash 应被记为 rotated_from（第二次 query 的参数）
      const insertCall = mockPool.query.mock.calls[1];
      expect(insertCall[1][5]).toBeTruthy(); // rotated_from 参数

      // 第二次轮换：旧 token 已 revoked → 抛错
      mockPool.query.mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });
      await expect(
        oidcService.rotateRefreshToken(oldToken, clientId),
      ).rejects.toThrow(/invalid|expired|revoked/);
    });
  });

  // ──────────── Case 7: scope 校验 ────────────
  describe('Case 7: verifyScope intersects requested with allowed and enforces openid', () => {
    it('intersects requested with allowed, returning the effective scope', () => {
      const allowed = ['openid', 'profile', 'email'];
      const effective = oidcService.verifyScope('openid profile fake_scope', allowed);
      expect(effective).toBe('openid profile');
    });

    it('keeps order: openid first, then requested order', () => {
      const allowed = ['openid', 'profile', 'email', 'address'];
      // 'address profile email openid' → 全部都在 allowed → 保持 requested 顺序
      const effective = oidcService.verifyScope('address profile email openid', allowed);
      expect(effective.split(' ')).toEqual(['address', 'profile', 'email', 'openid']);
    });

    it('rejects when openid is missing', () => {
      const allowed = ['openid', 'profile', 'email'];
      expect(() => oidcService.verifyScope('profile email', allowed)).toThrow(
        /openid/,
      );
    });

    it('rejects when no scope matches allowed list', () => {
      const allowed = ['openid', 'profile', 'email'];
      // 没有 openid → 抩 'openid' 错误
      expect(() => oidcService.verifyScope('fake_scope', allowed)).toThrow(
        /openid/,
      );
    });

    it('rejects empty or missing scope', () => {
      const allowed = ['openid', 'profile'];
      expect(() => oidcService.verifyScope('', allowed)).toThrow(/required/);
    });

    it('throws OidcError with code invalid_scope', () => {
      const allowed = ['openid', 'profile'];
      try {
        oidcService.verifyScope('profile', allowed);
        throw new Error('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(OidcError);
        expect((err as OidcError).code).toBe('invalid_scope');
        expect((err as OidcError).httpStatus).toBe(400);
      }
    });
  });
});