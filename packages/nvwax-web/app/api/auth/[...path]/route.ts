/**
 * Auth 辅助 API Routes（Sprint 2.2）
 *
 * 路由分发（全部走 catch-all `[...path]`，内部按 subPath 区分）：
 *   GET    /api/auth/token             返回 { accessToken, refreshToken, idToken, expiresAt }
 *                                       仅前端 useAuth 拿 refresh_token 用，业务请用 authedFetch
 *   POST   /api/auth/logout-remote     转发 revokeRefreshToken 到 IdP /oauth/logout
 *   ANY    /api/auth/proxy?path=...    通用代理：把请求带 Authorization 头转发到 nvwax-server
 *
 * 所有路由都从 nvwax_oidc_session cookie 读 session；无 session 返回 401。
 */

import { NextRequest, NextResponse } from 'next/server';
import { decryptFromCookie } from '@/lib/oidc/cookie-crypto';
import { revokeRefreshToken } from '@/lib/oidc/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'nvwax_oidc_session';
const UPSTREAM_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface SessionPayload {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  userInfo: { sub: string; [key: string]: unknown };
}

async function readSession(req: NextRequest): Promise<SessionPayload | null> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const plain = await decryptFromCookie(cookie);
    return JSON.parse(plain) as SessionPayload;
  } catch {
    return null;
  }
}

// ─────────── GET /api/auth/token ───────────

async function handleToken(req: NextRequest): Promise<NextResponse> {
  const session = await readSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    idToken: session.idToken,
    expiresAt: session.expiresAt,
  });
}

// ─────────── POST /api/auth/logout-remote ───────────

async function handleLogoutRemote(req: NextRequest): Promise<NextResponse> {
  const session = await readSession(req);
  // 注销可不要求 session 有效（用户可能 session 已过期但想撤销）

  let body: { refreshToken?: string } = {};
  try {
    body = (await req.json()) as { refreshToken?: string };
  } catch {
    /* empty body is OK */
  }
  const refreshToken = body.refreshToken ?? session?.refreshToken;
  if (!refreshToken) {
    return NextResponse.json({ ok: true, note: 'no refresh_token to revoke' });
  }
  try {
    await revokeRefreshToken(refreshToken);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', error_description: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// ─────────── ANY /api/auth/proxy?path=... ───────────

/**
 * 通用鉴权代理。
 * - query 参数 `path` 是要转发到的 nvwax-server 路径（必填，必须以 / 开头）
 * - 把原请求的方法/headers/body 透传，但替换 Authorization 头为 session 中的 access_token
 * - 响应原样返回（含状态码、headers、body）
 */
async function handleProxy(req: NextRequest): Promise<NextResponse> {
  const session = await readSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (Date.now() > session.expiresAt) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'access_token expired' },
      { status: 401 },
    );
  }

  const targetPath = req.nextUrl.searchParams.get('path');
  if (!targetPath || !targetPath.startsWith('/')) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'path query param is required and must start with /' },
      { status: 400 },
    );
  }

  // 防止开放代理：只允许转发到 NEXT_PUBLIC_API_URL 同源
  const targetBase = UPSTREAM_BASE_URL.replace(/\/+$/, '');
  const targetUrl = `${targetBase}${targetPath}`;

  // 透传 headers（剥除 Host / Cookie / Content-Length）
  const upstreamHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'host' ||
      lower === 'cookie' ||
      lower === 'content-length' ||
      lower === 'connection'
    ) {
      return;
    }
    upstreamHeaders.set(key, value);
  });
  upstreamHeaders.set('Authorization', `Bearer ${session.accessToken}`);

  const body =
    req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer();

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body,
      cache: 'no-store',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', error_description: msg }, { status: 502 });
  }

  // 透传响应
  const respHeaders = new Headers();
  upstreamRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'set-cookie' ||
      lower === 'content-encoding' ||
      lower === 'transfer-encoding' ||
      lower === 'connection'
    ) {
      return;
    }
    respHeaders.set(key, value);
  });

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: respHeaders,
  });
}

// ─────────── Dispatcher ───────────

/**
 * 统一入口：按 subPath 路由到具体 handler。
 * Next.js 15 的 ctx.params 是 Promise，需要 await。
 */
async function dispatch(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  const { path: pathParts = [] } = await ctx.params;
  const subPath = pathParts.join('/');

  if (subPath === 'token') {
    return handleToken(req);
  }
  if (subPath === 'logout-remote') {
    return handleLogoutRemote(req);
  }
  // 其他 subPath（含 'proxy'）都走通用代理
  return handleProxy(req);
}

export { dispatch as GET, dispatch as POST, dispatch as PUT, dispatch as PATCH, dispatch as DELETE };

// 测试桥接：通过 globalThis 暴露 dispatch，避免 Next.js 15 route 文件的 export 限制。
// 仅在 vitest 环境（happy-dom）下生效，不影响生产构建。
declare global {
  var __routeTestDispatch: typeof dispatch | undefined;
}
if (typeof process !== 'undefined' && process.env?.VITEST) {
  (globalThis as unknown as { __routeTestDispatch: typeof dispatch }).__routeTestDispatch = dispatch;
}
