/**
 * OIDC login 触发器单测（Sprint 2.2）
 *
 * 覆盖：
 * - isSafeReturnTo：open redirect 防护
 * - normalizeReturnTo：URL decode / 非法 percent-encoding
 * - startLogin：写 sessionStorage / 默认 returnTo / 非安全回退 / window.location.href
 * - consumePendingPkce：取后清 key / TTL 过期 / JSON 损坏
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startLogin,
  consumePendingPkce,
  isSafeReturnTo,
  normalizeReturnTo,
  PKCE_STORAGE_KEY,
} from './login';

beforeEach(() => {
  sessionStorage.clear();
  // reset window.location so each test starts at /
  // happy-dom 默认就是 http://localhost/，设为 /
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).location = new URL('http://localhost/');
});

/**
 * Mock window.location 为可写对象，避免 happy-dom 下赋值 href 触发 navigation。
 * 同时给 assign() 一个 noop 桩（login.ts 内部用 assign 而非赋值 href）。
 */
function mockLocation() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockLoc: any = {
    ...window.location,
    href: '',
    assign: vi.fn(function (this: { href: string }, url: string) {
      this.href = url;
    }),
    replace: vi.fn(),
  };
  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: mockLoc,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('OIDC login: isSafeReturnTo', () => {
  it('"/" 视为安全', () => {
    expect(isSafeReturnTo('/')).toBe(true);
  });

  it('"/dashboard" 视为安全', () => {
    expect(isSafeReturnTo('/dashboard')).toBe(true);
  });

  it('"//evil.com" 视为不安全（protocol-relative）', () => {
    expect(isSafeReturnTo('//evil.com')).toBe(false);
  });

  it('"http://evil.com" 视为不安全（跨源）', () => {
    expect(isSafeReturnTo('http://evil.com')).toBe(false);
  });

  it('同源绝对 URL 视为安全', () => {
    expect(isSafeReturnTo('http://localhost/dashboard?x=1')).toBe(true);
  });

  it('空串视为不安全', () => {
    expect(isSafeReturnTo('')).toBe(false);
  });
});

describe('OIDC login: normalizeReturnTo', () => {
  it('普通路径原样返回', () => {
    expect(normalizeReturnTo('/dashboard')).toBe('/dashboard');
  });

  it('URL-encoded 路径被解码', () => {
    expect(normalizeReturnTo('%2Fdashboard%3Fx%3D1')).toBe('/dashboard?x=1');
  });

  it('非法 percent-encoding 保持原样', () => {
    expect(normalizeReturnTo('%E0%A4')).toBe('%E0%A4');
  });

  it('undefined 返回 "/"', () => {
    expect(normalizeReturnTo(undefined)).toBe('/');
  });

  it('null 返回 "/"', () => {
    expect(normalizeReturnTo(null)).toBe('/');
  });

  it('空串返回 "/"', () => {
    expect(normalizeReturnTo('')).toBe('/');
  });
});

describe('OIDC login: startLogin', () => {
  it('写 sessionStorage["oidc.pkce"] 5 字段齐全', async () => {
    mockLocation();
    await startLogin('/dashboard');
    const raw = sessionStorage.getItem(PKCE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toMatchObject({
      returnTo: '/dashboard',
    });
    expect(typeof parsed.codeVerifier).toBe('string');
    expect(parsed.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(typeof parsed.state).toBe('string');
    expect(parsed.state.length).toBeGreaterThanOrEqual(22);
    expect(typeof parsed.nonce).toBe('string');
    expect(parsed.nonce.length).toBeGreaterThanOrEqual(22);
    expect(typeof parsed.createdAt).toBe('number');
  });

  it('默认 returnTo 为 "/"', async () => {
    mockLocation();
    await startLogin();
    const parsed = JSON.parse(sessionStorage.getItem(PKCE_STORAGE_KEY)!);
    expect(parsed.returnTo).toBe('/');
  });

  it('非安全 returnTo 被替换为 "/"', async () => {
    mockLocation();
    await startLogin('//evil.com');
    const parsed = JSON.parse(sessionStorage.getItem(PKCE_STORAGE_KEY)!);
    expect(parsed.returnTo).toBe('/');
  });

  it('window.location.href 被设置为 IdP authorize URL', async () => {
    mockLocation();
    await startLogin('/');
    expect(window.location.href).toContain('/oauth/authorize');
    expect(window.location.href).toContain('code_challenge_method=S256');
    expect(window.location.href).toContain('response_type=code');
  });

  it('sessionStorage 不可用时抛错', async () => {
    // 模拟 storage 抛错
    const original = window.sessionStorage;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => {
        throw new Error('storage disabled');
      },
    });
    await expect(startLogin('/')).rejects.toThrow(/sessionStorage is not available/);
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: original,
    });
  });
});

describe('OIDC login: consumePendingPkce', () => {
  it('取出后 key 被删除', () => {
    sessionStorage.setItem(
      PKCE_STORAGE_KEY,
      JSON.stringify({ codeVerifier: 'v', state: 's', nonce: 'n', returnTo: '/', createdAt: Date.now() }),
    );
    const got = consumePendingPkce();
    expect(got).toMatchObject({ state: 's', returnTo: '/' });
    expect(sessionStorage.getItem(PKCE_STORAGE_KEY)).toBeNull();
  });

  it('第二次调用返回 null', () => {
    sessionStorage.setItem(
      PKCE_STORAGE_KEY,
      JSON.stringify({ codeVerifier: 'v', state: 's', nonce: 'n', returnTo: '/', createdAt: Date.now() }),
    );
    consumePendingPkce();
    expect(consumePendingPkce()).toBeNull();
  });

  it('JSON 损坏返回 null', () => {
    sessionStorage.setItem(PKCE_STORAGE_KEY, 'not-json{');
    expect(consumePendingPkce()).toBeNull();
  });

  it('超过 10 分钟 TTL 返回 null（fake timers）', () => {
    vi.useFakeTimers();
    const baseTime = 1_700_000_000_000;
    vi.setSystemTime(baseTime);
    sessionStorage.setItem(
      PKCE_STORAGE_KEY,
      JSON.stringify({
        codeVerifier: 'v',
        state: 's',
        nonce: 'n',
        returnTo: '/',
        createdAt: baseTime,
      }),
    );
    // 推进 10 分钟零 1 秒
    vi.setSystemTime(baseTime + 10 * 60 * 1000 + 1000);
    expect(consumePendingPkce()).toBeNull();
    vi.useRealTimers();
  });

  it('TTL 内（9 分 59 秒）正常返回', () => {
    vi.useFakeTimers();
    const baseTime = 1_700_000_000_000;
    vi.setSystemTime(baseTime);
    sessionStorage.setItem(
      PKCE_STORAGE_KEY,
      JSON.stringify({
        codeVerifier: 'v',
        state: 's',
        nonce: 'n',
        returnTo: '/',
        createdAt: baseTime,
      }),
    );
    vi.setSystemTime(baseTime + 9 * 60 * 1000 + 59 * 1000);
    const got = consumePendingPkce();
    expect(got).toMatchObject({ state: 's' });
    vi.useRealTimers();
  });
});
