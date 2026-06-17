/**
 * OIDC 回调处理（Sprint 2.2）
 *
 * 浏览器侧 /oauth/callback 路由用：
 *   - 读 URL 中的 ?code=&state=&return_to=
 *   - 校验 state 与 sessionStorage 中 pending PKCE 一致
 *   - 调 /oauth/token 换 access/refresh/id_token
 *   - 调 /oauth/userinfo 拉用户资料
 *   - POST /api/auth/session 写 httpOnly cookie
 *   - 跳回 returnTo
 *
 * 失败处理：转 /login?error=<oidc_error_code>&desc=...
 */

import {
  consumePendingPkce,
  normalizeReturnTo,
  isSafeReturnTo,
  PkcePendingState,
} from './login';
import { exchangeCodeForTokens, fetchUserInfo, OidcClientError } from './client';
import type { OidcTokenResponse, OidcUserInfo } from './types';

export interface CallbackParams {
  code: string;
  state: string;
  /** IdP 透传回来的 return_to（来自 buildAuthorizationUrl） */
  returnTo?: string;
  /** IdP 返回的 error（OIDC 错误码） */
  error?: string;
  errorDescription?: string;
}

export interface CallbackResult {
  ok: boolean;
  /** 成功后回跳的同源路径 */
  returnTo: string;
  /** 失败时的 OIDC 错误码 */
  error?: string;
  errorDescription?: string;
}

const LOGIN_PATH_FALLBACK = '/login';

/**
 * 处理 OIDC 回调。
 * 返回 CallbackResult；调用方负责实际跳转。
 */
export async function handleOidcCallback(
  params: CallbackParams,
): Promise<CallbackResult> {
  console.log('[oidc] handleOidcCallback params:', JSON.stringify(params));
  // ── 1. IdP 端已报错 ──
  if (params.error) {
    return {
      ok: false,
      returnTo: LOGIN_PATH_FALLBACK,
      error: params.error,
      errorDescription: params.errorDescription,
    };
  }

  if (!params.code || !params.state) {
    return {
      ok: false,
      returnTo: LOGIN_PATH_FALLBACK,
      error: 'invalid_request',
      errorDescription: 'missing code or state in callback',
    };
  }

  // ── 2. 取 pending PKCE 并校验 state ──
  const pending = consumePendingPkce();
  console.log('[oidc] consumePendingPkce result:', pending ? 'found' : 'null');
  if (!pending) {
    return {
      ok: false,
      returnTo: LOGIN_PATH_FALLBACK,
      error: 'invalid_request',
      errorDescription: 'no pending PKCE state (session expired or duplicate callback)',
    };
  }
  if (pending.state !== params.state) {
    return {
      ok: false,
      returnTo: LOGIN_PATH_FALLBACK,
      error: 'invalid_request',
      errorDescription: 'state mismatch — possible CSRF',
    };
  }

  // ── 3. code → tokens ──
  console.log('[oidc] exchanging code for tokens…');
  let tokens: OidcTokenResponse;
  try {
    tokens = await exchangeCodeForTokens({
      code: params.code,
      codeVerifier: pending.codeVerifier,
    });
    console.log('[oidc] tokens received, has access_token:', !!tokens.access_token);
  } catch (err) {
    console.error('[oidc] exchangeCodeForTokens failed:', err);
    return errorResultFromException(err, LOGIN_PATH_FALLBACK);
  }

  // ── 4. tokens → userinfo ──
  console.log('[oidc] fetching userinfo…');
  let userInfo: OidcUserInfo;
  try {
    userInfo = await fetchUserInfo(tokens.access_token);
    console.log('[oidc] userinfo received, sub:', userInfo.sub);
  } catch (err) {
    console.error('[oidc] fetchUserInfo failed:', err);
    return errorResultFromException(err, LOGIN_PATH_FALLBACK);
  }

  // ── 5. 写 httpOnly cookie ──
  const sessionPayload = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    userInfo,
  };
  console.log('[oidc] POST /api/auth/session…');
  const writeRes = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionPayload),
    credentials: 'same-origin',
  });
  console.log('[oidc] POST /api/auth/session status:', writeRes.status);
  if (!writeRes.ok) {
    return {
      ok: false,
      returnTo: LOGIN_PATH_FALLBACK,
      error: 'server_error',
      errorDescription: `failed to persist session: ${writeRes.status}`,
    };
  }

  // ── 6. 计算 returnTo（优先 IdP 透传 > pending > '/'） ──
  const rawReturn = params.returnTo ? normalizeReturnTo(params.returnTo) : pending.returnTo;
  const safeReturn = isSafeReturnTo(rawReturn) ? rawReturn : '/';

  console.log('[oidc] callback ok, returnTo=', safeReturn);
  return { ok: true, returnTo: safeReturn };
}

function errorResultFromException(err: unknown, fallback: string): CallbackResult {
  if (err instanceof OidcClientError) {
    return {
      ok: false,
      returnTo: fallback,
      error: err.error,
      errorDescription: err.message,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    ok: false,
    returnTo: fallback,
    error: 'server_error',
    errorDescription: message,
  };
}

export type { PkcePendingState };
