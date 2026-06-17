/**
 * Session API Route 单测（Sprint 2.2）
 *
 * 覆盖：app/api/auth/session/route.ts 的 3 个 handler
 * - POST   /api/auth/session   写入加密 cookie
 * - GET    /api/auth/session   读取 session（含自动 refresh 逻辑）
 * - DELETE /api/auth/session   清空 cookie
 *
 * 策略：
 * - vi.mock('next/server') → FakeNextResponse 带 cookies 属性
 * - vi.mock('@/lib/oidc/cookie-crypto') → encryptForCookie / decryptFromCookie
 * - vi.mock('@/lib/oidc/client') → refreshTokens / fetchUserInfo / OidcClientError（保留 class 结构）
 * - session route 直接 export POST/GET/DELETE，可直接 import
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─────────── 测试数据 ───────────

const COOKIE_NAME = 'nvwax_oidc_session';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 86400

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    accessToken: 'at-secret',
    refreshToken: 'rt-secret',
    idToken: 'it-secret',
    expiresAt: Date.now() + 3600_000,
    userInfo: { sub: 'u-1', email: 'u@test.com', name: 'Test' },
    ...overrides,
  };
}

// ─────────── Mock: OIDC client ───────────
// OidcClientError 必须在 mock 工厂内定义（vi.mock 会 hoist 到文件顶部）

const refreshTokensMock = vi.fn();
const fetchUserInfoMock = vi.fn();
vi.mock('@/lib/oidc/client', () => {
  class OidcClientError extends Error {
    readonly error: string;
    readonly httpStatus?: number;
    constructor(error: string, message: string, httpStatus?: number) {
      super(message);
      this.name = 'OidcClientError';
      this.error = error;
      this.httpStatus = httpStatus;
    }
  }
  return {
    refreshTokens: (rt: string) => refreshTokensMock(rt),
    fetchUserInfo: (at: string) => fetchUserInfoMock(at),
    OidcClientError,
  };
});

// ─────────── Import 被测模块 ───────────

import { POST, GET, DELETE } from './route';
// OidcClientError 从 mock 后的模块导入，确保与 route.ts 用的是同一个 class
import { OidcClientError } from '@/lib/oidc/client';

class FakeCookies {
  private store = new Map<string, { value: string; options?: unknown }>();
  set(name: string, value: string, options?: unknown) {
    this.store.set(name, { value, options });
  }
  get(name: string) {
    const entry = this.store.get(name);
    return entry ? { value: entry.value } : undefined;
  }
  /** 测试断言用 */
  _getOptions(name: string) {
    return this.store.get(name)?.options;
  }
  _has(name: string) {
    return this.store.has(name);
  }
}

vi.mock('next/server', () => {
  class FakeNextResponse extends Response {
    cookies = new FakeCookies();
    static json(body: unknown, init?: ResponseInit): Response {
      const headers = new Headers(init?.headers ?? {});
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
      const res = new Response(JSON.stringify(body), { ...init, headers }) as Response & {
        cookies: FakeCookies;
      };
      Object.defineProperty(res, 'cookies', {
        value: new FakeCookies(),
        writable: true,
        enumerable: true,
        configurable: true,
      });
      return res;
    }
  }
  return {
    NextResponse: FakeNextResponse,
    NextRequest: class {},
  };
});

// ─────────── Mock: cookie-crypto ───────────

const encryptForCookieMock = vi.fn();
const decryptFromCookieMock = vi.fn();
vi.mock('@/lib/oidc/cookie-crypto', () => ({
  encryptForCookie: (plain: string) => encryptForCookieMock(plain),
  decryptFromCookie: (cookie: string) => decryptFromCookieMock(cookie),
}));

// ─────────── fakeNextRequest 工厂 ───────────

interface FakeReqOptions {
  method?: string;
  url?: string;
  cookies?: Record<string, string>;
  body?: string;
}

