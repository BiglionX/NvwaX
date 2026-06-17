/**
 * useAuth hook 单测
 *
 * 覆盖：
 * - mount 时自动 refresh（GET /api/auth/session）
 * - 200 / 401 / 5xx / network error 状态分支
 * - login / logout / refresh / getToken 行为
 * - storage 事件（oidc.pkce / null / other）触发 refresh
 * - visibilitychange（visible / hidden）触发 refresh
 * - unmount 清理 listener
 *
 * 测试方式：react-dom/client.createRoot + act() 渲染 TestHarness 组件
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act, useEffect } from 'react';
import { useAuth } from './useAuth';

// ─────────── 内部 mock：避免测试真的走 OIDC 跳转 ───────────

vi.mock('@/lib/oidc/login', () => ({
  startLogin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/oidc/client', () => ({
  buildEndSessionUrl: vi.fn(() => 'https://idp.test/oauth/logout?post_logout_redirect_uri=https%3A%2F%2Fapp.test'),
}));

import { startLogin as mockedStartLogin } from '@/lib/oidc/login';
import { buildEndSessionUrl as mockedBuildEndSessionUrl } from '@/lib/oidc/client';

// ─────────── TestHarness 组件 ───────────

interface AuthApi {
  isLoggedIn: boolean;
  userInfo: unknown;
  loading: boolean;
  login: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  getToken: () => string | null;
}

interface Harness {
  root: Root;
  container: HTMLElement;
  getApi: () => AuthApi;
}

function mountHarness(): Harness {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let captured: AuthApi | null = null;

  function Harness({ onReady }: { onReady: (api: AuthApi) => void }) {
    const api = useAuth();
    useEffect(() => {
      onReady(api);
    }, [api, onReady]);
    return null;
  }

  act(() => {
    root.render(<Harness onReady={(api) => { captured = api; }} />);
  });

  return {
    root,
    container,
    getApi: () => {
      if (!captured) throw new Error('Harness not ready');
      return captured;
    },
  };
}

function unmountHarness(h: Harness): void {
  act(() => {
    h.root.unmount();
  });
  h.container.remove();
}

// ─────────── 测试基础设施 ───────────

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

/**
 * URL → response 路由器：避免 mockResolvedValueOnce 链被 mount 时消耗导致错位
 * - 每次调用返回新 Response（避免 happy-dom body stream 重复读）
 */
function makeRouter(
  routes: Record<string, unknown | ((url: string, method: string) => unknown)>,
  fallbackStatus = 404,
): (url: string | URL | Request, init?: RequestInit) => Promise<Response> {
  return async (url, init) => {
    const u = String(url);
    const method = (init?.method ?? 'GET').toUpperCase();
    const key = `${method} ${u}`;
    const match = routes[key] ?? routes[u] ?? routes[method];
    let body: unknown;
    let status = 200;
    if (typeof match === 'function') {
      body = match(u, method);
    } else if (match !== undefined) {
      body = match;
    } else {
      status = fallbackStatus;
      body = { error: 'no route' };
    }
    if (body instanceof Response) return body;
    return jsonResponse(body, { status });
  };
}

beforeEach(() => {
  sessionStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  vi.mocked(mockedStartLogin).mockClear();
  vi.mocked(mockedBuildEndSessionUrl).mockClear();
  vi.mocked(mockedStartLogin).mockResolvedValue(undefined);
  vi.mocked(mockedBuildEndSessionUrl).mockReturnValue(
    'https://idp.test/oauth/logout?post_logout_redirect_uri=https%3A%2F%2Fapp.test',
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('useAuth: mount & refresh', () => {
  it('mount 时调 GET /api/auth/session', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/session');
    expect((init as RequestInit).method).toBe('GET');
    expect((init as RequestInit).credentials).toBe('same-origin');
    expect((init as RequestInit).cache).toBe('no-store');
    unmountHarness(h);
  });

  it('session 200 {isLoggedIn:true, userInfo:{...}} → state 同步', async () => {
    fetchMock.mockImplementation(
      makeRouter({
        'GET /api/auth/session': {
          isLoggedIn: true,
          userInfo: { sub: 'u-1', email: 'u@test.com', name: 'Test' },
          expiresAt: 1_700_000_000_000,
        },
      }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    const api = h.getApi();
    expect(api.isLoggedIn).toBe(true);
    expect(api.loading).toBe(false);
    expect((api.userInfo as { email: string }).email).toBe('u@test.com');
    unmountHarness(h);
  });

  it('session 401 → isLoggedIn=false, userInfo=null, loading=false', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': new Response('{}', { status: 401 }) }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    const api = h.getApi();
    expect(api.isLoggedIn).toBe(false);
    expect(api.userInfo).toBeNull();
    expect(api.loading).toBe(false);
    unmountHarness(h);
  });

  it('session 500 → isLoggedIn=false', async () => {
    fetchMock.mockImplementation(
      makeRouter({
        'GET /api/auth/session': new Response('Server Error', { status: 500, statusText: 'Server Error' }),
      }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    expect(h.getApi().isLoggedIn).toBe(false);
    expect(h.getApi().userInfo).toBeNull();
    unmountHarness(h);
  });

  it('network error（fetch reject）→ isLoggedIn=false + console.error 被调', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockImplementation(() => Promise.reject(new Error('network down')));
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    expect(h.getApi().isLoggedIn).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    unmountHarness(h);
  });

  it('session 返回 userInfo=null → userInfo 保持 null（不崩）', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    expect(h.getApi().userInfo).toBeNull();
    expect(h.getApi().isLoggedIn).toBe(false);
    unmountHarness(h);
  });
});

describe('useAuth: login / getToken', () => {
  it('login("/dashboard") 调 oidcStartLogin("/dashboard")', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await h.getApi().login('/dashboard');
    });
    expect(mockedStartLogin).toHaveBeenCalledTimes(1);
    expect(mockedStartLogin).toHaveBeenCalledWith('/dashboard');
    unmountHarness(h);
  });

  it('login() 不传参数 → oidcStartLogin("/")', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await h.getApi().login();
    });
    expect(mockedStartLogin).toHaveBeenCalledWith('/');
    unmountHarness(h);
  });

  it('getToken() 始终返回 null（多次调用）', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: true, userInfo: { sub: 'u' }, expiresAt: 1 } }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    expect(h.getApi().getToken()).toBeNull();
    expect(h.getApi().getToken()).toBeNull();
    expect(h.getApi().getToken()).toBeNull();
    unmountHarness(h);
  });
});

