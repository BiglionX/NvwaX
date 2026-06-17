/**
 * authedFetch 工具单测
 *
 * 覆盖：
 * - URL 拼接：/api/auth/proxy?path=<encoded>
 * - 透传 method / headers / body
 * - credentials 强制 same-origin（覆盖调用方传值）
 * - 特殊字符（含 ?query=1）整体 encode
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authedFetch } from './authed-fetch';

beforeEach(() => {
  // 用 vi.fn() 替换全局 fetch
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('authedFetch: URL 拼接', () => {
  it('基本路径编码：/api/users/me → /api/auth/proxy?path=%2Fapi%2Fusers%2Fme', async () => {
    await authedFetch('/api/users/me');
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toBe('/api/auth/proxy?path=%2Fapi%2Fusers%2Fme');
  });

  it('upstreamPath 含 ?query=1 时整体 encode（避免破坏 URL 结构）', async () => {
    await authedFetch('/api/users/me?query=1&x=2');
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const calledUrl = fetchMock.mock.calls[0][0];
    // 整段被 encode，? 和 & 不会出现在 query string 的 "key" 位置
    expect(calledUrl).toBe('/api/auth/proxy?path=%2Fapi%2Fusers%2Fme%3Fquery%3D1%26x%3D2');
    // 解码后内容正确
    const u = new URL(calledUrl, 'http://x.test');
    expect(u.searchParams.get('path')).toBe('/api/users/me?query=1&x=2');
  });

  it('upstreamPath 根路径 /', async () => {
    await authedFetch('/');
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/proxy?path=%2F');
  });
});

describe('authedFetch: 选项透传', () => {
  it('method 透传给 fetch', async () => {
    await authedFetch('/api/users', { method: 'POST' });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
  });

  it('headers 透传给 fetch', async () => {
    await authedFetch('/api/users', { headers: { 'X-Foo': 'bar', 'X-Baz': 'qux' } });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toEqual({ 'X-Foo': 'bar', 'X-Baz': 'qux' });
  });

  it('body 透传给 fetch（POST JSON）', async () => {
    const body = JSON.stringify({ name: 'test' });
    await authedFetch('/api/users', { method: 'POST', body });
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(body);
  });

  it('返回 fetch 调用的 Response（透传）', async () => {
    const expected = new Response('{"ok":true}', { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(expected));
    const res = await authedFetch('/api/users');
    expect(res).toBe(expected);
  });
});

describe('authedFetch: credentials 强制 same-origin', () => {
  it('默认 credentials = "same-origin"', async () => {
    await authedFetch('/api/users');
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('same-origin');
  });

  it('即使调用方传 credentials: "omit" 也会被覆盖为 "same-origin"', async () => {
    // 显式传 omit（不应该被采用）
    await authedFetch('/api/users', { credentials: 'omit' } as RequestInit);
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    // 强制 same-origin（安全要求）
    expect(init.credentials).toBe('same-origin');
  });

  it('调用方传 "include" 也会被覆盖为 "same-origin"（不跨域发送 cookie）', async () => {
    await authedFetch('/api/users', { credentials: 'include' } as RequestInit);
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe('same-origin');
  });
});