function fakeNextRequest(opts: FakeReqOptions = {}) {
  const method = opts.method ?? 'GET';
  const url = opts.url ?? 'https://app.test/api/auth/session';
  const headers = new Headers();
  if (opts.cookies) {
    const cookieStr = Object.entries(opts.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    if (cookieStr) headers.set('cookie', cookieStr);
  }
  const body = opts.body;
  return {
    method,
    url,
    nextUrl: new URL(url),
    headers,
    cookies: {
      get: (name: string) => {
        const cookieHeader = headers.get('cookie') ?? '';
        const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
        return match ? { value: match[1]! } : undefined;
      },
    },
    json: async () => {
      if (!body) throw new Error('invalid JSON');
      return JSON.parse(body);
    },
  };
}

// ─────────── 辅助函数 ───────────

function getCookies(res: Response): FakeCookies {
  return (res as unknown as { cookies: FakeCookies }).cookies;
}

// ─────────── beforeEach / afterEach ───────────

beforeEach(() => {
  encryptForCookieMock.mockReset();
  decryptFromCookieMock.mockReset();
  refreshTokensMock.mockReset();
  fetchUserInfoMock.mockReset();

  encryptForCookieMock.mockImplementation(async (plain: string) => `encrypted:${plain.length}`);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════
// POST /api/auth/session — 写入 session
// ═══════════════════════════════════════════

describe('POST /api/auth/session', () => {
  it('无效 JSON body → 400 invalid_request', async () => {
    const req = fakeNextRequest({ method: 'POST', body: undefined });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect((body as Record<string, string>).error).toBe('invalid_request');
  });

  it('缺少 accessToken → 400 invalid_request', async () => {
    const req = fakeNextRequest({
      method: 'POST',
      body: JSON.stringify({ expiresAt: 123, userInfo: { sub: 'u' } }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect((body as Record<string, string>).error).toBe('invalid_request');
  });

  it('缺少 expiresAt → 400 invalid_request', async () => {
    const req = fakeNextRequest({
      method: 'POST',
      body: JSON.stringify({ accessToken: 'at', userInfo: { sub: 'u' } }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('缺少 userInfo.sub → 400 invalid_request', async () => {
    const req = fakeNextRequest({
      method: 'POST',
      body: JSON.stringify({ accessToken: 'at', expiresAt: 123, userInfo: {} }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('正常写入 → 200 {ok:true}，cookie 被 set，encrypt 被调', async () => {
    const payload = makeSession();
    const req = fakeNextRequest({
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Record<string, boolean>).ok).toBe(true);
    expect(encryptForCookieMock).toHaveBeenCalledTimes(1);
    const cookies = getCookies(res);
    expect(cookies._has(COOKIE_NAME)).toBe(true);
  });

  it('cookie options 含 httpOnly / sameSite / path / maxAge', async () => {
    const payload = makeSession();
    const req = fakeNextRequest({
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const res = await POST(req as never);
    const cookies = getCookies(res);
    const opts = cookies._getOptions(COOKIE_NAME) as Record<string, unknown>;
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(COOKIE_MAX_AGE);
  });

  it('encryptForCookie 抛错 → 500 server_error', async () => {
    encryptForCookieMock.mockRejectedValue(new Error('crypto fail'));
    const payload = makeSession();
    const req = fakeNextRequest({
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect((body as Record<string, string>).error).toBe('server_error');
    expect((body as Record<string, string>).error_description).toContain('crypto fail');
  });
});

// ═══════════════════════════════════════════
// GET /api/auth/session — 读取 session
// ═══════════════════════════════════════════

describe('GET /api/auth/session — 基本读取', () => {
  it('无 cookie → {isLoggedIn:false, userInfo:null, expiresAt:null}', async () => {
    const req = fakeNextRequest();
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Record<string, unknown>).isLoggedIn).toBe(false);
    expect((body as Record<string, unknown>).userInfo).toBeNull();
    expect((body as Record<string, unknown>).expiresAt).toBeNull();
  });

  it('有效 cookie（未过期）→ {isLoggedIn:true, userInfo, expiresAt}', async () => {
    const session = makeSession();
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(session));
    const req = fakeNextRequest({ cookies: { [COOKIE_NAME]: 'valid' } });
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Record<string, unknown>).isLoggedIn).toBe(true);
    expect((body as Record<string, { sub: string }>).userInfo.sub).toBe('u-1');
  });

  it('decryptFromCookie 抛错 → isLoggedIn:false + cookie 被清空', async () => {
    decryptFromCookieMock.mockRejectedValue(new Error('bad crypto'));
    const req = fakeNextRequest({ cookies: { [COOKIE_NAME]: 'corrupt' } });
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Record<string, unknown>).isLoggedIn).toBe(false);
    const cookies = getCookies(res);
    const opts = cookies._getOptions(COOKIE_NAME) as Record<string, unknown>;
    expect(opts?.maxAge).toBe(0);
  });

  it('JSON.parse 失败 → isLoggedIn:false + cookie 被清空', async () => {
    decryptFromCookieMock.mockResolvedValue('not-valid-json');
    const req = fakeNextRequest({ cookies: { [COOKIE_NAME]: 'garbage' } });
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Record<string, unknown>).isLoggedIn).toBe(false);
    const cookies = getCookies(res);
    const opts = cookies._getOptions(COOKIE_NAME) as Record<string, unknown>;
    expect(opts?.maxAge).toBe(0);
  });
});

describe('GET /api/auth/session — 自动 refresh 逻辑', () => {
  it('token 即将过期 + 有 refreshToken + refresh 成功 → 新 cookie + isLoggedIn:true', async () => {
    const session = makeSession({ expiresAt: Date.now() + 10_000 }); // 10s 后过期，<30s 触发 refresh
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(session));
    refreshTokensMock.mockResolvedValue({
      access_token: 'new-at',
      refresh_token: 'new-rt',
      id_token: 'new-it',
      expires_in: 3600,
    });
    fetchUserInfoMock.mockResolvedValue({ sub: 'u-1', email: 'u@test.com', name: 'Updated' });

    const req = fakeNextRequest({ cookies: { [COOKIE_NAME]: 'expiring' } });
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Record<string, unknown>).isLoggedIn).toBe(true);
    expect(refreshTokensMock).toHaveBeenCalledWith('rt-secret');
    expect(fetchUserInfoMock).toHaveBeenCalledWith('new-at');
    expect(encryptForCookieMock).toHaveBeenCalledTimes(1);
  });

  it('refresh 成功 + fetchUserInfo 失败 → userInfo 保持原值，不阻断', async () => {
    const session = makeSession({ expiresAt: Date.now() + 10_000 });
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(session));
    refreshTokensMock.mockResolvedValue({
      access_token: 'new-at',
      refresh_token: 'new-rt',
      expires_in: 3600,
    });
    fetchUserInfoMock.mockRejectedValue(new Error('userinfo fail'));

    const req = fakeNextRequest({ cookies: { [COOKIE_NAME]: 'expiring' } });
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Record<string, unknown>).isLoggedIn).toBe(true);
    expect((body as Record<string, { name: string }>).userInfo.name).toBe('Test'); // 原值
  });

  it('refreshTokens 抛 OidcClientError → 401 + x-oidc-session-error header', async () => {
    const session = makeSession({ expiresAt: Date.now() + 10_000 });
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(session));
    refreshTokensMock.mockRejectedValue(new OidcClientError('invalid_grant', 'token revoked'));

    const req = fakeNextRequest({ cookies: { [COOKIE_NAME]: 'expiring' } });
    const res = await GET(req as never);
    expect(res.status).toBe(401);
    expect(res.headers.get('x-oidc-session-error')).toBe('invalid_grant');
    const body = await res.json();
    expect((body as Record<string, unknown>).isLoggedIn).toBe(false);
    const cookies = getCookies(res);
    const opts = cookies._getOptions(COOKIE_NAME) as Record<string, unknown>;
    expect(opts?.maxAge).toBe(0);
  });

  it('refreshTokens 抛普通 Error → 401 + x-oidc-session-error: server_error', async () => {
    const session = makeSession({ expiresAt: Date.now() + 10_000 });
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(session));
    refreshTokensMock.mockRejectedValue(new Error('network down'));

    const req = fakeNextRequest({ cookies: { [COOKIE_NAME]: 'expiring' } });
    const res = await GET(req as never);
    expect(res.status).toBe(401);
    expect(res.headers.get('x-oidc-session-error')).toBe('server_error');
  });

  it('token 已过期 + 无 refreshToken → isLoggedIn:false + cookie 清空', async () => {
    const session = makeSession({ expiresAt: Date.now() - 1000, refreshToken: undefined });
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(session));

    const req = fakeNextRequest({ cookies: { [COOKIE_NAME]: 'expired-no-rt' } });
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Record<string, unknown>).isLoggedIn).toBe(false);
    expect(refreshTokensMock).not.toHaveBeenCalled();
    const cookies = getCookies(res);
    const opts = cookies._getOptions(COOKIE_NAME) as Record<string, unknown>;
    expect(opts?.maxAge).toBe(0);
  });

  it('token 未过期（expiresAt > now + 30s）→ 不调 refreshTokens', async () => {
    const session = makeSession({ expiresAt: Date.now() + 60_000 }); // 60s 后过期，>30s 不触发
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(session));

    const req = fakeNextRequest({ cookies: { [COOKIE_NAME]: 'fresh' } });
    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Record<string, unknown>).isLoggedIn).toBe(true);
    expect(refreshTokensMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/auth/session — refresh 后 cookie 更新', () => {
  it('refresh 返回新 refresh_token → 新 payload 中使用新 rt', async () => {
    const session = makeSession({ expiresAt: Date.now() + 10_000 });
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(session));
    refreshTokensMock.mockResolvedValue({
      access_token: 'new-at',
      refresh_token: 'brand-new-rt',
      expires_in: 3600,
    });
    fetchUserInfoMock.mockResolvedValue({ sub: 'u-1', email: 'u@test.com', name: 'Test' });

    const req = fakeNextRequest({ cookies: { [COOKIE_NAME]: 'expiring' } });
    await GET(req as never);
    expect(encryptForCookieMock).toHaveBeenCalledTimes(1);
    const encryptedArg = encryptForCookieMock.mock.calls[0][0] as string;
    const payload = JSON.parse(encryptedArg);
    expect(payload.refreshToken).toBe('brand-new-rt');
  });

  it('refresh 不返回 refresh_token → 保持原 payload 中的 refreshToken', async () => {
    const session = makeSession({ expiresAt: Date.now() + 10_000 });
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(session));
    refreshTokensMock.mockResolvedValue({
      access_token: 'new-at',
      // 无 refresh_token 字段
      expires_in: 3600,
    });
    fetchUserInfoMock.mockResolvedValue({ sub: 'u-1', email: 'u@test.com', name: 'Test' });

    const req = fakeNextRequest({ cookies: { [COOKIE_NAME]: 'expiring' } });
    await GET(req as never);
    const encryptedArg = encryptForCookieMock.mock.calls[0][0] as string;
    const payload = JSON.parse(encryptedArg);
    expect(payload.refreshToken).toBe('rt-secret'); // 保持原值
  });
});