describe('useAuth: logout 串行调用', () => {
  it('完整路径：GET session → GET token → DELETE session → POST logout-remote → window.location.href = buildEndSessionUrl()', async () => {
    // mock window.location.href 赋值
    let lastHref = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...window.location,
        set href(v: string) { lastHref = v; },
        get href() { return lastHref; },
      },
    });

    // URL 路由：mount GET session → logout 4 次 fetch
    fetchMock.mockImplementation(
      makeRouter({
        'GET /api/auth/session': { isLoggedIn: true, userInfo: { sub: 'u' }, expiresAt: 1 },
        'GET /api/auth/token': { accessToken: 'at', refreshToken: 'rt', idToken: 'it', expiresAt: 1 },
        'DELETE /api/auth/session': null, // body 不重要，logout 不会 .json()
        'POST /api/auth/logout-remote': { ok: true },
      }),
    );

    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    const callsBeforeLogout = fetchMock.mock.calls.length;
    expect(callsBeforeLogout).toBe(1); // mount 时 1 次 GET session

    await act(async () => {
      await h.getApi().logout();
    });

    // logout 内 4 次 fetch（useAuth logout 源码 fetch 不显式传 method，浏览器默认 GET）
    expect(fetchMock).toHaveBeenCalledTimes(5); // 1 (mount) + 4 (logout)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/session');
    expect(((fetchMock.mock.calls[1][1] as RequestInit).method ?? 'GET')).toBe('GET');
    expect(fetchMock.mock.calls[2][0]).toBe('/api/auth/token');
    expect(((fetchMock.mock.calls[2][1] as RequestInit).method ?? 'GET')).toBe('GET');
    expect(fetchMock.mock.calls[3][0]).toBe('/api/auth/session');
    expect((fetchMock.mock.calls[3][1] as RequestInit).method).toBe('DELETE');
    expect(fetchMock.mock.calls[4][0]).toBe('/api/auth/logout-remote');
    expect((fetchMock.mock.calls[4][1] as RequestInit).method).toBe('POST');

    // buildEndSessionUrl 被调
    expect(mockedBuildEndSessionUrl).toHaveBeenCalled();
    // window.location.href 被设置为 end session URL
    expect(lastHref).toContain('/oauth/logout');
    // state 已清
    expect(h.getApi().isLoggedIn).toBe(false);
    expect(h.getApi().userInfo).toBeNull();
    unmountHarness(h);
  });

  it('session 返回 isLoggedIn=false → 跳过 token + logout-remote', async () => {
    let lastHref = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...window.location,
        set href(v: string) { lastHref = v; },
        get href() { return lastHref; },
      },
    });

    fetchMock.mockImplementation(
      makeRouter({
        'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null },
        'DELETE /api/auth/session': null,
      }),
    );

    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    const callsBeforeLogout = fetchMock.mock.calls.length;
    expect(callsBeforeLogout).toBe(1);

    await act(async () => {
      await h.getApi().logout();
    });

    // 只有 session(GET mount) + session(GET logout) + session(DELETE) = 3 次
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // calls[1] = logout 中的 GET session（isLoggedIn=false）
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/session');
    expect(((fetchMock.mock.calls[1][1] as RequestInit).method ?? 'GET')).toBe('GET');
    // calls[2] = DELETE session
    expect(fetchMock.mock.calls[2][0]).toBe('/api/auth/session');
    expect((fetchMock.mock.calls[2][1] as RequestInit).method).toBe('DELETE');
    // 没有 token / logout-remote
    const allUrls = fetchMock.mock.calls.map((c) => c[0]);
    expect(allUrls).not.toContain('/api/auth/token');
    expect(allUrls).not.toContain('/api/auth/logout-remote');
    // 仍走 finally 跳 IdP
    expect(lastHref).toContain('/oauth/logout');
    unmountHarness(h);
  });

  it('logout 中途 fetch 抛错 → 仍走 finally：state 清空 + 跳 IdP', async () => {
    let lastHref = '';
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...window.location,
        set href(v: string) { lastHref = v; },
        get href() { return lastHref; },
      },
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // mount: 1 次 GET session OK → logout: 1 次 GET session OK → 1 次 GET token reject
    let callIndex = 0;
    fetchMock.mockImplementation((url, init) => {
      callIndex++;
      const u = String(url);
      const method = (init?.method ?? 'GET').toUpperCase();
      // mount 的 1 次 + logout 1 次 GET session 都用这个
      if (u === '/api/auth/session' && method === 'GET') {
        return Promise.resolve(
          jsonResponse({ isLoggedIn: true, userInfo: { sub: 'u' }, expiresAt: 1 }),
        );
      }
      // token 抛错
      if (u === '/api/auth/token') {
        return Promise.reject(new Error('token fetch failed'));
      }
      return Promise.resolve(jsonResponse({}));
    });

    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await h.getApi().logout();
    });

    // 错误被 console.error 记录
    expect(errorSpy).toHaveBeenCalled();
    // state 仍被清空
    expect(h.getApi().isLoggedIn).toBe(false);
    expect(h.getApi().userInfo).toBeNull();
    // 仍走 finally 跳 IdP
    expect(lastHref).toContain('/oauth/logout');
    unmountHarness(h);
  });
});

