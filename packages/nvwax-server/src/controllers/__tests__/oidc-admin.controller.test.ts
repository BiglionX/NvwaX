/**
 * OIDC RP Admin Controller 单元测试（Sprint 2.9）
 *
 * 用例覆盖（4 端点 × 2 path = 8 cases）：
 *  1. POST /: 调 registerRP,返回 201 + 明文 secret + warning
 *  2. POST /: 校验失败返回 400
 *  3. POST /: service 抛非验证错误返回 500
 *  4. GET /: 调 listRPs,query 透传（page/limit/search/includeRevoked）
 *  5. GET /: 默认 page=1、limit=20
 *  6. DELETE /:id: 撤销成功 200 + 审计
 *  7. DELETE /:id: 不存在 404；已撤销 409
 *  8. POST /:id/rotate-secret: 轮换成功 200 + 明文 secret
 *  9. POST /:id/rotate-secret: 不存在 404
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// Mocks（显式 jest.Mock<any> 注解避免 TS strict 把参数推断为 never）
const mockRegisterRP = jest.fn() as jest.Mock<any>;
const mockListRPs = jest.fn() as jest.Mock<any>;
const mockRevokeRP = jest.fn() as jest.Mock<any>;
const mockRotateSecret = jest.fn() as jest.Mock<any>;
const mockGetRP = jest.fn() as jest.Mock<any>;
const mockLogAction = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule('../../services/oidc/oidc-client.service.js', () => ({
  oidcClientService: {
    registerRP: mockRegisterRP,
    listRPs: mockListRPs,
    revokeRP: mockRevokeRP,
    rotateSecret: mockRotateSecret,
    getRP: mockGetRP,
  },
  RPValidationError: class RPValidationError extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'RPValidationError';
    }
  },
}));

jest.unstable_mockModule('../../services/admin.service.js', () => ({
  adminService: { logAction: mockLogAction },
}));

let oidcAdminController: typeof import('../../controllers/oidc-admin.controller.js').oidcAdminController;

beforeAll(async () => {
  oidcAdminController = (await import('../../controllers/oidc-admin.controller.js')).oidcAdminController;
});

function makeRes() {
  let statusCode = 200;
  let body: any = null;
  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      body = payload;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
  return res;
}

function makeReq(opts: { admin?: any; body?: any; params?: any; query?: any; ip?: string } = {}) {
  return {
    admin: opts.admin ?? { id: 'admin-1', email: 'admin@x.com' },
    body: opts.body ?? {},
    params: opts.params ?? {},
    query: opts.query ?? {},
    ip: opts.ip ?? '127.0.0.1',
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ──────────── Case 1: POST / 注册成功 ────────────
describe('Case 1: POST / registers a new RP and returns plaintext secret', () => {
  it('returns 201 + RP data + warning + audit log', async () => {
    const registered = {
      client_id: 'rp_test_xxx',
      client_secret: 'plain_secret_abc',
      name: 'ProClaw Web',
      redirect_uris: ['https://app.proclaw.cc/auth/callback'],
      allowed_scopes: ['openid', 'profile', 'email'],
      allowed_grant_types: ['authorization_code', 'refresh_token'],
      require_pkce: true,
      token_endpoint_auth_method: 'client_secret_post',
      is_active: true,
      created_at: new Date('2026-06-17T00:00:00Z'),
    };
    mockRegisterRP.mockResolvedValueOnce(registered);

    const req = makeReq({
      body: {
        name: 'ProClaw Web',
        redirect_uris: ['https://app.proclaw.cc/auth/callback'],
        allowed_scopes: ['openid', 'profile', 'email'],
      },
    });
    const res = makeRes();

    await oidcAdminController.register(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.client_id).toBe('rp_test_xxx');
    expect(res.body.data.client_secret).toBe('plain_secret_abc'); // ⚠ 明文一次性
    expect(res.body.warning).toMatch(/client_secret/);
    expect(mockRegisterRP).toHaveBeenCalledWith({
      name: 'ProClaw Web',
      redirect_uris: ['https://app.proclaw.cc/auth/callback'],
      allowed_scopes: ['openid', 'profile', 'email'],
      allowed_grant_types: undefined,
      require_pkce: undefined,
      token_endpoint_auth_method: undefined,
    });
    expect(mockLogAction).toHaveBeenCalledWith(
      'info',
      'REGISTER_RP',
      'admin-1',
      expect.stringContaining('ProClaw Web'),
      '127.0.0.1',
    );
  });
});

// ──────────── Case 2: POST / 校验失败 ────────────
describe('Case 2: POST / returns 400 on validation error', () => {
  it('returns 400 when service throws RPValidationError', async () => {
    const { RPValidationError } = await import('../../services/oidc/oidc-client.service.js');
    mockRegisterRP.mockRejectedValueOnce(new (RPValidationError as any)('INVALID_SCOPES', "allowed_scopes must include 'openid'"));

    const req = makeReq({ body: { name: 'X', redirect_uris: ['http://localhost:3000/cb'], allowed_scopes: ['profile'] } });
    const res = makeRes();

    await oidcAdminController.register(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_SCOPES');
    expect(res.body.error.message).toMatch(/openid/);
  });
});

// ──────────── Case 3: POST / service 内部错误 ────────────
describe('Case 3: POST / returns 500 on unexpected service error', () => {
  it('returns 500 + INTERNAL_ERROR when service throws generic Error', async () => {
    mockRegisterRP.mockRejectedValueOnce(new Error('database connection lost'));

    const req = makeReq({ body: { name: 'X', redirect_uris: ['http://localhost:3000/cb'], allowed_scopes: ['openid'] } });
    const res = makeRes();

    await oidcAdminController.register(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(mockLogAction).not.toHaveBeenCalled();
  });
});

// ──────────── Case 4: GET / 列表（query 透传）────────────
describe('Case 4: GET / forwards query params to service.listRPs', () => {
  it('parses page/limit/search/includeRevoked from query', async () => {
    mockListRPs.mockResolvedValueOnce({
      data: [
        {
          client_id: 'rp_a',
          name: 'A',
          redirect_uris: [],
          allowed_scopes: ['openid'],
          allowed_grant_types: [],
          require_pkce: true,
          token_endpoint_auth_method: 'client_secret_post',
          is_active: true,
          created_at: new Date(),
        },
      ],
      total: 1,
      page: 2,
      limit: 5,
    });

    const req = makeReq({
      query: { page: '2', limit: '5', search: 'proclaw', includeRevoked: 'true' },
    });
    const res = makeRes();

    await oidcAdminController.list(req, res);

    expect(mockListRPs).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: 'proclaw',
      includeRevoked: true,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(5);
    expect(res.body.data).toHaveLength(1);
    // 不应返回 client_secret_hash
    expect(res.body.data[0]).not.toHaveProperty('client_secret_hash');
  });
});

// ──────────── Case 5: GET / 默认分页 ────────────
describe('Case 5: GET / uses default page=1, limit=20', () => {
  it('falls back to defaults when query params missing', async () => {
    mockListRPs.mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 20 });

    const req = makeReq({ query: {} });
    const res = makeRes();

    await oidcAdminController.list(req, res);

    expect(mockListRPs).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: undefined,
      includeRevoked: false,
    });
  });
});

// ──────────── Case 6: DELETE /:id 撤销成功 ────────────
describe('Case 6: DELETE /:id revokes an existing active RP', () => {
  it('returns 200 + audit log', async () => {
    mockGetRP.mockResolvedValueOnce({
      client_id: 'rp_x',
      name: 'X',
      is_active: true,
    });
    mockRevokeRP.mockResolvedValueOnce(true);

    const req = makeReq({ params: { id: 'rp_x' } });
    const res = makeRes();

    await oidcAdminController.revoke(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.client_id).toBe('rp_x');
    expect(res.body.data.is_active).toBe(false);
    expect(mockRevokeRP).toHaveBeenCalledWith('rp_x');
    expect(mockLogAction).toHaveBeenCalledWith(
      'warning',
      'REVOKE_RP',
      'admin-1',
      expect.stringContaining('X'),
      '127.0.0.1',
    );
  });
});

// ──────────── Case 7: DELETE /:id 不存在 / 已撤销 ────────────
describe('Case 7: DELETE /:id handles not-found / already-revoked', () => {
  it('returns 404 when RP does not exist', async () => {
    mockGetRP.mockResolvedValueOnce(null);

    const req = makeReq({ params: { id: 'rp_nope' } });
    const res = makeRes();

    await oidcAdminController.revoke(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(mockRevokeRP).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
  });

  it('returns 409 when RP is already revoked', async () => {
    mockGetRP.mockResolvedValueOnce({
      client_id: 'rp_x',
      name: 'X',
      is_active: false,
    });

    const req = makeReq({ params: { id: 'rp_x' } });
    const res = makeRes();

    await oidcAdminController.revoke(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_REVOKED');
    expect(mockRevokeRP).not.toHaveBeenCalled();
  });
});

// ──────────── Case 8: POST /:id/rotate-secret 成功 ────────────
describe('Case 8: POST /:id/rotate-secret returns new plaintext secret', () => {
  it('returns 200 + new secret + audit log', async () => {
    mockGetRP.mockResolvedValueOnce({
      client_id: 'rp_y',
      name: 'Y',
      is_active: true,
    });
    mockRotateSecret.mockResolvedValueOnce({
      client_id: 'rp_y',
      client_secret: 'new_plain_secret_xyz',
      rotated_at: new Date('2026-06-17T02:00:00Z'),
    });

    const req = makeReq({ params: { id: 'rp_y' } });
    const res = makeRes();

    await oidcAdminController.rotateSecret(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.client_id).toBe('rp_y');
    expect(res.body.data.client_secret).toBe('new_plain_secret_xyz'); // ⚠ 明文一次性
    expect(res.body.warning).toMatch(/新 client_secret/);
    expect(mockRotateSecret).toHaveBeenCalledWith('rp_y');
    expect(mockLogAction).toHaveBeenCalledWith(
      'info',
      'ROTATE_RP_SECRET',
      'admin-1',
      expect.stringContaining('Y'),
      '127.0.0.1',
    );
  });
});

// ──────────── Case 9: POST /:id/rotate-secret 不存在 ────────────
describe('Case 9: POST /:id/rotate-secret handles not-found', () => {
  it('returns 404 when RP does not exist', async () => {
    mockGetRP.mockResolvedValueOnce(null);

    const req = makeReq({ params: { id: 'rp_missing' } });
    const res = makeRes();

    await oidcAdminController.rotateSecret(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(mockRotateSecret).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
  });
});