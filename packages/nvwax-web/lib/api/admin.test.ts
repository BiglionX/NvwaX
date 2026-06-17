/**
 * adminApi unit tests (Sprint 2.4 D2)
 *
 * 覆盖：
 * - Case 1-2: getProfile / getUserList 走 authedFetch + 正确 query 拼装
 * - Case 3: banUser POST + JSON body
 * - Case 4: 401 透传为 throw
 * - Case 5: admin.login 直连后端（不走 proxy，credentials: omit）
 * - Case 6-7: 响应 data.data / data 解包
 * - Case 8: credentials: same-origin（proxy 模式）
 * - Case 9: it.each 抽样测试 8 个方法都走 proxy
 * - Case 10: 失败响应完整 body
 * - Case 11: 不读 admin_token localStorage
 * - Case 12: DELETE method
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─────────── mock: authedFetch（spy）───────────
const mockAuthedFetch = vi.fn();
vi.mock('@/lib/oidc/authed-fetch', () => ({
  authedFetch: (...args: unknown[]) => mockAuthedFetch(...args),
}));

import { adminApi } from './admin';

function ok(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function err(status: number, body: unknown = { error: 'fail' }): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  mockAuthedFetch.mockReset();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ─────────── Case 1: getProfile 走 authedFetch + data 解包 ───────────
describe('Case 1: getProfile goes through authedFetch and unwraps data', () => {
  it('calls /admin/profile via proxy and unwraps response.data', async () => {
    mockAuthedFetch.mockResolvedValue(ok({ success: true, data: { id: 'a-1', email: 'a@x.com' } }));
    const result = await adminApi.getProfile();
    expect(mockAuthedFetch).toHaveBeenCalledWith('/admin/profile');
    expect(result).toEqual({ id: 'a-1', email: 'a@x.com' });
  });
});

// ─────────── Case 2: getUserList 走 authedFetch + 正确 query 拼装 ───────────
describe('Case 2: getUserList builds query string correctly', () => {
  it('passes page, limit, search as query params', async () => {
    mockAuthedFetch.mockResolvedValue(ok({ data: [{ id: 'u-1' }], total: 1 }));
    const result = await adminApi.getUserList(2, 10, 'alice');
    expect(mockAuthedFetch).toHaveBeenCalledWith('/admin/users?page=2&limit=10&search=alice');
    expect(result).toEqual({ data: [{ id: 'u-1' }], total: 1 });
  });

  it('omits undefined search param', async () => {
    mockAuthedFetch.mockResolvedValue(ok({ data: [], total: 0 }));
    await adminApi.getUserList(1, 20);
    expect(mockAuthedFetch).toHaveBeenCalledWith('/admin/users?page=1&limit=20');
  });
});

// ─────────── Case 3: banUser POST + JSON body ───────────
describe('Case 3: banUser sends POST with JSON body', () => {
  it('passes userId in path and reason in body', async () => {
    mockAuthedFetch.mockResolvedValue(ok({ success: true }));
    await adminApi.banUser('user-1', 'spam');
    expect(mockAuthedFetch).toHaveBeenCalledWith('/admin/users/user-1/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'spam' }),
    });
  });
});

// ─────────── Case 4: 401 透传为 throw ───────────
describe('Case 4: 401 response throws an error', () => {
  it('rejects with descriptive error when status is 401', async () => {
    mockAuthedFetch.mockResolvedValue(err(401, { error: 'Unauthorized' }));
    await expect(adminApi.getProfile()).rejects.toThrow('GET /admin/profile failed: 401');
  });
});

// ─────────── Case 5: admin.login 直连后端（不走 proxy，credentials: omit）──────────
describe('Case 5: admin.login bypasses proxy and uses direct fetch', () => {
  beforeEach(() => {
    // mock global fetch
    vi.stubGlobal('fetch', vi.fn());
  });

  it('calls /admin/login directly (not via proxy) with credentials: omit', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'ok', data: { admin: { id: 'a-1' }, token: 'jwt' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await adminApi.login('admin', 'pass');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/admin\/login$/);
    expect((init as RequestInit).credentials).toBe('omit');
    expect((init as RequestInit).method).toBe('POST');
    expect(result.data.token).toBe('jwt');
  });

  it('throws on 401 login response', async () => {
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(adminApi.login('admin', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});

// ─────────── Case 6: getProfile 解包 data ───────────
describe('Case 6: getProfile unwraps .data envelope', () => {
  it('returns the inner data when response is { success, data }', async () => {
    mockAuthedFetch.mockResolvedValue(ok({ success: true, data: { id: 'a-1', username: 'admin' } }));
    const r = await adminApi.getProfile();
    expect(r).toEqual({ id: 'a-1', username: 'admin' });
  });
});

// ─────────── Case 7: getAllAdmins 数组解包 ───────────
describe('Case 7: getAllAdmins unwraps array from .data', () => {
  it('returns the inner array', async () => {
    mockAuthedFetch.mockResolvedValue(ok({ data: [{ id: 'a-1' }, { id: 'a-2' }] }));
    const r = await adminApi.getAllAdmins();
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(2);
  });
});

// ─────────── Case 8: credentials: same-origin（proxy 模式）──────────
describe('Case 8: authedFetch is called (proxy sets credentials internally)', () => {
  it('delegates cookie handling to authedFetch (no manual localStorage injection)', async () => {
    mockAuthedFetch.mockResolvedValue(ok({ data: null }));
    // 即便 localStorage 里有 admin_token，adminApi 也不应读它
    localStorage.setItem('admin_token', 'should-be-ignored');
    await adminApi.getProfile();
    expect(mockAuthedFetch).toHaveBeenCalled();
    // localStorage 没被改也没被删
    expect(localStorage.getItem('admin_token')).toBe('should-be-ignored');
  });
});

// ─────────── Case 9: it.each 抽样测试 8 个方法都走 proxy ───────────
describe('Case 9: 8 sampled methods all go through authedFetch proxy', () => {
  it.each([
    ['getSystemStats', () => adminApi.getSystemStats(), '/admin/system/stats'],
    ['getCrawlerStatus', () => adminApi.getCrawlerStatus(), '/admin/crawler/status'],
    ['getUserStats', () => adminApi.getUserStats(), '/admin/users/stats'],
    ['getProjectStats', () => adminApi.getProjectStats(), '/admin/projects/stats'],
    ['getSystemHealth', () => adminApi.getSystemHealth(), '/admin/system/health'],
    ['getTokenOverview', () => adminApi.getTokenOverview(), '/admin/tokens/overview'],
    ['getPaymentConfigs', () => adminApi.getPaymentConfigs(), '/admin/payment-configs'],
    ['getAiTeamBuilds', () => adminApi.getAiTeamBuilds(), '/admin/virtual-companies/builds'],
  ])('%s routes through authedFetch with path %s', async (_name, fn, expectedPath) => {
    mockAuthedFetch.mockResolvedValue(ok({ data: null }));
    await fn();
    expect(mockAuthedFetch).toHaveBeenCalledWith(expectedPath);
  });
});

// ─────────── Case 10: 失败响应完整 body ───────────
describe('Case 10: failed response body is preserved', () => {
  it('admin.login error response body is parsed and used in error message', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const mockFetch = vi.mocked(globalThis.fetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(adminApi.login('u', 'p')).rejects.toThrow('rate_limited');
  });
});

// ─────────── Case 11: 不读 admin_token localStorage ───────────
describe('Case 11: does not read admin_token from localStorage (XSS defense)', () => {
  it('never calls localStorage.getItem(admin_token) for authed methods', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem');
    // 每次返回新 Response（避免 body 被消费）
    mockAuthedFetch.mockImplementation(async () => ok({ data: null }));
    await adminApi.getProfile();
    await adminApi.getUserList(1, 20, 'q');
    await adminApi.banUser('u-1');
    // 至少不应读 admin_token
    const adminTokenReads = spy.mock.calls.filter((c) => c[0] === 'admin_token');
    expect(adminTokenReads).toHaveLength(0);
    spy.mockRestore();
  });
});

// ─────────── Case 12: DELETE method ───────────
describe('Case 12: deleteAdmin uses DELETE method', () => {
  it('sends DELETE to /admin/admins/:id', async () => {
    mockAuthedFetch.mockResolvedValue(ok({ data: null }));
    await adminApi.deleteAdmin('a-del');
    expect(mockAuthedFetch).toHaveBeenCalledWith('/admin/admins/a-del', { method: 'DELETE' });
  });
});
