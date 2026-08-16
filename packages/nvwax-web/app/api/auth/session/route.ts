/**
 * Session API Route（Sprint 2.2）
 *
 * POST   /api/auth/session    写入加密 cookie（OIDC 回调成功后由客户端调用）
 * GET    /api/auth/session    返回 { isLoggedIn, userInfo, expiresAt }
 * DELETE /api/auth/session    清空 cookie（登出）
 *
 * Cookie 策略：
 *   - 名称: nvwax_oidc_session
 *   - 加密: AES-256-GCM（lib/oidc/cookie-crypto.ts）
 *   - 标记: HttpOnly, SameSite=Lax, Path=/
 *   - Secure: 仅生产环境
 *   - Max-Age: 24 小时
 *
 * Sprint 2.12 变更：
 *   - SameSite 由 None 改回 Lax：该 cookie 只被同源前端消费（fetch /api/auth/*），
 *     不需要跨站发送；None 反而要求 Secure，在 http 开发环境会被浏览器拒绝。
 *   - POST 增加服务端校验：用 access_token 调 IdP userinfo 验证 token 真实性，
 *     并把服务端拉取的 userInfo 作为权威数据写入 cookie（不再信任客户端提交的 userInfo）。
 */

import { NextRequest, NextResponse } from 'next/server';
import { encryptForCookie, decryptFromCookie } from '@/lib/oidc/cookie-crypto';
import { refreshTokens, fetchUserInfo, OidcClientError } from '@/lib/oidc/client';
import type { OidcUserInfo } from '@/lib/oidc/types';

export const runtime = 'nodejs'; // 需要稳定 Web Crypto；Edge 也支持，但 Node 更易调试

const COOKIE_NAME = 'nvwax_oidc_session';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24h

interface SessionPayload {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  /** access_token 过期时间（绝对毫秒时间戳） */
  expiresAt: number;
  userInfo: OidcUserInfo;
}

interface PublicSession {
  isLoggedIn: boolean;
  userInfo: OidcUserInfo | null;
  expiresAt: number | null;
}

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax' as const,  // Sprint 2.12: 同源消费，无需 None（None 在 http dev 会被浏览器拒绝）
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

function buildClearCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

// ─────────── POST：写入 session ───────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: SessionPayload;
  try {
    body = (await req.json()) as SessionPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_request', error_description: 'invalid JSON body' }, { status: 400 });
  }
  if (!body.accessToken || !body.expiresAt || !body.userInfo?.sub) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'accessToken, expiresAt, userInfo.sub are required' },
      { status: 400 },
    );
  }

  // ── Sprint 2.12：服务端校验 access_token 真实性 ──
  // 浏览器在回调里直接拿 code 换了 token，再 POST 到这里；若不做校验，
  // 任何人都能伪造 accessToken + userInfo（含 is_admin）写入 cookie。
  // 这里用 access_token 调 IdP userinfo 验证，并把服务端拉取的 userInfo
  // 作为权威数据覆盖客户端提交的值。
  let verifiedUserInfo: OidcUserInfo;
  try {
    verifiedUserInfo = await fetchUserInfo(body.accessToken);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'invalid_grant', error_description: `access_token verification failed: ${msg}` },
      { status: 401 },
    );
  }
  if (verifiedUserInfo.sub !== body.userInfo?.sub) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'userinfo sub mismatch with client-supplied userInfo' },
      { status: 401 },
    );
  }
  body.userInfo = verifiedUserInfo;

  try {
    const encrypted = await encryptForCookie(JSON.stringify(body));
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, encrypted, buildCookieOptions());
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/auth/session] encrypt failed:', msg, 'secret length:', (process.env.OIDC_SESSION_SECRET ?? '').length);
    return NextResponse.json({ error: 'server_error', error_description: msg }, { status: 500 });
  }
}

// ─────────── GET：读取 session（必要时自动 refresh） ───────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) {
    return NextResponse.json<PublicSession>({ isLoggedIn: false, userInfo: null, expiresAt: null });
  }

  let payload: SessionPayload;
  try {
    const plain = await decryptFromCookie(cookie);
    payload = JSON.parse(plain) as SessionPayload;
  } catch {
    // 解密失败：cookie 被篡改或密钥轮换，强制重登
    const res = NextResponse.json<PublicSession>({ isLoggedIn: false, userInfo: null, expiresAt: null });
    res.cookies.set(COOKIE_NAME, '', buildClearCookieOptions());
    return res;
  }

  // access_token 过期且有 refresh_token：尝试静默刷新
  const now = Date.now();
  if (payload.expiresAt <= now + 30 * 1000) {
    if (!payload.refreshToken) {
      const res = NextResponse.json<PublicSession>({ isLoggedIn: false, userInfo: null, expiresAt: null });
      res.cookies.set(COOKIE_NAME, '', buildClearCookieOptions());
      return res;
    }
    try {
      const tokens = await refreshTokens(payload.refreshToken);
      payload = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? payload.refreshToken,
        idToken: tokens.id_token ?? payload.idToken,
        expiresAt: Date.now() + tokens.expires_in * 1000,
        userInfo: payload.userInfo,
      };
      // 顺便刷一次 userinfo，捕捉账号变更
      try {
        payload.userInfo = await fetchUserInfo(payload.accessToken);
      } catch {
        // userinfo 失败不影响 access_token 刷新
      }
      const encrypted = await encryptForCookie(JSON.stringify(payload));
      const refreshedRes = NextResponse.json<PublicSession>({
        isLoggedIn: true,
        userInfo: payload.userInfo,
        expiresAt: payload.expiresAt,
      });
      refreshedRes.cookies.set(COOKIE_NAME, encrypted, buildCookieOptions());
      return refreshedRes;
    } catch (err) {
      // refresh 失败：session 失效，强制重登
      const reason = err instanceof OidcClientError ? err.error : 'server_error';
      const res = NextResponse.json<PublicSession>(
        { isLoggedIn: false, userInfo: null, expiresAt: null },
        { status: 401 },
      );
      res.cookies.set(COOKIE_NAME, '', buildClearCookieOptions());
      res.headers.set('x-oidc-session-error', reason);
      return res;
    }
  }

  return NextResponse.json<PublicSession>({
    isLoggedIn: true,
    userInfo: payload.userInfo,
    expiresAt: payload.expiresAt,
  });
}

// ─────────── DELETE：清空 session ───────────

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', buildClearCookieOptions());
  return res;
}
