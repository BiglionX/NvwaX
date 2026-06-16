/**
 * Unit tests: pc-session.middleware (Sprint 2 / DoD C9).
 *
 * Verifies:
 *   - issue() sets a cookie with the expected attributes
 *   - read() returns the user when the cookie is valid
 *   - read() returns null on missing/invalid/expired
 *   - requireSession() 401s when no cookie
 *   - requireCsrf() 403s when the header is missing or wrong
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

// Set the secret BEFORE importing the module (it reads env at module load via
// lazy lookup, but we want to fail fast if the test environment is misconfigured).
process.env.PC_SESSION_SECRET = process.env.PC_SESSION_SECRET || 'a'.repeat(64);
process.env.NODE_ENV = 'test';

// Minimal Express req/res stand-ins
function makeReq(cookieValue?: string, csrfHeader?: string) {
  const headers: Record<string, string> = {};
  if (cookieValue) headers.cookie = `pc_session=${cookieValue}`;
  if (csrfHeader) headers['x-pc-csrf'] = csrfHeader;
  return {
    headers,
    sessionUser: undefined as any,
    cookies: cookieValue ? { pc_session: cookieValue } : undefined,
    secure: false,
  } as any;
}

function makeRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  const res: any = {
    setHeader(k: string, v: string) {
      headers[k.toLowerCase()] = v;
    },
    getHeader(k: string) {
      return headers[k.toLowerCase()];
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
      this.body = payload;
      return this;
    },
    headers,
    get statusCode() {
      return statusCode;
    },
  };
  return res;
}

let pcSessionService: typeof import('../../../middleware/pc-session.middleware.js').pcSessionService;

beforeAll(async () => {
  const mod = await import('../../../middleware/pc-session.middleware.js');
  pcSessionService = mod.pcSessionService;
});

describe('pcSessionService.issue()', () => {
  it('sets pc_session cookie with DoD C9 attributes', async () => {
    const res = makeRes();
    const csrf = await pcSessionService.issue(res, 'user_123');
    expect(csrf).toMatch(/^[0-9a-f]{32}$/);
    const setCookie = res.headers['set-cookie'] || '';
    expect(setCookie).toContain('pc_session=');
    expect(setCookie).toMatch(/Domain=\.proclaw\.cc/);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toMatch(/SameSite=(L|l)ax/);
    // Test env is not "production" so Secure should NOT be set in dev
    expect(setCookie).not.toContain('Secure');
    expect(setCookie).toMatch(/Max-Age=86400/);
  });
});

describe('pcSessionService.read()', () => {
  it('returns null when no cookie is present', async () => {
    const req = makeReq();
    const user = await pcSessionService.read(req);
    expect(user).toBeNull();
    expect(req.sessionUser).toBeUndefined();
  });

  it('returns the user for a valid token', async () => {
    const res = makeRes();
    const csrf = await pcSessionService.issue(res, 'user_abc');
    const raw = res.headers['set-cookie'].split(';')[0].split('=')[1];

    const req = makeReq(raw);
    const user = await pcSessionService.read(req);
    expect(user).not.toBeNull();
    expect(user!.id).toBe('user_abc');
    expect(user!.csrf).toBe(csrf);
    expect(req.sessionUser).toEqual({ id: 'user_abc', csrf });
  });

  it('returns null for a garbage token', async () => {
    const req = makeReq('not-a-jwt');
    const user = await pcSessionService.read(req);
    expect(user).toBeNull();
  });
});

describe('pcSessionService.middleware()', () => {
  it('attaches sessionUser to req and calls next', async () => {
    const res = makeRes();
    const csrf = await pcSessionService.issue(res, 'user_mw');
    const raw = res.headers['set-cookie'].split(';')[0].split('=')[1];
    const req = makeReq(raw);
    const next = jest.fn();

    await pcSessionService.middleware()(req, makeRes(), next);
    expect(req.sessionUser?.id).toBe('user_mw');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not throw when cookie is missing', async () => {
    const req = makeReq();
    const next = jest.fn();
    await pcSessionService.middleware()(req, makeRes(), next);
    expect(req.sessionUser).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('pcSessionService.requireSession()', () => {
  it('401s when no session', async () => {
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();
    await pcSessionService.requireSession()(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('unauthorized');
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when session is present', async () => {
    const res = makeRes();
    await pcSessionService.issue(res, 'user_req');
    const raw = res.headers['set-cookie'].split(';')[0].split('=')[1];
    const req = makeReq(raw);
    const res2 = makeRes();
    const next = jest.fn();
    await pcSessionService.requireSession()(req, res2, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res2.statusCode).toBe(200);
  });
});

describe('pcSessionService.requireCsrf()', () => {
  it('403s when CSRF header is missing', async () => {
    const res = makeRes();
    const csrf = await pcSessionService.issue(res, 'user_csrf');
    const raw = res.headers['set-cookie'].split(';')[0].split('=')[1];
    const req = makeReq(raw); // no csrf header
    req.sessionUser = { id: 'user_csrf', csrf };
    const res2 = makeRes();
    const next = jest.fn();
    pcSessionService.requireCsrf()(req, res2, next);
    expect(res2.statusCode).toBe(403);
    expect(res2.body.code).toBe('csrf_mismatch');
  });

  it('403s when CSRF header is wrong', async () => {
    const res = makeRes();
    const csrf = await pcSessionService.issue(res, 'user_csrf2');
    const raw = res.headers['set-cookie'].split(';')[0].split('=')[1];
    const req = makeReq(raw, 'deadbeef'.repeat(4));
    req.sessionUser = { id: 'user_csrf2', csrf };
    const res2 = makeRes();
    pcSessionService.requireCsrf()(req, res2, jest.fn());
    expect(res2.statusCode).toBe(403);
  });

  it('calls next when CSRF matches', async () => {
    const res = makeRes();
    const csrf = await pcSessionService.issue(res, 'user_csrf3');
    const raw = res.headers['set-cookie'].split(';')[0].split('=')[1];
    const req = makeReq(raw, csrf);
    req.sessionUser = { id: 'user_csrf3', csrf };
    const res2 = makeRes();
    const next = jest.fn();
    pcSessionService.requireCsrf()(req, res2, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
