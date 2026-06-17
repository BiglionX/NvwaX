/**
 * SSE Stream Proxy 单测（Sprint 2.3）
 *
 * 覆盖：app/api/auth/sse-stream/route.ts
 * - 无 cookie → 401
 * - session 过期 → 401
 * - 缺少 sessionId → 400
 * - sessionId 非法字符 → 400
 * - 正常 SSE 流转发 → 200 + text/event-stream
 * - 上游 fetch 失败 → 502
 * - 上游返回非 200 → 透传状态码
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─────────── 依赖 mock ───────────

const VALID_SESSION = {
  accessToken: 'at-secret',
  expiresAt: Date.now() + 3600_000,
  userInfo: { sub: 'u-1', email: 'u@test.com', name: 'Test' },
};

const EXPIRED_SESSION = { ...VALID_SESSION, expiresAt: Date.now() - 1000 };

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

// 副作用 import：触发 globalThis.__sseStreamTestHandler 赋值
import './route';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GET = (globalThis as any).__sseStreamTestHandler;
if (!GET) throw new Error('GET handler not exposed — route.ts must be imported before this test');

// ─────────── fakeNextRequest 工厂 ───────────

interface FakeReqOptions {
  url: string;
  cookies?: Record<string, string>;
}

function fakeNextRequest(opts: FakeReqOptions) {
  const urlObj = new URL(opts.url);
  const cookieMap = opts.cookies ?? {};
  return {
    url: opts.url,
    method: 'GET',
    headers: new Headers(),
    cookies: {
      get(name: string) {
        return cookieMap[name] ? { value: cookieMap[name] } : undefined;
      },
    },
    nextUrl: {
      searchParams: urlObj.searchParams,
      pathname: urlObj.pathname,
    },
  };
}

// ─────────── 测试 ───────────

describe('GET /api/auth/sse-stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('无 session cookie → 401', async () => {
    const req = fakeNextRequest({ url: 'http://localhost/api/auth/sse-stream?sessionId=abc' });
    const res = await GET(req as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
  });

  it('session 过期 → 401', async () => {
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(EXPIRED_SESSION));
    const req = fakeNextRequest({
      url: 'http://localhost/api/auth/sse-stream?sessionId=abc',
      cookies: { nvwax_oidc_session: 'encrypted-cookie' },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('invalid_grant');
  });

  it('cookie 解密失败 → 401', async () => {
    decryptFromCookieMock.mockRejectedValue(new Error('decrypt failed'));
    const req = fakeNextRequest({
      url: 'http://localhost/api/auth/sse-stream?sessionId=abc',
      cookies: { nvwax_oidc_session: 'bad-cookie' },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it('缺少 sessionId → 400', async () => {
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(VALID_SESSION));
    const req = fakeNextRequest({
      url: 'http://localhost/api/auth/sse-stream',
      cookies: { nvwax_oidc_session: 'ok' },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_request');
  });

  it('sessionId 含非法字符 → 400', async () => {
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(VALID_SESSION));
    const req = fakeNextRequest({
      url: 'http://localhost/api/auth/sse-stream?sessionId=../etc/passwd',
      cookies: { nvwax_oidc_session: 'ok' },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(400);
  });

  it('正常 SSE 流转发 → 200 + text/event-stream headers', async () => {
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(VALID_SESSION));

    // mock 上游返回 SSE 流
    const sseBody = 'data: {"step":1}\n\ndata: {"step":2}\n\n';
    const upstreamResponse = new Response(sseBody, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstreamResponse));

    const req = fakeNextRequest({
      url: 'http://localhost/api/auth/sse-stream?sessionId=sess-123',
      cookies: { nvwax_oidc_session: 'ok' },
    });
    const res = await GET(req as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
    expect(res.headers.get('Connection')).toBe('keep-alive');

    // 验证 fetch 被正确调用
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [fetchUrl, fetchOpts] = fetchMock.mock.calls[0];
    expect(fetchUrl).toContain('/aiteam-creation/sessions/sess-123/stream');
    expect((fetchOpts as RequestInit).headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer at-secret' }),
    );
  });

  it('上游 fetch 抛异常 → 502', async () => {
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(VALID_SESSION));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const req = fakeNextRequest({
      url: 'http://localhost/api/auth/sse-stream?sessionId=sess-123',
      cookies: { nvwax_oidc_session: 'ok' },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('server_error');
    expect(body.error_description).toContain('ECONNREFUSED');
  });

  it('上游返回 404 → 透传状态码', async () => {
    decryptFromCookieMock.mockResolvedValue(JSON.stringify(VALID_SESSION));
    const upstreamResponse = new Response('Not Found', { status: 404 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(upstreamResponse));

    const req = fakeNextRequest({
      url: 'http://localhost/api/auth/sse-stream?sessionId=nonexist',
      cookies: { nvwax_oidc_session: 'ok' },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(404);
  });
});
