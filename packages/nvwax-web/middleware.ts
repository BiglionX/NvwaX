/**
 * nvwax-web Middleware（Sprint 2.2）
 *
 * 职责：
 *   1. 维护 next-intl 路由（中文 as-needed，英文 /en）
 *   2. 对受保护路径做 OIDC session 鉴权
 *      - 无 session cookie → 302 跳 /login?return=<原路径>
 *      - 不直接跳 IdP（PKCE challenge 必须在浏览器生成）
 *
 * 白名单（无需鉴权）：
 *   - /, /login, /register
 *   - /oauth/*           （OIDC 回调本身）
 *   - /portal/*          （account-portal 静态资源，部署上同源）
 *   - /api/auth/*        （session 写入/读取/代理）
 *   - 静态资源 /_next/*、/images/*、/favicon.ico、/*.svg|ico|png|jpg...
 *
 * 受保护：
 *   - /dashboard, /profile, /projects, /marketplace, /bounties, /team-skills,
 *     /developer, /admin, /user-center, /test-connection, /faq, /search, /nvwa
 *   - /api/* (除 /api/auth/*) — 业务 API 应走 API Route 内部鉴权
 */

import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/src/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const SESSION_COOKIE = 'nvwax_oidc_session';

// 静态资源 / 系统路径
const SYSTEM_PREFIXES = ['/_next', '/_vercel', '/api/auth', '/oauth', '/portal'];

// 受保护的业务路径前缀
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/projects',
  '/marketplace',
  '/bounties',
  '/team-skills',
  '/developer',
  '/admin',
  '/user-center',
  '/test-connection',
  '/faq',
  '/search',
  '/nvwa',
];

// 总是公开的路径
const ALWAYS_PUBLIC = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/activate',
  '/terms',
  '/privacy',
  '/about',
  // Sprint 2.12: admin 登录页本身必须公开——否则未登录访问 /admin/login 会先被
  // 中间件弹去 /login，admin 登录按钮永远到不了（管理员登录走同一套 OIDC 流程）。
  '/admin/login',
]);

function isStaticAsset(pathname: string): boolean {
  return /\.(svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|woff2?|ttf|eot)$/i.test(pathname);
}

function stripLocale(pathname: string): string {
  // 去除 /en 前缀
  for (const loc of routing.locales) {
    if (loc === routing.defaultLocale) continue;
    if (pathname === `/${loc}`) return '/';
    if (pathname.startsWith(`/${loc}/`)) return pathname.slice(`/${loc}`.length);
  }
  return pathname;
}

function isProtected(pathname: string): boolean {
  if (ALWAYS_PUBLIC.has(pathname)) return false;
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // ── 1. 系统/静态路径直接走 i18n（不鉴权） ──
  if (SYSTEM_PREFIXES.some((p) => pathname.startsWith(p)) || isStaticAsset(pathname)) {
    return intlMiddleware(req);
  }

  // ── 2. 去掉 locale 前缀判断是否受保护 ──
  const barePath = stripLocale(pathname);
  const protectedRoute = isProtected(barePath);

  if (protectedRoute) {
    const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;
    if (!hasSession) {
      // 跳登录页携带 return URL（PKCE 在登录页触发）
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('return', barePath);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── 3. 其他都走 i18n ──
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
