/**
 * Middleware 单测（Sprint 2.2）
 *
 * 覆盖：packages/nvwax-web/middleware.ts 的路由保护 + i18n + locale 剥离逻辑
 *
 * 策略：
 * - vi.mock('next/server') → FakeNextRequest + FakeNextResponse（含 redirect 静态方法）
 * - vi.mock('next-intl/middleware') → createIntlMiddleware 返回 mock fn
 * - vi.mock('@/src/i18n/routing') → 纯 routing 对象
 * - 内函数（isStaticAsset/stripLocale/isProtected）未导出，通过行为间接验证
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────── Mock: next-intl/middleware ───────────

const INTL_MARKER = 'intl-middleware-ran';
const { intlMiddlewareMock } = vi.hoisted(() => ({ intlMiddlewareMock: vi.fn() }));
vi.mock('next-intl/middleware', () => ({
  default: () => intlMiddlewareMock,
}));

// ─────────── Mock: @/src/i18n/routing ───────────

vi.mock('@/src/i18n/routing', () => ({
  routing: {
    locales: ['zh', 'en'],
    defaultLocale: 'zh',
    localePrefix: 'as-needed',
  },
}));

// ─────────── Mock: next/server ───────────

vi.mock('next/server', () => {
  class FakeNextResponse extends Response {
    static redirect(url: URL): Response {
      const res = new Response(null, { status: 307 });
      res.headers.set('location', url.toString());
      res.headers.set('x-mock-redirect', 'true');
      return res;
    }
    static json(body: unknown, init?: ResponseInit): Response {
      const headers = new Headers(init?.headers ?? {});
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
      return new Response(JSON.stringify(body), { ...init, headers });
    }
  }
  return {
    NextResponse: FakeNextResponse,
    NextRequest: class {},
  };
});

// ─────────── Import 被测模块 ───────────

import middleware from './middleware';

// ─────────── fakeNextRequest 工厂 ───────────

interface FakeReqOptions {
  pathname: string;
  cookies?: Record<string, string>;
  baseUrl?: string;
}

function fakeNextRequest(opts: FakeReqOptions) {
  const base = opts.baseUrl ?? 'https://app.test';
  const url = `${base}${opts.pathname}`;
  const urlObj = new URL(url);
  const headers = new Headers();
  if (opts.cookies) {
    const cookieStr = Object.entries(opts.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    if (cookieStr) headers.set('cookie', cookieStr);
  }
  return {
    method: 'GET',
    url,
    nextUrl: urlObj,
    headers,
    cookies: {
      get: (name: string) => {
        const cookieHeader = headers.get('cookie') ?? '';
        const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
        return match ? { value: match[1]! } : undefined;
      },
    },
  };
}

const SESSION_COOKIE = 'nvwax_oidc_session';

function isIntlResponse(res: Response): boolean {
  return res.headers.get('x-mock') === INTL_MARKER;
}

function isRedirect(res: Response): boolean {
  return res.status === 307 && res.headers.has('location');
}

function getRedirectReturn(res: Response): string | null {
  const location = res.headers.get('location');
  if (!location) return null;
  const url = new URL(location);
  return url.searchParams.get('return');
}

// ─────────── beforeEach ───────────

beforeEach(() => {
  intlMiddlewareMock.mockReset();
  intlMiddlewareMock.mockImplementation(
    () => new Response('ok', { status: 200, headers: { 'x-mock': INTL_MARKER } }),
  );
});

// ═══════════════════════════════════════════
// 系统 / 静态路径 — 直通 intlMiddleware
// ═══════════════════════════════════════════

describe('系统 / 静态路径直通', () => {
  it('/_next/static/chunk.js → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/_next/static/chunk.js' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
    expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
  });

  it('/_vercel/insights → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/_vercel/insights' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('/api/auth/session → intlMiddleware（系统前缀）', () => {
    const req = fakeNextRequest({ pathname: '/api/auth/session' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('/oauth/callback → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/oauth/callback' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('/portal/login/ → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/portal/login/' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });
});

describe('静态资源扩展名直通', () => {
  it('.svg 文件 → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/images/logo.svg' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('.png 文件 → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/favicon.png' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('.woff2 字体 → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/fonts/inter.woff2' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('.json 不在静态列表 → 不直通（走正常判断）', () => {
    // /data.json 不在 ALWAYS_PUBLIC 也不在 PROTECTED，走 intlMiddleware
    const req = fakeNextRequest({ pathname: '/data.json' });
    const res = middleware(req as never);
    // 非保护路径 → intlMiddleware
    expect(isIntlResponse(res)).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 受保护路径 — 鉴权
// ═══════════════════════════════════════════

describe('受保护路径鉴权', () => {
  it('/dashboard 无 cookie → 307 跳 /login?return=/dashboard', () => {
    const req = fakeNextRequest({ pathname: '/dashboard' });
    const res = middleware(req as never);
    expect(isRedirect(res)).toBe(true);
    expect(getRedirectReturn(res)).toBe('/dashboard');
  });

  it('/dashboard 有 cookie → intlMiddleware', () => {
    const req = fakeNextRequest({
      pathname: '/dashboard',
      cookies: { [SESSION_COOKIE]: 'valid-session' },
    });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('/projects/123 无 cookie → 307 跳 /login?return=/projects/123', () => {
    const req = fakeNextRequest({ pathname: '/projects/123' });
    const res = middleware(req as never);
    expect(isRedirect(res)).toBe(true);
    expect(getRedirectReturn(res)).toBe('/projects/123');
  });

  it('/profile 无 cookie → redirect', () => {
    const req = fakeNextRequest({ pathname: '/profile' });
    const res = middleware(req as never);
    expect(isRedirect(res)).toBe(true);
    expect(getRedirectReturn(res)).toBe('/profile');
  });

  it('/admin/settings 无 cookie → redirect', () => {
    const req = fakeNextRequest({ pathname: '/admin/settings' });
    const res = middleware(req as never);
    expect(isRedirect(res)).toBe(true);
    expect(getRedirectReturn(res)).toBe('/admin/settings');
  });

  it('/marketplace 无 cookie → redirect', () => {
    const req = fakeNextRequest({ pathname: '/marketplace' });
    const res = middleware(req as never);
    expect(isRedirect(res)).toBe(true);
  });

  it('/bounties 无 cookie → redirect', () => {
    const req = fakeNextRequest({ pathname: '/bounties' });
    const res = middleware(req as never);
    expect(isRedirect(res)).toBe(true);
  });

  it('/developer 无 cookie → redirect', () => {
    const req = fakeNextRequest({ pathname: '/developer' });
    const res = middleware(req as never);
    expect(isRedirect(res)).toBe(true);
  });
});

// ═══════════════════════════════════════════
// Locale 剥离
// ═══════════════════════════════════════════

describe('Locale 剥离', () => {
  it('/en/dashboard 无 cookie → return=/dashboard（剥掉 /en）', () => {
    const req = fakeNextRequest({ pathname: '/en/dashboard' });
    const res = middleware(req as never);
    expect(isRedirect(res)).toBe(true);
    expect(getRedirectReturn(res)).toBe('/dashboard');
  });

  it('/en/projects/123 无 cookie → return=/projects/123', () => {
    const req = fakeNextRequest({ pathname: '/en/projects/123' });
    const res = middleware(req as never);
    expect(isRedirect(res)).toBe(true);
    expect(getRedirectReturn(res)).toBe('/projects/123');
  });

  it('/en 精确匹配 → strip 为 /，走 ALWAYS_PUBLIC', () => {
    const req = fakeNextRequest({ pathname: '/en' });
    const res = middleware(req as never);
    // / 是 ALWAYS_PUBLIC → intlMiddleware
    expect(isIntlResponse(res)).toBe(true);
  });

  it('/en/login 无 cookie → 走 intlMiddleware（login 是 ALWAYS_PUBLIC）', () => {
    const req = fakeNextRequest({ pathname: '/en/login' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });
});

// ═══════════════════════════════════════════
// ALWAYS_PUBLIC 路径
// ═══════════════════════════════════════════

describe('ALWAYS_PUBLIC 路径', () => {
  it('/ → intlMiddleware（无 cookie 也不 redirect）', () => {
    const req = fakeNextRequest({ pathname: '/' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('/login → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/login' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('/register → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/register' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('/forgot-password → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/forgot-password' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('/terms → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/terms' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 非保护非白名单路径
// ═══════════════════════════════════════════

describe('非保护非白名单路径', () => {
  it('/some-random-page 无 cookie → intlMiddleware（不受保护）', () => {
    const req = fakeNextRequest({ pathname: '/some-random-page' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });

  it('/about-us 无 cookie → intlMiddleware', () => {
    const req = fakeNextRequest({ pathname: '/about-us' });
    const res = middleware(req as never);
    expect(isIntlResponse(res)).toBe(true);
  });
});

// ═══════════════════════════════════════════
// Redirect URL 构造
// ═══════════════════════════════════════════

describe('Redirect URL 构造', () => {
  it('redirect location 包含完整 barePath', () => {
    const req = fakeNextRequest({ pathname: '/team-skills' });
    const res = middleware(req as never);
    const location = res.headers.get('location')!;
    const url = new URL(location);
    expect(url.searchParams.get('return')).toBe('/team-skills');
  });

  it('redirect 基于 req.url 构造 origin', () => {
    const req = fakeNextRequest({
      pathname: '/dashboard',
      baseUrl: 'https://my.custom.domain',
    });
    const res = middleware(req as never);
    const location = res.headers.get('location')!;
    expect(location).toContain('my.custom.domain');
  });
});

// ═══════════════════════════════════════════
// config.matcher
// ═══════════════════════════════════════════

describe('config.matcher', () => {
  it('config 导出了 matcher', async () => {
    // 通过 import 获取 config
    const mod = await import('./middleware');
    expect(mod.config).toBeDefined();
    expect(mod.config.matcher).toBeDefined();
    expect(Array.isArray(mod.config.matcher)).toBe(true);
  });

  it('matcher 排除 api/_next/_vercel/静态文件', async () => {
    const mod = await import('./middleware');
    const matcher = mod.config.matcher[0] as string;
    // matcher 应该包含排除模式
    expect(matcher).toContain('api');
    expect(matcher).toContain('_next');
  });
});
