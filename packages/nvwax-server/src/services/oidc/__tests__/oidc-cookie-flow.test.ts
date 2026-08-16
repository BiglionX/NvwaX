/**
 * Unit tests: OIDC authorizeGet cookie fast-path (Sprint 2 / DoD C9 / Task 2.10).
 *
 * Verifies that when a valid `pc_session` cookie is present, authorizeGet
 * issues an authorization code and 302-redirects to the redirect_uri
 * WITHOUT rendering the login form.
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

const mockGetPool = jest.fn() as jest.Mock;
const mockGetClient = jest.fn() as jest.Mock;
const mockIssueAuthorizationCode = jest.fn() as jest.Mock;
const mockVerifyScope = jest.fn() as jest.Mock;
const mockIsUserActive = jest.fn() as jest.Mock;
const mockGetUserById = jest.fn() as jest.Mock;
const mockLogin = jest.fn() as jest.Mock;

jest.unstable_mockModule('../../database.service.js', () => ({
  databaseService: { getPool: mockGetPool },
}));

jest.unstable_mockModule('../../../services/oidc/oidc.service.js', () => ({
  oidcService: {
    getClient: mockGetClient,
    issueAuthorizationCode: mockIssueAuthorizationCode,
    verifyScope: mockVerifyScope,
  },
}));

// Sprint 2.12 — 共享账号治理：authorizeGet 快路径现在校验 is_active
jest.unstable_mockModule('../../../services/user.service.js', () => ({
  userService: {
    isUserActive: mockIsUserActive,
    getUserById: mockGetUserById,
    login: mockLogin,
  },
}));

// Mocks for token service / issuer
const mockGetIssuer = jest.fn(() => 'https://account.proclaw.cc') as jest.Mock;
jest.unstable_mockModule('../../../services/oidc/oidc-token.service.js', () => ({
  oidcTokenService: { getIssuer: mockGetIssuer },
}));

let oidcController: typeof import('../../../controllers/oidc.controller.js').oidcController;
let pcSessionService: typeof import('../../../middleware/pc-session.middleware.js').pcSessionService;

beforeAll(async () => {
  process.env.PC_SESSION_SECRET = 'b'.repeat(64);
  process.env.JWT_SECRET = 'c'.repeat(64);
  process.env.CROSS_AUTH_SECRET = 'd'.repeat(64);
  process.env.NODE_ENV = 'development';
  oidcController = (await import('../../../controllers/oidc.controller.js')).oidcController;
  pcSessionService = (await import('../../../middleware/pc-session.middleware.js')).pcSessionService;
});

function makeRes() {
  let statusCode = 200;
  let body: any = null;
  const headers: Record<string, string> = {};
  const res: any = {
    set(k: string, v: string) {
      headers[k.toLowerCase()] = v;
    },
    header(k: string, v: string) {
      headers[k.toLowerCase()] = v;
    },
    cookie(name: string, value: string, opts: any) {
      const parts = [`${name}=${value}`];
      if (opts.domain) parts.push(`Domain=${opts.domain}`);
      if (opts.path) parts.push(`Path=${opts.path}`);
      if (opts.httpOnly) parts.push('HttpOnly');
      if (opts.secure) parts.push('Secure');
      if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
      if (opts.maxAge) parts.push(`Max-Age=${Math.floor(opts.maxAge / 1000)}`);
      headers['set-cookie'] = parts.join('; ');
    },
    clearCookie(name: string, opts: any) {
      this.cookie(name, '', { ...opts, maxAge: 0 });
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      body = payload;
      return this;
    },
    send(payload: any) {
      body = payload;
      return this;
    },
    redirect(code: number, location: string) {
      statusCode = code;
      headers['location'] = location;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    headers,
  };
  return res;
}

describe('oidcController.authorizeGet() — cookie fast-path (Task 2.10)', () => {
  beforeEach(() => {
    mockGetPool.mockReset();
    mockGetClient.mockReset();
    mockIssueAuthorizationCode.mockReset();
    mockVerifyScope.mockReset();
    mockIsUserActive.mockReset();
    mockIsUserActive.mockImplementation(() => Promise.resolve(true));
    mockGetUserById.mockReset();
    mockLogin.mockReset();
    mockGetClient.mockImplementation(() => Promise.resolve({
      redirect_uris: ['https://rp.example.com/callback'],
      allowed_scopes: ['openid', 'profile', 'email'],
    }));
    mockVerifyScope.mockImplementation((req) => req);
    mockIssueAuthorizationCode.mockImplementation(() => Promise.resolve('CODE-XYZ'));
  });

  it('302-redirects with code= when pc_session is valid', async () => {
    // Mint a cookie first
    const issueRes = makeRes();
    await pcSessionService.issue(issueRes, 'user_cookie_path');
    const raw = (issueRes.headers['set-cookie'] || '').split(';')[0].split('=')[1];

    const req: any = {
      sessionUser: undefined,
      cookies: { pc_session: raw },
      headers: { cookie: `pc_session=${raw}` },
      query: {
        response_type: 'code',
        client_id: 'proclaw-web',
        redirect_uri: 'https://rp.example.com/callback',
        scope: 'openid profile email',
        state: 'ssostate',
        code_challenge: 'whatever',
        code_challenge_method: 'plain',
        nonce: 'n-1',
      },
      secure: false,
    };
    const res = makeRes();
    // Simulate the pcSessionService.middleware() that would normally run before
    // authorizeGet in the production stack: it reads the cookie and writes
    // req.sessionUser.  We call read() directly to keep this test independent
    // of the express middleware chain.
    await pcSessionService.read(req);
    await oidcController.authorizeGet(req, res);

    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toMatch(/^https:\/\/rp\.example\.com\/callback\?code=CODE-XYZ&state=ssostate/);
    expect(mockIssueAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(mockIssueAuthorizationCode.mock.calls[0]?.[0]).toMatchObject({
      userId: 'user_cookie_path',
      clientId: 'proclaw-web',
      redirectUri: 'https://rp.example.com/callback',
    });
  });

  it('302-redirects to account-portal login (NOT issue code) when pc_session user is inactive (Sprint 2.12)', async () => {
    const issueRes = makeRes();
    await pcSessionService.issue(issueRes, 'user_cookie_path');
    const raw = (issueRes.headers['set-cookie'] || '').split(';')[0].split('=')[1];

    const req: any = {
      sessionUser: undefined,
      cookies: { pc_session: raw },
      headers: { cookie: `pc_session=${raw}` },
      query: {
        response_type: 'code',
        client_id: 'proclaw-web',
        redirect_uri: 'https://rp.example.com/callback',
        scope: 'openid profile email',
        state: 'ssostate',
        code_challenge: 'whatever',
        code_challenge_method: 'plain',
        nonce: 'n-1',
      },
      secure: false,
      originalUrl: '/oauth/authorize?response_type=code&client_id=proclaw-web',
    };
    const res = makeRes();
    await pcSessionService.read(req);
    mockIsUserActive.mockImplementation(() => Promise.resolve(false));
    await oidcController.authorizeGet(req, res);

    expect(mockIsUserActive).toHaveBeenCalledWith('user_cookie_path');
    expect(mockIssueAuthorizationCode).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toMatch(/^\/portal\/login\/\?redirectTo=/);
  });

  it('302-redirects to account-portal login page when no cookie is present (Sprint 2.10)', async () => {
    const req: any = {
      sessionUser: undefined,
      cookies: {},
      headers: {},
      query: {
        response_type: 'code',
        client_id: 'proclaw-web',
        redirect_uri: 'https://rp.example.com/callback',
        scope: 'openid',
        state: '',
        code_challenge: 'whatever',
        code_challenge_method: 'plain',
      },
      secure: false,
      originalUrl: '/oauth/authorize?response_type=code&client_id=proclaw-web',
    };
    const res = makeRes();
    await oidcController.authorizeGet(req, res);
    // Sprint 2.10: 未登录 → 302 到 account-portal 登录页（不再内联渲染 200 HTML 表单）
    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toMatch(/^\/portal\/login\/\?redirectTo=/);
    // issueAuthorizationCode should NOT have been called
    expect(mockIssueAuthorizationCode).not.toHaveBeenCalled();
  });
});