// ═══════════════════════════════════════════
// DELETE /api/auth/session — 清空 session
// ═══════════════════════════════════════════

describe('DELETE /api/auth/session', () => {
  it('正常登出 → 200 {ok:true} + cookie 被清空（maxAge:0）', async () => {
    const req = fakeNextRequest({ method: 'DELETE' });
    const res = await DELETE(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Record<string, boolean>).ok).toBe(true);
    const cookies = getCookies(res);
    expect(cookies.get(COOKIE_NAME)?.value).toBe('');
    const opts = cookies._getOptions(COOKIE_NAME) as Record<string, unknown>;
    expect(opts?.maxAge).toBe(0);
  });

  it('无 cookie 时也返回 200 {ok:true}', async () => {
    const req = fakeNextRequest({ method: 'DELETE' });
    const res = await DELETE(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect((body as Record<string, boolean>).ok).toBe(true);
  });
});

// ═══════════════════════════════════════════
// Secure flag 测试
// ═══════════════════════════════════════════

describe('Cookie Secure flag', () => {
  it('NODE_ENV=production → cookie.secure === true', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const payload = makeSession();
    const req = fakeNextRequest({
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const res = await POST(req as never);
    const cookies = getCookies(res);
    const opts = cookies._getOptions(COOKIE_NAME) as Record<string, unknown>;
    expect(opts.secure).toBe(true);
    vi.unstubAllEnvs();
  });

  it('NODE_ENV=development → cookie.secure === false', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const payload = makeSession();
    const req = fakeNextRequest({
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const res = await POST(req as never);
    const cookies = getCookies(res);
    const opts = cookies._getOptions(COOKIE_NAME) as Record<string, unknown>;
    expect(opts.secure).toBe(false);
    vi.unstubAllEnvs();
  });
});
