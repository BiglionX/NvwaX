/**
 * Auth API Route 单测
 *
 * 覆盖：app/api/auth/[...path]/route.ts 的 3 个 handler + dispatcher
 * - handleToken（GET /api/auth/token）
 * - handleLogoutRemote（POST /api/auth/logout-remote）
 * - handleProxy（ANY /api/auth/proxy?path=...）
 * - dispatch 路由分发
 *
 * 策略：
 * - vi.mock('next/server') 替换 NextResponse/NextRequest
 * - 自己构造 fakeNextRequest：{ method, url, headers, cookies.get(), nextUrl, json(), arrayBuffer() }
 * - vi.mock('@/lib/oidc/cookie-crypto') 替换 decryptFromCookie
 * - vi.mock('@/lib/oidc/client') 替换 revokeRefreshToken
 * - vi.stubGlobal('fetch') mock upstream
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─────────── 依赖 mock ───────────

const VALID_SESSION = {
  accessToken: 'at-secret',
  refreshToken: 'rt-secret',
  idToken: 'it-secret',
  expiresAt: Date.now() + 3600_000,
  userInfo: { sub: 'u-1', email: 'u@test.com', name: 'Test' },
};

const EXPIRED_SESSION = { ...VALID_SESSION, expiresAt: Date.now() - 1000 };

const SESSION_NO_RT = { ...VALID_SESSION, refreshToken: undefined };

vi.mock('next/server', () => {
  class FakeNextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): Response {
      const headers = new Headers(init?.headers ?? {});
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
      return new Response(JSON.stringify(body), { ...init, headers });
    }
  }
  return {
    NextResponse: FakeNextResponse,
    NextRequest: class {},
  };
});

const decryptFromCookieMock = vi.fn();
vi.mock('@/lib/oidc/cookie-crypto', () => ({
  decryptFromCookie: (cookie: string) => decryptFromCookieMock(cookie),
}));

const revokeRefreshTokenMock = vi.fn();
vi.mock('@/lib/oidc/client', () => ({
  revokeRefreshToken: (rt: string) => revokeRefreshTokenMock(rt),
  buildEndSessionUrl: vi.fn(() => 'https://idp.test/oauth/logout'),
}));

// 副作用 import：让 route.ts 顶层代码跑起来，触发 globalThis.__routeTestDispatch 赋值
import './route';
// dispatch 通过 route.ts 内部挂到 globalThis.__routeTestDispatch（避免 Next.js 15 route 文件 export 限制）
// 这里用 indirect 方式拿到真实函数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dispatch: (req: any, ctx: { params: Promise<{ path?: string[] }> }) => Promise<Response> = (globalThis as any)
  .__routeTestDispatch;
if (!dispatch) throw new Error('dispatch not exposed — route.ts must be imported before this test');

// ─────────── fakeNextRequest 工厂 ───────────

interface FakeReqOptions {
  method?: string;
  url: string;
  cookies?: Record<string, string>;
  body?: string;
  headers?: Record<string, string>;
}

function fakeNextRequest(opts: FakeReqOptions) {
  const method = opts.method ?? 'GET';
  const urlObj = new URL(opts.url);
  const headers = new Headers(opts.headers ?? {});
  if (opts.cookies) {
    const cookieStr = Object.entries(opts.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    if (cookieStr) headers.set('cookie', cookieStr);
  }
  const body = opts.body;
  return {
    method,
    url: opts.url,
    nextUrl: urlObj,
    headers,
    cookies: {
      get: (name: string) => {
        const cookieHeader = headers.get('cookie') ?? '';
        const match = cookieHeader.match(
          new RegExp(`(?:^|;\\s*)${name}=([^;]+)`),
        );
        return match ? { value: match[1]! } : undefined;
      },
    },
    json: async () => JSON.parse(body ?? '{}'),
    arrayBuffer: async () => new TextEncoder().encode(body ?? '').buffer,
  };
}

function paramsPromise(pathParts: string[]) {
  return Promise.resolve({ path: pathParts });
}

const VALID_COOKIE = 'valid-session-cookie';
const COOKIE_NAME = 'nvwax_oidc_session';
const UPSTREAM_BASE = 'http://upstream.test/api';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  decryptFromCookieMock.mockReset();
  revokeRefreshTokenMock.mockReset();
  decryptFromCookieMock.mockImplementation(async (cookie: string) => {
    if (cookie === 'valid-session-cookie') return JSON.stringify(VALID_SESSION);
    if (cookie === 'expired-session-cookie') return JSON.stringify(EXPIRED_SESSION);
    if (cookie === 'no-rt-session-cookie') return JSON.stringify(SESSION_NO_RT);
    if (cookie === 'broken-cookie') throw new Error('decrypt failed');
    throw new Error('unknown cookie');
  });
  revokeRefreshTokenMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─────────── handleToken ───────────

describe('handleToken (GET /api/auth/token)', () => {
  it('无 session cookie → 401 unauthorized', async () => {
    const req = fakeNextRequest({ url: 'https://app.test/api/auth/token' });
    const res = await dispatch(req as never, { params: paramsPromise(['token']) });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('unauthorized');
  });

  it('cookie 损坏（decrypt 抛错）→ 401（readSession 兜底 null）', async () => {
    const req = fakeNextRequest({
      url: 'https://app.test/api/auth/token',
      cookies: { [COOKIE_NAME]: 'broken-cookie' },
    });
    const res = await dispatch(req as never, { params: paramsPromise(['token']) });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('unauthorized');
  });

  it('cookie 解密成功 → 200 + 4 token 字段齐全', async () => {
    const req = fakeNextRequest({
      url: 'https://app.test/api/auth/token',
      cookies: { [COOKIE_NAME]: VALID_COOKIE },
    });
    const res = await dispatch(req as never, { params: paramsPromise(['token']) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.accessToken).toBe('at-secret');
    expect(body.refreshToken).toBe('rt-secret');
    expect(body.idToken).toBe('it-secret');
    expect(typeof body.expiresAt).toBe('number');
  });

  it('session 没有 refreshToken → 200 + refreshToken 字段为 undefined', async () => {
    const req = fakeNextRequest({
      url: 'https://app.test/api/auth/token',
      cookies: { [COOKIE_NAME]: 'no-rt-session-cookie' },
    });
    const res = await dispatch(req as never, { params: paramsPromise(['token']) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.accessToken).toBe('at-secret');
    expect(body.refreshToken).toBeUndefined();
  });
});

// ─────────── handleLogoutRemote ───────────

describe('handleLogoutRemote (POST /api/auth/logout-remote)', () => {
  it('无 session + 无 body → 200 {ok:true, note: no refresh_token to revoke}', async () => {
    const req = fakeNextRequest({
      method: 'POST',
      url: 'https://app.test/api/auth/logout-remote',
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    const res = await dispatch(req as never, {
      params: paramsPromise(['logout-remote']),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; note?: string };
    expect(body.ok).toBe(true);
    expect(body.note).toBe('no refresh_token to revoke');
    expect(revokeRefreshTokenMock).not.toHaveBeenCalled();
  });

  it('body 有 refreshToken + revoke 成功 → 200 {ok:true}，revokeRefreshToken 被调', async () => {
    const req = fakeNextRequest({
      method: 'POST',
      url: 'https://app.test/api/auth/logout-remote',
      body: JSON.stringify({ refreshToken: 'rt-from-body' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await dispatch(req as never, {
      params: paramsPromise(['logout-remote']),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
    expect(revokeRefreshTokenMock).toHaveBeenCalledWith('rt-from-body');
  });

  it('body 有 refreshToken + revoke 抛错 → 500 server_error', async () => {
    revokeRefreshTokenMock.mockRejectedValue(new Error('IdP down'));
    const req = fakeNextRequest({
      method: 'POST',
      url: 'https://app.test/api/auth/logout-remote',
      body: JSON.stringify({ refreshToken: 'rt-from-body' }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await dispatch(req as never, {
      params: paramsPromise(['logout-remote']),
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string; error_description: string };
    expect(body.error).toBe('server_error');
    expect(body.error_description).toContain('IdP down');
  });

  it('body JSON 损坏（用 {} 兜底）+ session 有 refreshToken → revoke 用 session 里的 refreshToken', async () => {
    const req = fakeNextRequest({
      method: 'POST',
      url: 'https://app.test/api/auth/logout-remote',
      body: 'not-json',
      cookies: { [COOKIE_NAME]: VALID_COOKIE },
      headers: { 'content-type': 'application/json' },
    });
    const res = await dispatch(req as never, {
      params: paramsPromise(['logout-remote']),
    });
    expect(res.status).toBe(200);
    expect(revokeRefreshTokenMock).toHaveBeenCalledWith('rt-secret');
  });
});

// ─────────── handleProxy ───────────

describe('handleProxy (ANY /api/auth/proxy?path=...)', () => {
  it('无 session → 401 unauthorized', async () => {
    const req = fakeNextRequest({
      url: 'https://app.test/api/auth/proxy?path=/api/users/me',
    });
    const res = await dispatch(req as never, { params: paramsPromise(['proxy']) });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('unauthorized');
  });

  it('session.expiresAt 已过 → 401 invalid_grant', async () => {
    const req = fakeNextRequest({
      url: 'https://app.test/api/auth/proxy?path=/api/users/me',
      cookies: { [COOKIE_NAME]: 'expired-session-cookie' },
    });
    const res = await dispatch(req as never, { params: paramsPromise(['proxy']) });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; error_description: string };
    expect(body.error).toBe('invalid_grant');
    expect(body.error_description).toContain('expired');
  });

  it('缺 ?path= → 400 invalid_request', async () => {
    const req = fakeNextRequest({
      url: 'https://app.test/api/auth/proxy',
      cookies: { [COOKIE_NAME]: VALID_COOKIE },
    });
    const res = await dispatch(req as never, { params: paramsPromise(['proxy']) });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_request');
  });

  it('?path=evil（不以 / 开头）→ 400', async () => {
    const req = fakeNextRequest({
      url: 'https://app.test/api/auth/proxy?path=evil',
      cookies: { [COOKIE_NAME]: VALID_COOKIE },
    });
    const res = await dispatch(req as never, { params: paramsPromise(['proxy']) });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_request');
  });

  it('合法 path → 透传 method/headers/body 给 upstream，注入 Authorization: Bearer <at>', async () => {
    fetchMock.mockResolvedValue(jsonResp({ ok: true }));
    const reqBody = JSON.stringify({ foo: 'bar' });
    const req = fakeNextRequest({
      method: 'POST',
      url: 'https://app.test/api/auth/proxy?path=/api/users/me',
      cookies: { [COOKIE_NAME]: VALID_COOKIE },
      body: reqBody,
      headers: { 'content-type': 'application/json', 'x-extra': 'k1' },
    });
    const res = await dispatch(req as never, { params: paramsPromise(['proxy']) });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [targetUrl, targetInit] = fetchMock.mock.calls[0];
    expect(targetUrl).toBe(`${UPSTREAM_BASE}/api/users/me`);
    expect(targetInit.method).toBe('POST');
    const auth = (targetInit.headers as Headers).get('authorization');
    expect(auth).toBe('Bearer at-secret');
    expect((targetInit.headers as Headers).get('x-extra')).toBe('k1');
    expect(targetInit.body).toBeDefined();
  });

  it('透传时剥除 host / cookie / content-length / connection', async () => {
    fetchMock.mockResolvedValue(jsonResp({}));
    const req = fakeNextRequest({
      method: 'GET',
      url: 'https://app.test/api/auth/proxy?path=/api/users/me',
      cookies: { [COOKIE_NAME]: VALID_COOKIE },
      headers: {
        host: 'app.test',
        cookie: 'nvwax_oidc_session=secret',
        'content-length': '0',
        connection: 'keep-alive',
        'x-keep': 'yes',
      },
    });
    await dispatch(req as never, { params: paramsPromise(['proxy']) });
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('host')).toBeNull();
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('content-length')).toBeNull();
    expect(headers.get('connection')).toBeNull();
    expect(headers.get('x-keep')).toBe('yes');
  });

  it('upstream 200 → 透传状态码 + body + headers', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ hello: 'world' }), {
        status: 201,
        statusText: 'Created',
        headers: { 'x-upstream': 'v1', 'content-type': 'application/json' },
      }),
    );
    const req = fakeNextRequest({
      method: 'GET',
      url: 'https://app.test/api/auth/proxy?path=/api/users/me',
      cookies: { [COOKIE_NAME]: VALID_COOKIE },
    });
    const res = await dispatch(req as never, { params: paramsPromise(['proxy']) });
    expect(res.status).toBe(201);
    expect(res.statusText).toBe('Created');
    expect(res.headers.get('x-upstream')).toBe('v1');
    const body = (await res.json()) as { hello: string };
    expect(body.hello).toBe('world');
  });

  it('upstream 响应剥除 set-cookie / content-encoding / transfer-encoding / connection', async () => {
    fetchMock.mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: {
          'set-cookie': 'a=b',
          'content-encoding': 'gzip',
          'transfer-encoding': 'chunked',
          connection: 'keep-alive',
          'x-keep': 'yes',
        },
      }),
    );
    const req = fakeNextRequest({
      method: 'GET',
      url: 'https://app.test/api/auth/proxy?path=/api/users/me',
      cookies: { [COOKIE_NAME]: VALID_COOKIE },
    });
    const res = await dispatch(req as never, { params: paramsPromise(['proxy']) });
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.headers.get('content-encoding')).toBeNull();
    expect(res.headers.get('transfer-encoding')).toBeNull();
    expect(res.headers.get('connection')).toBeNull();
    expect(res.headers.get('x-keep')).toBe('yes');
  });

  it('upstream fetch 抛错（网络）→ 502 server_error', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const req = fakeNextRequest({
      method: 'GET',
      url: 'https://app.test/api/auth/proxy?path=/api/users/me',
      cookies: { [COOKIE_NAME]: VALID_COOKIE },
    });
    const res = await dispatch(req as never, { params: paramsPromise(['proxy']) });
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string; error_description: string };
    expect(body.error).toBe('server_error');
    expect(body.error_description).toContain('ECONNREFUSED');
  });
});

// ─────────── dispatcher ───────────

describe('dispatcher', () => {
  it("path: ['token'] → handleToken", async () => {
    const req = fakeNextRequest({ url: 'https://app.test/api/auth/token' });
    const res = await dispatch(req as never, { params: paramsPromise(['token']) });
    // 401 因为没 cookie，但证明走到 handleToken
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('unauthorized');
  });

  it("path: ['logout-remote'] → handleLogoutRemote", async () => {
    const req = fakeNextRequest({
      method: 'POST',
      url: 'https://app.test/api/auth/logout-remote',
      body: '{}',
      headers: { 'content-type': 'application/json' },
    });
    const res = await dispatch(req as never, {
      params: paramsPromise(['logout-remote']),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; note?: string };
    expect(body.note).toBe('no refresh_token to revoke');
  });

  it("path: ['proxy'] 走 handleProxy", async () => {
    const req = fakeNextRequest({
      url: 'https://app.test/api/auth/proxy?path=/api/x',
    });
    const res = await dispatch(req as never, { params: paramsPromise(['proxy']) });
    // 401 因为没 cookie，但证明走到 handleProxy
    expect(res.status).toBe(401);
  });

  it("path: ['something-else'] 也走 handleProxy（catch-all 默认）", async () => {
    fetchMock.mockResolvedValue(jsonResp({ ok: true }));
    const req = fakeNextRequest({
      url: 'https://app.test/api/auth/something-else?path=/api/foo',
      cookies: { [COOKIE_NAME]: VALID_COOKIE },
    });
    const res = await dispatch(req as never, {
      params: paramsPromise(['something-else']),
    });
    // 200 表示走到 handleProxy 并成功转发
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ─────────── 工具 ───────────

function jsonResp(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}
