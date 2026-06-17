/**
 * Unit tests: auth.middleware (Sprint 2.4 B1)
 *
 * 双鉴权策略：
 * 1) OIDC access_token (jose RS256) + admins 表 email 命中 → 通过
 * 2) admin_token (jsonwebtoken HS256) → fallback 兼容
 *
 * 覆盖：
 * - Case 1: OIDC token 有效 + admins 表命中 → 接受
 * - Case 2: OIDC token 有效但 is_admin=false → 401 INVALID_TOKEN (fallback 也失败)
 * - Case 3: OIDC token 抛错 + admin_token 也失败 → 401 INVALID_TOKEN
 * - Case 4: admin_token 有效 (HS256) → 接受
 * - Case 5: admin_token verifyToken 返回 null → 401 INVALID_TOKEN
 * - Case 6: 无 Authorization header → 401 MISSING_AUTH
 * - Case 7: Bearer 前缀剥离
 * - Case 8: admin_token 中 adminId 找不到 → 401 ADMIN_NOT_FOUND
 * - Case 9: OIDC sub 找不到 user → 落 fallback (admin_token 通过)
 * - Case 10: isAdminByEmail 抛错 → fail-secure (落 fallback)
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

const mockVerifyAccessToken = jest.fn() as jest.Mock<any>;
const mockGetUserById = jest.fn() as jest.Mock<any>;
const mockIsAdminByEmail = jest.fn() as jest.Mock<any>;
const mockVerifyToken = jest.fn() as jest.Mock<any>;
const mockGetAdminById = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule('../../services/oidc/oidc-token.service.js', () => ({
  oidcTokenService: { verifyAccessToken: mockVerifyAccessToken },
}));

jest.unstable_mockModule('../../services/user.service.js', () => ({
  userService: { getUserById: mockGetUserById },
}));

jest.unstable_mockModule('../../services/admin.service.js', () => ({
  adminService: {
    isAdminByEmail: mockIsAdminByEmail,
    verifyToken: mockVerifyToken,
    getAdminById: mockGetAdminById,
  },
}));

let authMiddleware: typeof import('../auth.middleware.js').authMiddleware;

beforeAll(async () => {
  authMiddleware = (await import('../auth.middleware.js')).authMiddleware;
});

function makeReq(authHeaderValue?: string) {
  const headers: Record<string, string> = {};
  if (authHeaderValue !== undefined) headers.authorization = authHeaderValue;
  return { headers } as any;
}

function makeRes() {
  let statusCode = 200;
  let body: any = null;
  const res: any = {
    status(code: number) { statusCode = code; return this; },
    json(payload: any) { body = payload; return this; },
    get statusCode() { return statusCode; },
    get body() { return body; },
  };
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────── Case 1: OIDC token 有效 + admins 表命中 → 接受 ───────────
describe('Case 1: OIDC access_token + admins table → accept', () => {
  it('attaches req.admin and calls next() when user is admin', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-oidc-1', scope: 'openid' });
    mockGetUserById.mockResolvedValue({ id: 'user-oidc-1', email: 'admin@x.com', name: 'A' });
    mockIsAdminByEmail.mockResolvedValue(true);

    const req = makeReq('Bearer valid-oidc-token');
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(req.admin).toEqual({
      id: 'user-oidc-1',
      email: 'admin@x.com',
      username: 'admin@x.com',
      role: 'admin',
    });
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });
});

// ─────────── Case 2: OIDC token 有效但 is_admin=false → 401 ───────────
describe('Case 2: OIDC valid but is_admin=false → 401 INVALID_TOKEN (fallback also fails)', () => {
  it('rejects with 401 when user is not in admins table and admin_token also invalid', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-normal', scope: 'openid' });
    mockGetUserById.mockResolvedValue({ id: 'user-normal', email: 'u@x.com' });
    mockIsAdminByEmail.mockResolvedValue(false);
    mockVerifyToken.mockReturnValue(null); // fallback also fails

    const req = makeReq('Bearer valid-oidc-but-not-admin');
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

// ─────────── Case 3: OIDC token 抛错 + admin_token 也失败 → 401 ───────────
describe('Case 3: OIDC verify throws + admin_token also fails → 401', () => {
  it('rejects when both OIDC and admin_token fail', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('JWSSignatureVerification failed'));
    mockVerifyToken.mockReturnValue(null);

    const req = makeReq('Bearer bad-token');
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

// ─────────── Case 4: admin_token 有效 (HS256) → 接受 ───────────
describe('Case 4: admin_token (HS256) fallback → accept', () => {
  it('accepts valid admin_token and attaches req.admin from DB', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('OIDC not a RS256 token'));
    mockVerifyToken.mockReturnValue({ adminId: 'a-1', username: 'oldadmin', role: 'admin' });
    mockGetAdminById.mockResolvedValue({ id: 'a-1', email: 'oldadmin@x.com', username: 'oldadmin' });

    const req = makeReq('Bearer valid-admin-token-hs256');
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.admin).toEqual({
      id: 'a-1',
      email: 'oldadmin@x.com',
      username: 'oldadmin',
      role: 'admin',
    });
  });
});

// ─────────── Case 5: admin_token verifyToken 返回 null → 401 ───────────
describe('Case 5: admin_token invalid signature → 401 INVALID_TOKEN', () => {
  it('rejects when admin_token verifyToken returns null', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('not OIDC'));
    mockVerifyToken.mockReturnValue(null);

    const req = makeReq('Bearer garbage-admin-token');
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
    expect(mockGetAdminById).not.toHaveBeenCalled();
  });
});

// ─────────── Case 6: 无 Authorization header → 401 MISSING_AUTH ───────────
describe('Case 6: no Authorization header → 401 MISSING_AUTH', () => {
  it('rejects with MISSING_AUTH code', async () => {
    const req = makeReq(); // no auth header
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('MISSING_AUTH');
    expect(mockVerifyAccessToken).not.toHaveBeenCalled();
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });
});

// ─────────── Case 7: Bearer 前缀剥离 ───────────
describe('Case 7: Bearer prefix is stripped before verification', () => {
  it('accepts "Bearer xxx" and strips Bearer to pass raw token', async () => {
    mockVerifyAccessToken.mockImplementation(async (t: string) => {
      // 验证拿到的 token 是剥离了 Bearer 的原始串
      expect(t).toBe('raw-token-xyz');
      return { sub: 'u-bearer', scope: 'openid' };
    });
    mockGetUserById.mockResolvedValue({ id: 'u-bearer', email: 'b@x.com' });
    mockIsAdminByEmail.mockResolvedValue(true);

    const req = makeReq('Bearer raw-token-xyz');
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

// ─────────── Case 8: admin_token 中 adminId 找不到 → 401 ADMIN_NOT_FOUND ───────────
describe('Case 8: admin_token adminId not in DB → 401 ADMIN_NOT_FOUND', () => {
  it('rejects with ADMIN_NOT_FOUND when DB lookup fails', async () => {
    mockVerifyAccessToken.mockRejectedValue(new Error('not OIDC'));
    mockVerifyToken.mockReturnValue({ adminId: 'a-deleted', username: 'deleted', role: 'admin' });
    mockGetAdminById.mockResolvedValue(null);

    const req = makeReq('Bearer admin-token-deleted');
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('ADMIN_NOT_FOUND');
    expect(next).not.toHaveBeenCalled();
  });
});

// ─────────── Case 9: OIDC sub 找不到 user → 落 fallback ───────────
describe('Case 9: OIDC sub → user not found → fallback to admin_token', () => {
  it('falls back to admin_token when OIDC sub has no matching user', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-orphan', scope: 'openid' });
    mockGetUserById.mockResolvedValue(null); // user deleted
    mockVerifyToken.mockReturnValue({ adminId: 'a-2', username: 'fb-admin', role: 'admin' });
    mockGetAdminById.mockResolvedValue({ id: 'a-2', email: 'fb@x.com', username: 'fb-admin' });

    const req = makeReq('Bearer dual-purpose-token');
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.admin?.id).toBe('a-2');
    expect(mockVerifyToken).toHaveBeenCalledWith('dual-purpose-token');
  });
});

// ─────────── Case 10: isAdminByEmail 抛错 → fail-secure ───────────
describe('Case 10: isAdminByEmail throws DB error → fail-secure (fallback only)', () => {
  it('does not throw, falls back to admin_token path', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-db-err', scope: 'openid' });
    mockGetUserById.mockResolvedValue({ id: 'user-db-err', email: 'x@x.com' });
    mockIsAdminByEmail.mockRejectedValue(new Error('DB connection lost'));
    mockVerifyToken.mockReturnValue(null); // fallback also fails

    const req = makeReq('Bearer db-err-token');
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    // fail-secure: 走 fallback, fallback 也失败 → 401
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('falls through to admin_token if available when DB error', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-db-err-2', scope: 'openid' });
    mockGetUserById.mockResolvedValue({ id: 'user-db-err-2', email: 'y@x.com' });
    mockIsAdminByEmail.mockRejectedValue(new Error('DB timeout'));
    mockVerifyToken.mockReturnValue({ adminId: 'a-3', username: 'fb-admin-3', role: 'admin' });
    mockGetAdminById.mockResolvedValue({ id: 'a-3', email: 'fb3@x.com', username: 'fb-admin-3' });

    const req = makeReq('Bearer db-err-but-admin-token-also');
    const res = makeRes();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.admin?.id).toBe('a-3');
  });
});
