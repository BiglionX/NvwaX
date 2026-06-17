/**
 * OIDC RP Client Service 单元测试（Sprint 2.9）
 *
 * 用例覆盖：
 *  1. registerRP 生成 client_id 以 rp_ 开头且唯一
 *  2. registerRP 返回明文 secret，且 hash 可用 bcrypt 反向校验
 *  3. registerRP 默认值（token_endpoint_auth_method='client_secret_post'、require_pkce=true）
 *  4. registerRP 拒绝空 name
 *  5. registerRP 拒绝空 redirect_uris
 *  6. registerRP 拒绝 allowed_scopes 不含 'openid'
 *  7. registerRP 拒绝非白名单 scope
 *  8. registerRP 拒绝 http 但非 localhost 的 redirect_uri
 *  9. listRPs 默认过滤 is_active=false
 * 10. listRPs search 按 name/client_id 模糊匹配
 * 11. listRPs includeRevoked=true 返回所有
 * 12. revokeRP 软删成功 + 已撤销返回 false
 * 13. rotateSecret 返回新明文 + DB hash 已变
 * 14. rotateSecret 对不存在 client 抛错
 * 15. getRP 返回包含 client_secret_hash
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';

const mockGetPool = jest.fn();

jest.unstable_mockModule('../../database.service.js', () => ({
  databaseService: {
    getPool: mockGetPool,
  },
}));

const { oidcClientService, RPValidationError } = await import('../oidc-client.service.js');

describe('OidcClientService', () => {
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = {
      query: jest.fn(),
    };
    mockGetPool.mockReturnValue(mockPool);
  });

  // ──────────── Case 1+2: registerRP 生成 client_id + secret hash 可验证 ────────────
  describe('Case 1+2: registerRP returns client_id/secret with verifiable hash', () => {
    it('returns a rp_-prefixed client_id and bcrypt-hashed secret', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            client_id: 'rp_test_xxxx',
            client_secret_hash: '$2a$10$fakehash',
            name: 'Test RP',
            redirect_uris: ['http://localhost:3000/cb'],
            allowed_scopes: ['openid', 'profile', 'email'],
            allowed_grant_types: ['authorization_code', 'refresh_token'],
            require_pkce: true,
            token_endpoint_auth_method: 'client_secret_post',
            is_active: true,
            created_at: new Date('2026-06-17T00:00:00Z'),
          },
        ],
      });

      const result = await oidcClientService.registerRP({
        name: 'Test RP',
        redirect_uris: ['http://localhost:3000/cb'],
        allowed_scopes: ['openid', 'profile', 'email'],
      });

      // result.client_id 来自 mock RETURNING row；sqlParams[0] 是 service 生成的真实 client_id
      expect(result.client_id).toBe('rp_test_xxxx'); // mock row 原样返回
      expect(result.client_secret).toBeTruthy();
      expect(result.client_secret.length).toBeGreaterThanOrEqual(32);

      // 验证 INSERT SQL 用了 bcrypt hash
      const insertCall = mockPool.query.mock.calls[0];
      const sql = insertCall[0];
      const sqlParams = insertCall[1];
      expect(sql).toMatch(/INSERT INTO oidc_clients/);
      // sqlParams[0] = service 生成的真实 client_id（不等于 mock row 的返回值）
      expect(sqlParams[0]).toMatch(/^rp_[A-Za-z0-9_-]+$/);
      expect(sqlParams[0]).not.toBe(result.client_id); // 模拟环境隔离
      // sqlParams[1] = client_secret_hash 应该是 bcrypt hash（$2a$ / $2b$ 前缀）
      expect(sqlParams[1]).toMatch(/^\$2[aby]\$10\$/);
      // 用 bcrypt 反向校验：传入明文 secret 应能 match 该 hash
      const hashOk = await bcrypt.compare(result.client_secret, sqlParams[1]);
      expect(hashOk).toBe(true);
    });

    it('generates different client_id/client_secret on each call (uniqueness)', async () => {
      // 模拟两次 INSERT 都成功
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              client_id: 'rp_a',
              client_secret_hash: 'h1',
              name: 'X',
              redirect_uris: ['http://localhost:3000/cb'],
              allowed_scopes: ['openid'],
              allowed_grant_types: ['authorization_code', 'refresh_token'],
              require_pkce: true,
              token_endpoint_auth_method: 'client_secret_post',
              is_active: true,
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              client_id: 'rp_b',
              client_secret_hash: 'h2',
              name: 'X',
              redirect_uris: ['http://localhost:3000/cb'],
              allowed_scopes: ['openid'],
              allowed_grant_types: ['authorization_code', 'refresh_token'],
              require_pkce: true,
              token_endpoint_auth_method: 'client_secret_post',
              is_active: true,
              created_at: new Date(),
            },
          ],
        });

      const r1 = await oidcClientService.registerRP({
        name: 'X',
        redirect_uris: ['http://localhost:3000/cb'],
        allowed_scopes: ['openid'],
      });
      const r2 = await oidcClientService.registerRP({
        name: 'X',
        redirect_uris: ['http://localhost:3000/cb'],
        allowed_scopes: ['openid'],
      });

      expect(r1.client_id).not.toBe(r2.client_id);
      expect(r1.client_secret).not.toBe(r2.client_secret);
    });
  });

  // ──────────── Case 3: 默认值 ────────────
  describe('Case 3: registerRP defaults', () => {
    it('uses client_secret_post / require_pkce=true / authorization_code+refresh_token by default', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            client_id: 'rp_x',
            client_secret_hash: 'h',
            name: 'X',
            redirect_uris: ['http://localhost:3000/cb'],
            allowed_scopes: ['openid'],
            allowed_grant_types: ['authorization_code', 'refresh_token'],
            require_pkce: true,
            token_endpoint_auth_method: 'client_secret_post',
            is_active: true,
            created_at: new Date(),
          },
        ],
      });

      await oidcClientService.registerRP({
        name: 'X',
        redirect_uris: ['http://localhost:3000/cb'],
        allowed_scopes: ['openid'],
      });

      const sqlParams = mockPool.query.mock.calls[0][1];
      expect(sqlParams[5]).toEqual(['authorization_code', 'refresh_token']); // allowed_grant_types
      expect(sqlParams[6]).toBe(true); // require_pkce
      expect(sqlParams[7]).toBe('client_secret_post'); // token_endpoint_auth_method
    });

    it('honors user-provided token_endpoint_auth_method=none (public client)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            client_id: 'rp_pub',
            client_secret_hash: null,
            name: 'Public',
            redirect_uris: ['http://localhost:3000/cb'],
            allowed_scopes: ['openid'],
            allowed_grant_types: ['authorization_code'],
            require_pkce: true,
            token_endpoint_auth_method: 'none',
            is_active: true,
            created_at: new Date(),
          },
        ],
      });

      await oidcClientService.registerRP({
        name: 'Public',
        redirect_uris: ['http://localhost:3000/cb'],
        allowed_scopes: ['openid'],
        token_endpoint_auth_method: 'none',
      });

      const sqlParams = mockPool.query.mock.calls[0][1];
      expect(sqlParams[7]).toBe('none');
    });
  });

  // ──────────── Case 4: 拒绝空 name ────────────
  describe('Case 4: registerRP rejects empty name', () => {
    it('throws RPValidationError( INVALID_NAME ) when name is missing/empty', async () => {
      await expect(
        oidcClientService.registerRP({
          name: '',
          redirect_uris: ['http://localhost:3000/cb'],
          allowed_scopes: ['openid'],
        }),
      ).rejects.toBeInstanceOf(RPValidationError);

      await expect(
        oidcClientService.registerRP({
          // @ts-expect-error 测试缺字段
          name: undefined,
          redirect_uris: ['http://localhost:3000/cb'],
          allowed_scopes: ['openid'],
        }),
      ).rejects.toThrow(/name/);
    });

    it('rejects name longer than 100 chars', async () => {
      await expect(
        oidcClientService.registerRP({
          name: 'a'.repeat(101),
          redirect_uris: ['http://localhost:3000/cb'],
          allowed_scopes: ['openid'],
        }),
      ).rejects.toThrow(/100/);
    });
  });

  // ──────────── Case 5: 拒绝空 redirect_uris ────────────
  describe('Case 5: registerRP rejects invalid redirect_uris', () => {
    it('rejects empty redirect_uris', async () => {
      await expect(
        oidcClientService.registerRP({
          name: 'X',
          redirect_uris: [],
          allowed_scopes: ['openid'],
        }),
      ).rejects.toThrow(/redirect_uris/);
    });

    it('rejects non-URL string', async () => {
      await expect(
        oidcClientService.registerRP({
          name: 'X',
          redirect_uris: ['not-a-url'],
          allowed_scopes: ['openid'],
        }),
      ).rejects.toThrow(/not a valid URL/);
    });

    it('rejects custom protocol (e.g. file://)', async () => {
      await expect(
        oidcClientService.registerRP({
          name: 'X',
          redirect_uris: ['file:///etc/passwd'],
          allowed_scopes: ['openid'],
        }),
      ).rejects.toThrow(/http\(s\)/);
    });
  });

  // ──────────── Case 6: 拒绝 allowed_scopes 不含 openid ────────────
  describe('Case 6: registerRP requires openid in allowed_scopes', () => {
    it('rejects scopes without openid', async () => {
      await expect(
        oidcClientService.registerRP({
          name: 'X',
          redirect_uris: ['http://localhost:3000/cb'],
          allowed_scopes: ['profile', 'email'],
        }),
      ).rejects.toThrow(/openid/);
    });

    it('accepts openid + admin (Sprint 2.9 extension)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            client_id: 'rp_admin',
            client_secret_hash: 'h',
            name: 'Admin',
            redirect_uris: ['https://nvwax.proclaw.cc/admin/callback'],
            allowed_scopes: ['openid', 'profile', 'email', 'admin'],
            allowed_grant_types: ['authorization_code'],
            require_pkce: true,
            token_endpoint_auth_method: 'client_secret_post',
            is_active: true,
            created_at: new Date(),
          },
        ],
      });

      await expect(
        oidcClientService.registerRP({
          name: 'Admin',
          redirect_uris: ['https://nvwax.proclaw.cc/admin/callback'],
          allowed_scopes: ['openid', 'profile', 'email', 'admin'],
        }),
      ).resolves.toBeTruthy();
    });
  });

  // ──────────── Case 7: 拒绝非白名单 scope ────────────
  describe('Case 7: registerRP rejects unknown scopes', () => {
    it('rejects a custom scope', async () => {
      await expect(
        oidcClientService.registerRP({
          name: 'X',
          redirect_uris: ['http://localhost:3000/cb'],
          allowed_scopes: ['openid', 'weird_scope'],
        }),
      ).rejects.toThrow(/weird_scope/);
    });
  });

  // ──────────── Case 8: 拒绝 http://非localhost 的 redirect_uri ────────────
  describe('Case 8: registerRP rejects http redirect_uri to non-loopback host', () => {
    it('rejects http://example.com/cb', async () => {
      await expect(
        oidcClientService.registerRP({
          name: 'X',
          redirect_uris: ['http://example.com/cb'],
          allowed_scopes: ['openid'],
        }),
      ).rejects.toThrow(/localhost|127\.0\.0\.1/);
    });

    it('accepts http://127.0.0.1:port/cb', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            client_id: 'rp_loop',
            client_secret_hash: 'h',
            name: 'Loopback',
            redirect_uris: ['http://127.0.0.1:7842/callback'],
            allowed_scopes: ['openid'],
            allowed_grant_types: ['authorization_code'],
            require_pkce: true,
            token_endpoint_auth_method: 'none',
            is_active: true,
            created_at: new Date(),
          },
        ],
      });

      await expect(
        oidcClientService.registerRP({
          name: 'Loopback',
          redirect_uris: ['http://127.0.0.1:7842/callback'],
          allowed_scopes: ['openid'],
        }),
      ).resolves.toBeTruthy();
    });

    it('accepts https://public-domain/cb', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            client_id: 'rp_https',
            client_secret_hash: 'h',
            name: 'Https',
            redirect_uris: ['https://app.proclaw.cc/auth/callback'],
            allowed_scopes: ['openid'],
            allowed_grant_types: ['authorization_code'],
            require_pkce: true,
            token_endpoint_auth_method: 'client_secret_post',
            is_active: true,
            created_at: new Date(),
          },
        ],
      });

      await expect(
        oidcClientService.registerRP({
          name: 'Https',
          redirect_uris: ['https://app.proclaw.cc/auth/callback'],
          allowed_scopes: ['openid'],
        }),
      ).resolves.toBeTruthy();
    });
  });

  // ──────────── Case 9: listRPs 默认过滤 is_active=false ────────────
  describe('Case 9: listRPs filters is_active=false by default', () => {
    it('adds is_active=true filter when includeRevoked is false', async () => {
      // total 查询
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      // 数据查询
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            client_id: 'rp_a',
            name: 'A',
            redirect_uris: ['http://localhost:3000/cb'],
            allowed_scopes: ['openid'],
            allowed_grant_types: ['authorization_code'],
            require_pkce: true,
            token_endpoint_auth_method: 'client_secret_post',
            is_active: true,
            created_at: new Date(),
          },
        ],
      });

      const result = await oidcClientService.listRPs({ page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].client_id).toBe('rp_a');

      // 验证 SQL 有 is_active 过滤
      const totalSql = mockPool.query.mock.calls[0][0];
      expect(totalSql).toMatch(/is_active = \$1/);
      const totalParams = mockPool.query.mock.calls[0][1];
      expect(totalParams).toEqual([true]);
    });

    it('omits is_active filter when includeRevoked=true', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 2 }] });
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            client_id: 'rp_a',
            name: 'A',
            redirect_uris: [],
            allowed_scopes: ['openid'],
            allowed_grant_types: [],
            require_pkce: true,
            token_endpoint_auth_method: 'none',
            is_active: true,
            created_at: new Date(),
          },
          {
            client_id: 'rp_b',
            name: 'B',
            redirect_uris: [],
            allowed_scopes: ['openid'],
            allowed_grant_types: [],
            require_pkce: true,
            token_endpoint_auth_method: 'none',
            is_active: false,
            created_at: new Date(),
          },
        ],
      });

      const result = await oidcClientService.listRPs({ page: 1, limit: 10, includeRevoked: true });
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);

      const totalSql = mockPool.query.mock.calls[0][0];
      expect(totalSql).not.toMatch(/is_active/);
    });
  });

  // ──────────── Case 10: listRPs search ────────────
  describe('Case 10: listRPs search matches name/client_id', () => {
    it('adds ILIKE filter for search term', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 1 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await oidcClientService.listRPs({ page: 1, limit: 10, search: 'proclaw' });

      const totalSql = mockPool.query.mock.calls[0][0];
      const totalParams = mockPool.query.mock.calls[0][1];
      expect(totalSql).toMatch(/name ILIKE \$2 OR client_id ILIKE \$2/);
      expect(totalParams).toEqual([true, '%proclaw%']);
    });

    it('omits search filter when empty', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await oidcClientService.listRPs({ page: 1, limit: 10 });

      const totalSql = mockPool.query.mock.calls[0][0];
      expect(totalSql).not.toMatch(/ILIKE/);
    });
  });

  // ──────────── Case 11: listRPs 默认分页 ────────────
  describe('Case 11: listRPs default pagination', () => {
    it('uses page=1, limit=20 by default', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await oidcClientService.listRPs({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('clamps limit to max 100', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ total: 0 }] });
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await oidcClientService.listRPs({ limit: 999 });
      expect(result.limit).toBe(100);
    });
  });

  // ──────────── Case 12: revokeRP ────────────
  describe('Case 12: revokeRP soft-deletes', () => {
    it('returns true on first revoke', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      const ok = await oidcClientService.revokeRP('rp_x');
      expect(ok).toBe(true);

      const sql = mockPool.query.mock.calls[0][0];
      expect(sql).toMatch(/SET is_active = FALSE/);
      expect(sql).toMatch(/AND is_active = TRUE/);
    });

    it('returns false when already revoked (rowCount=0)', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });
      const ok = await oidcClientService.revokeRP('rp_y');
      expect(ok).toBe(false);
    });
  });

  // ──────────── Case 13: rotateSecret 返回新明文 + hash 已变 ────────────
  describe('Case 13: rotateSecret returns new plaintext and updates hash', () => {
    it('issues new secret, hash is different from old, returns plaintext', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ client_id: 'rp_z', updated_at: new Date('2026-06-17T01:00:00Z') }],
      });

      const result = await oidcClientService.rotateSecret('rp_z');

      expect(result.client_id).toBe('rp_z');
      expect(result.client_secret).toBeTruthy();
      expect(result.client_secret.length).toBeGreaterThanOrEqual(32);
      expect(result.rotated_at).toEqual(new Date('2026-06-17T01:00:00Z'));

      // 验证 SQL 把新 hash 写入（SQL 多行，用 [\s\S] 替代 . 以匹配换行）
      const sql = mockPool.query.mock.calls[0][0];
      const sqlParams = mockPool.query.mock.calls[0][1];
      expect(sql).toMatch(/UPDATE oidc_clients[\s\S]*SET client_secret_hash/);
      expect(sqlParams[0]).toMatch(/^\$2[aby]\$10\$/);
      // bcrypt 反向校验：传入新明文应该 match 新 hash
      const ok = await bcrypt.compare(result.client_secret, sqlParams[0]);
      expect(ok).toBe(true);
    });
  });

  // ──────────── Case 14: rotateSecret 对不存在 client 抛错 ────────────
  describe('Case 14: rotateSecret throws when client not found', () => {
    it('throws Error when no rows updated', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(oidcClientService.rotateSecret('rp_nonexistent')).rejects.toThrow(
        /RP not found/,
      );
    });
  });

  // ──────────── Case 15: getRP 返回包含 client_secret_hash ────────────
  describe('Case 15: getRP returns full record incl. secret hash', () => {
    it('returns record with client_secret_hash', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            client_id: 'rp_w',
            client_secret_hash: '$2a$10$abcdef',
            name: 'W',
            redirect_uris: ['http://localhost:3000/cb'],
            allowed_scopes: ['openid'],
            allowed_grant_types: ['authorization_code'],
            require_pkce: true,
            token_endpoint_auth_method: 'client_secret_post',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const rp = await oidcClientService.getRP('rp_w');
      expect(rp).not.toBeNull();
      expect(rp!.client_secret_hash).toBe('$2a$10$abcdef');
      expect(rp!.client_id).toBe('rp_w');
    });

    it('returns null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      const rp = await oidcClientService.getRP('rp_missing');
      expect(rp).toBeNull();
    });
  });
});