describe('useAuth: storage 事件', () => {
  it('storage 事件 key="oidc.pkce" 触发 refresh', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    const initialCalls = fetchMock.mock.calls.length;

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'oidc.pkce' }));
      await Promise.resolve();
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThan(initialCalls);
    unmountHarness(h);
  });

  it('storage 事件 key=null（clear storage）触发 refresh', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    const initialCalls = fetchMock.mock.calls.length;

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
      await Promise.resolve();
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThan(initialCalls);
    unmountHarness(h);
  });

  it('storage 事件 key="other" 不触发 refresh', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    const initialCalls = fetchMock.mock.calls.length;

    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'some-other-key' }));
      await Promise.resolve();
    });

    expect(fetchMock.mock.calls.length).toBe(initialCalls);
    unmountHarness(h);
  });
});

describe('useAuth: visibilitychange 事件', () => {
  it('visibilitychange 到 visible 触发 refresh', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    const initialCalls = fetchMock.mock.calls.length;

    // happy-dom 默认 visibilityState=visible；触发事件即可
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThan(initialCalls);
    unmountHarness(h);
  });

  it('visibilitychange 到 hidden 不触发 refresh', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    const initialCalls = fetchMock.mock.calls.length;

    // 把 visibilityState 改 hidden，再触发事件
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(fetchMock.mock.calls.length).toBe(initialCalls);
    // 恢复
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    unmountHarness(h);
  });
});

describe('useAuth: unmount 清理', () => {
  it('unmount 后 storage listener 被 removeEventListener', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const addsBefore = addSpy.mock.calls.filter((c) => c[0] === 'storage').length;
    const removesBefore = removeSpy.mock.calls.filter((c) => c[0] === 'storage').length;

    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    // mount 期间注册了 storage listener
    const addsAfterMount = addSpy.mock.calls.filter((c) => c[0] === 'storage').length;
    expect(addsAfterMount - addsBefore).toBe(1);

    unmountHarness(h);

    // unmount 期间清理了 1 个 storage listener
    const removesAfter = removeSpy.mock.calls.filter((c) => c[0] === 'storage').length;
    expect(removesAfter - removesBefore).toBe(1);
    expect(addsAfterMount - addsBefore).toBe(removesAfter - removesBefore);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('unmount 后 visibilitychange listener 被 removeEventListener', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const addsBefore = addSpy.mock.calls.filter((c) => c[0] === 'visibilitychange').length;
    const removesBefore = removeSpy.mock.calls.filter((c) => c[0] === 'visibilitychange').length;

    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    const addsAfterMount = addSpy.mock.calls.filter((c) => c[0] === 'visibilitychange').length;
    expect(addsAfterMount - addsBefore).toBe(1);

    unmountHarness(h);

    const removesAfter = removeSpy.mock.calls.filter((c) => c[0] === 'visibilitychange').length;
    expect(removesAfter - removesBefore).toBe(1);
    expect(addsAfterMount - addsBefore).toBe(removesAfter - removesBefore);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('unmount 后再 dispatch storage/visibility 都不再触发 fetch', async () => {
    fetchMock.mockImplementation(
      makeRouter({ 'GET /api/auth/session': { isLoggedIn: false, userInfo: null, expiresAt: null } }),
    );
    const h = mountHarness();
    await act(async () => {
      await Promise.resolve();
    });
    const callsBeforeUnmount = fetchMock.mock.calls.length;
    unmountHarness(h);

    // dispatch 多次，确保没有任何残留 listener
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'oidc.pkce' }));
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(fetchMock.mock.calls.length).toBe(callsBeforeUnmount);
  });
});
