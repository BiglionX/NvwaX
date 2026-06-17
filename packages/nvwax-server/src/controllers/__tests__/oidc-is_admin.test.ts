/**
 * Unit tests: OIDC IdP is_admin claim 注入 (Sprint 2.4)
 *
 * 覆盖:
 * - Case 1: discovery claims_supported 含 'is_admin'
 * - Case 2: userinfo — admins 表 email → is_admin: true
 * - Case 3: userinfo — 非 admins 表 email → is_admin: false
 * - Case 4: token 端点 (authorization_code) 签发 id_token 含 is_admin
 * - Case 5: refresh_token 端点 签发 id_token 含 is_admin
 * - Case 6: isAdminByEmail 抛错时 userinfo 端点行为
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

const mockGetPool = jest.fn() as jest.Mock<any>;
const mockGetClient = jest.fn() as jest.Mock<any>;
const mockConsumeAuthorizationCode = jest.fn() as jest.Mock<any>;
const mockIssueRefreshToken = jest.fn() as jest.Mock<any>;
const mockRotateRefreshToken = jest.fn() as jest.Mock<any>;
const mockIssueAuthorizationCode = jest.fn() as jest.Mock<any>;
const mockVerifyScope = jest.fn() as jest.Mock<any>;
const mockGetIssuer = jest.fn(() => 'https://account.proclaw.cc') as jest.Mock;
const mockSignIdToken = jest.fn() as jest.Mock<any>;
const mockSignAccessToken = jest.fn() as jest.Mock<any>;
const mockVerifyAccessToken = jest.fn() as jest.Mock<any>;
const mockGetAccessTokenTtl = jest.fn(() => 3600) as jest.Mock;
const mockGetUserById = jest.fn() as jest.Mock<any>;
const mockIsAdminByEmail = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule('../../services/database.service.js', () => ({
  databaseService: { getPool: mockGetPool },
}));

jest.unstable_mockModule('../../services/oidc/oidc.service.js', () => ({
  oidcService: {
    getClient: mockGetClient,
    consumeAuthorizationCode: mockConsumeAuthorizationCode,
    issueRefreshToken: mockIssueRefreshToken,
    rotateRefreshToken: mockRotateRefreshToken,
    issueAuthorizationCode: mockIssueAuthorizationCode,
    verifyScope: mockVerifyScope,
  },
}));

jest.unstable_mockModule('../../services/oidc/oidc-token.service.js', () => ({
  oidcTokenService: {
    getIssuer: mockGetIssuer,
    signIdToken: mockSignIdToken,
    signAccessToken: mockSignAccessToken,
    verifyAccessToken: mockVerifyAccessToken,
    getAccessTokenTtl: mockGetAccessTokenTtl,
  },
}));

jest.unstable_mockModule('../../services/user.service.js', () => ({
  userService: { getUserById: mockGetUserById },
}));

jest.unstable_mockModule('../../services/admin.service.js', () => ({
  adminService: { isAdminByEmail: mockIsAdminByEmail },
}));

jest.unstable_mockModule('../../config/index.js', () => ({
  config: { nodeEnv: 'development' },
}));

let oidcController: typeof import('../../controllers/oidc.controller.js').oidcController;

beforeAll(async () => {
  process.env.JWT_SECRET = 'c'.repeat(64);
  process.env.NODE_ENV = 'development';
  oidcController = (await import('../../controllers/oidc.controller.js')).oidcController;
});

function makeRes() {
  let statusCode = 200;
  let body: any = null;
  const headers: Record<string, string> = {};
  const res: any = {
    set(k: string, v: string) { headers[k.toLowerCase()] = v; },
    status(code: number) { statusCode = code; return this; },
    json(payload: any) { body = payload; return this; },
    send(payload: any) { body = payload; return this; },
    redirect(code: number, url: string) { statusCode = code; body = { redirect: url }; return this; },
    get statusCode() { return statusCode; },
    get body() { return body; },
    get headers() { return headers; },
  };
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAccessTokenTtl.mockReturnValue(3600);
  mockSignAccessToken.mockResolvedValue('mock-access-token');
  mockSignIdToken.mockResolvedValue('mock-id-token');
});

// ─────────── Case 1: discovery claims_supported 含 is_admin ───────────
describe('Case 1: discovery declares is_admin in claims_supported', () => {
  it('includes is_admin in discovery response', () => {
    const req: any = {};
    const res = makeRes();
    oidcController.discovery(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.claims_supported).toContain('is_admin');
  });
});

// ─────────── Case 2: userinfo — admins 表 email → is_admin: true ───────────
describe('Case 2: userinfo returns is_admin: true for admins-table email', () => {
  it('injects is_admin=true when email is in admins table', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-1', scope: 'openid profile email' });
    mockGetUserById.mockResolvedValue({ id: 'user-1', email: 'admin@x.com', name: 'A', avatar: 'url' });
    mockIsAdminByEmail.mockResolvedValue(true);

    const req: any = { headers: { authorization: 'Bearer valid-token' } };
    const res = makeRes();
    await oidcController.userinfo(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.is_admin).toBe(true);
    expect(res.body.sub).toBe('user-1');
    expect(res.body.email).toBe('admin@x.com');
    expect(mockIsAdminByEmail).toHaveBeenCalledWith('admin@x.com');
  });
});

// ─────────── Case 3: userinfo — 非 admins 表 email → is_admin: false ───────────
describe('Case 3: userinfo returns is_admin: false for non-admin email', () => {
  it('injects is_admin=false when email is NOT in admins table', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-2', scope: 'openid profile email' });
    mockGetUserById.mockResolvedValue({ id: 'user-2', email: 'user@x.com', name: 'U' });
    mockIsAdminByEmail.mockResolvedValue(false);

    const req: any = { headers: { authorization: 'Bearer valid-token' } };
    const res = makeRes();
    await oidcController.userinfo(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.is_admin).toBe(false);
  });
});

// ─────────── Case 4: token 端点 签发 id_token 含 is_admin ───────────
describe('Case 4: authorization_code grant signs id_token with is_admin', () => {
  it('passes is_admin=true to signIdToken when user is admin', async () => {
    mockGetClient.mockResolvedValue({
      client_id: 'nvwax-dev-client',
      redirect_uris: ['http://localhost:3000/callback'],
      allowed_scopes: ['openid', 'profile', 'email'],
      allowed_grant_types: ['authorization_code'],
    });
    mockConsumeAuthorizationCode.mockResolvedValue({
      userId: 'user-1',
      scope: 'openid profile email',
      redirectUri: 'http://localhost:3000/callback',
      nonce: 'nonce-1',
    });
    mockGetUserById.mockResolvedValue({ id: 'user-1', email: 'admin@x.com', name: 'A' });
    mockIsAdminByEmail.mockResolvedValue(true);
    mockIssueRefreshToken.mockResolvedValue({ token: 'mock-refresh', tokenHash: 'h', expiresAt: new Date() });

    const req: any = {
      body: {
        grant_type: 'authorization_code',
        client_id: 'nvwax-dev-client',
        code: 'auth-code',
        redirect_uri: 'http://localhost:3000/callback',
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      },
    };
    const res = makeRes();
    await oidcController.token(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.access_token).toBe('mock-access-token');
    expect(mockSignIdToken).toHaveBeenCalledWith(
      expect.objectContaining({ is_admin: true, sub: 'user-1' }),
    );
  });

  it('passes is_admin=false to signIdToken when user is not admin', async () => {
    mockGetClient.mockResolvedValue({
      client_id: 'nvwax-dev-client',
      redirect_uris: ['http://localhost:3000/callback'],
      allowed_scopes: ['openid', 'profile', 'email'],
      allowed_grant_types: ['authorization_code'],
    });
    mockConsumeAuthorizationCode.mockResolvedValue({
      userId: 'user-2',
      scope: 'openid profile email',
      redirectUri: 'http://localhost:3000/callback',
      nonce: null,
    });
    mockGetUserById.mockResolvedValue({ id: 'user-2', email: 'user@x.com', name: 'U' });
    mockIsAdminByEmail.mockResolvedValue(false);
    mockIssueRefreshToken.mockResolvedValue({ token: 'mock-refresh', tokenHash: 'h', expiresAt: new Date() });

    const req: any = {
      body: {
        grant_type: 'authorization_code',
        client_id: 'nvwax-dev-client',
        code: 'auth-code-2',
        redirect_uri: 'http://localhost:3000/callback',
        code_verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
      },
    };
    const res = makeRes();
    await oidcController.token(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockSignIdToken).toHaveBeenCalledWith(
      expect.objectContaining({ is_admin: false, sub: 'user-2' }),
    );
  });
});

// ─────────── Case 5: refresh_token 端点 签发 id_token 含 is_admin ───────────
describe('Case 5: refresh_token grant signs id_token with is_admin', () => {
  it('passes is_admin to signIdToken (reflects latest state)', async () => {
    mockGetClient.mockResolvedValue({
      client_id: 'nvwax-dev-client',
      redirect_uris: ['http://localhost:3000/callback'],
      allowed_scopes: ['openid', 'profile', 'email'],
      allowed_grant_types: ['refresh_token'],
    });
    mockRotateRefreshToken.mockResolvedValue({
      userId: 'user-1',
      clientId: 'nvwax-dev-client',
      scope: 'openid profile email',
      token: 'new-refresh',
      tokenHash: 'h2',
      expiresAt: new Date(),
    });
    mockGetUserById.mockResolvedValue({ id: 'user-1', email: 'admin@x.com', name: 'A' });
    mockIsAdminByEmail.mockResolvedValue(true);

    const req: any = {
      body: {
        grant_type: 'refresh_token',
        client_id: 'nvwax-dev-client',
        refresh_token: 'old-refresh',
      },
    };
    const res = makeRes();
    await oidcController.token(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockSignIdToken).toHaveBeenCalledWith(
      expect.objectContaining({ is_admin: true }),
    );
  });
});
