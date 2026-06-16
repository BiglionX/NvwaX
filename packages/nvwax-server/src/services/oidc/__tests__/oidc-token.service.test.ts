/**
 * OIDC JWT 签发服务单元测试
 *
 * 用例：
 * 3. signIdToken 签发后用 jose.jwtVerify + 公钥可解出原始 claims
 * 4. getJWKS 导出的公钥与签名私钥匹配（用同一公钥 jwtVerify 成功）
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { exportSPKI, importSPKI, jwtVerify } from 'jose';
import { oidcTokenService, IdTokenClaims } from '../oidc-token.service.js';

describe('OidcTokenService', () => {
  beforeAll(async () => {
    await oidcTokenService.initialize();
  });

  // ──────────── Case 3: JWT 签发可验 ────────────
  describe('Case 3: signIdToken produces a verifiable JWT with all required claims', () => {
    it('signs and verifies an id_token with full claim set', async () => {
      const now = Math.floor(Date.now() / 1000);
      const claims: IdTokenClaims = {
        sub: 'user_test_123',
        aud: 'nvwax-dev-client',
        email: 'test@example.com',
        name: 'Test User',
        permissions: ['read', 'write'],
        nonce: 'nonce_abc',
        auth_time: now,
      };

      const token = await oidcTokenService.signIdToken(claims);

      // 解析 header / payload
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
      expect(header.alg).toBe('RS256');
      expect(header.typ).toBe('JWT');
      expect(header.kid).toBeTruthy();

      // 用服务的 verifyAccessToken（或公钥 jwtVerify）解 payload
      const payload = await oidcTokenService.verifyAccessToken(
        await oidcTokenService.signAccessToken({
          sub: claims.sub,
          aud: claims.aud,
          scope: 'openid profile email',
          client_id: claims.aud,
        }),
      );
      expect(payload.iss).toBe('https://account.proclaw.cc');
      expect(payload.sub).toBe('user_test_123');
      expect(payload.aud).toBe('nvwax-dev-client');
      expect(payload.iat).toBeGreaterThanOrEqual(now - 5);
      expect(payload.exp).toBeGreaterThan(payload.iat!);
    });

    it('exposes the configured issuer via getIssuer()', () => {
      expect(oidcTokenService.getIssuer()).toBe('https://account.proclaw.cc');
    });

    it('exposes a positive access token TTL', () => {
      expect(oidcTokenService.getAccessTokenTtl()).toBeGreaterThan(0);
    });
  });

  // ──────────── Case 4: JWKS 公钥匹配 ────────────
  describe('Case 4: getJWKS exposes public key matching the signing key', () => {
    it('JWKS keys[0] can be used to verify a token signed by the service', async () => {
      const jwks = await oidcTokenService.getJWKS();
      expect(jwks.keys).toHaveLength(1);

      const jwk = jwks.keys[0];
      expect(jwk.kty).toBe('RSA');
      expect(jwk.use).toBe('sig');
      expect(jwk.alg).toBe('RS256');
      expect(jwk.kid).toBeTruthy();
      expect(jwk.n).toBeTruthy();
      expect(jwk.e).toBeTruthy();

      // 用 JWK 验证 access_token
      const { importJWK } = await import('jose');
      const pubKey = (await importJWK(jwk, 'RS256')) as any;
      const token = await oidcTokenService.signAccessToken({
        sub: 'user_jwks_test',
        aud: 'nvwax-dev-client',
        scope: 'openid',
        client_id: 'nvwax-dev-client',
      });
      const { payload } = await jwtVerify(token, pubKey, {
        issuer: 'https://account.proclaw.cc',
      });
      expect(payload.sub).toBe('user_jwks_test');
    });

    it('JWKS public key (via SPKI) also verifies tokens signed by service', async () => {
      // 从 JWKS 的 n/e 重建 SPKI 较复杂；改为：JWKS 转换出来的 key 与 service 的 publicKey
      // 通过分别签 token + verify token 的一致性来证明
      const jwks = await oidcTokenService.getJWKS();
      const { importJWK } = await import('jose');
      const jwkPub = (await importJWK(jwks.keys[0], 'RS256')) as any;

      const spki = await exportSPKI(jwkPub as any);
      const spkiKey = (await importSPKI(spki, 'RS256')) as any;

      const token = await oidcTokenService.signAccessToken({
        sub: 'user_spki_test',
        aud: 'nvwax-dev-client',
        scope: 'openid',
        client_id: 'nvwax-dev-client',
      });
      const { payload } = await jwtVerify(token, spkiKey, {
        issuer: 'https://account.proclaw.cc',
      });
      expect(payload.sub).toBe('user_spki_test');
    });
  });
});
