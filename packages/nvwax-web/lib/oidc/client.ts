/**
 * OIDC RP（Relaying Party）Client — Sprint 2.2
 *
 * 封装 Sprint 1 冻结的 6 个 OIDC 端点：
 *   - discovery  → /.well-known/openid-configuration
 *   - authorize  → /oauth/authorize         （浏览器跳转，client 不直接调）
 *   - token      → /oauth/token             （authorization_code / refresh_token）
 *   - userinfo   → /oauth/userinfo          （Bearer）
 *   - jwks       → /.well-known/jwks.json
 *   - logout     → /oauth/logout            （撤销 refresh_token）
 *
 * 约束（来自 Sprint 2.1 决策 + ADR-004 冻结）：
 *   - 公网 RP（proclaw-web）= public client，token 请求不带 client_secret
 *   - 强制 PKCE（S256）
 *   - scope 至少 openid，profile/email 按需
 *   - error_code 严格 6 种：invalid_request / invalid_client / invalid_grant /
 *     unauthorized_client / unsupported_grant_type / server_error
 */

import type {
  OidcDiscovery,
  OidcTokenResponse,
  OidcUserInfo,
  OidcErrorBody,
} from './types';

// ─────────── 配置读取 ───────────

/**
 * OIDC 客户端运行期配置。
 * 浏览器侧只读 NEXT_PUBLIC_ 前缀；服务端/中间件可读全部。
 */
export interface OidcRuntimeConfig {
  issuer: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  postLogoutRedirectUri: string;
}

export function loadOidcConfig(): OidcRuntimeConfig {
  const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER;
  const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI;
  const scope = process.env.NEXT_PUBLIC_OIDC_SCOPE ?? 'openid profile email';
  const postLogoutRedirectUri = process.env.NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';

  if (!issuer) {
    throw new Error('[oidc] NEXT_PUBLIC_OIDC_ISSUER is not set');
  }
  if (!clientId) {
    throw new Error('[oidc] NEXT_PUBLIC_OIDC_CLIENT_ID is not set');
  }
  if (!redirectUri) {
    throw new Error('[oidc] NEXT_PUBLIC_OIDC_REDIRECT_URI is not set');
  }

  return { issuer: trimTrailingSlash(issuer), clientId, redirectUri, scope, postLogoutRedirectUri };
}

function trimTrailingSlash(s: string): string {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

// ─────────── Discovery 缓存 ───────────

let metadataCache: { value: OidcDiscovery; expiresAt: number } | null = null;
const DISCOVERY_TTL_MS = 10 * 60 * 1000; // 10 分钟

/**
 * 读取 OIDC discovery 文档。
 * 浏览器 / Edge runtime 共用；带内存缓存避免每次授权都重新拉。
 */
export async function discoverMetadata(
  issuer?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OidcDiscovery> {
  const cfg = issuer ? { issuer: trimTrailingSlash(issuer) } : loadOidcConfig();
  const now = Date.now();
  if (metadataCache && metadataCache.expiresAt > now && metadataCache.value.issuer === cfg.issuer) {
    return metadataCache.value;
  }

  const url = `${cfg.issuer}/.well-known/openid-configuration`;
  const res = await fetchImpl(url, {
    headers: { Accept: 'application/json' },
    // Next.js 缓存策略：no-store，避免服务端跨请求共享陈旧 metadata
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new OidcClientError('server_error', `discovery failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as OidcDiscovery;
  // 简单校验必要端点
  for (const ep of ['authorization_endpoint', 'token_endpoint', 'userinfo_endpoint', 'jwks_uri'] as const) {
    if (!json[ep]) {
      throw new OidcClientError('server_error', `discovery missing required endpoint: ${ep}`);
    }
  }
  metadataCache = { value: json, expiresAt: now + DISCOVERY_TTL_MS };
  return json;
}

/** 强制刷新 metadata（处理 IdP 轮换密钥 / 端点变更）。 */
export function clearMetadataCache(): void {
  metadataCache = null;
}

// ─────────── Authorization URL ───────────

export interface BuildAuthorizationUrlOptions {
  state: string;
  nonce: string;
  codeChallenge: string;
  codeChallengeMethod?: 'S256';
  scope?: string;
  /** 登录后回跳路径（仅 RP 同源内，如 /dashboard） */
  returnTo?: string;
}

/**
 * 拼装 /oauth/authorize 跳转 URL。
 *   - 强制 code_challenge_method=S256（PKCE 强约束）
 *   - response_type=code（authorization code flow）
 *   - prompt=consent 可选；目前不加，便于 SSO 体验
 */
export function buildAuthorizationUrl(opts: BuildAuthorizationUrlOptions): string {
  console.log('[oidc] buildAuthorizationUrl opts:', JSON.stringify(opts));
  const cfg = loadOidcConfig();
  console.log('[oidc] buildAuthorizationUrl cfg:', JSON.stringify(cfg));
  const url = new URL(`${cfg.issuer}/oauth/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', cfg.redirectUri);
  url.searchParams.set('scope', opts.scope ?? cfg.scope);
  url.searchParams.set('state', opts.state);
  url.searchParams.set('nonce', opts.nonce);
  url.searchParams.set('code_challenge', opts.codeChallenge);
  url.searchParams.set('code_challenge_method', opts.codeChallengeMethod ?? 'S256');
  // 把 returnTo 编码进 state 之外的位置：作为 prompt 之外的自定义参数
  // IdP 端会原样回传到 redirect_uri
  if (opts.returnTo) {
    url.searchParams.set('return_to', encodeURIComponent(opts.returnTo));
  }
  const finalUrl = url.toString();
  console.log('[oidc] buildAuthorizationUrl result:', finalUrl);
  return finalUrl;
}

// ─────────── Token Exchange ───────────

export interface ExchangeCodeOptions {
  code: string;
  codeVerifier: string;
  /** 可选覆盖，默认从 env 读 */
  redirectUri?: string;
}

/**
 * authorization_code grant：拿 code + code_verifier 换 access/refresh/id_token。
 *
 * 公网 RP（public client）流程：body 不带 client_secret，仅 client_id。
 * Sprint 2.1 migration 027 已 seed require_pkce=TRUE / token_endpoint_auth_method='none'。
 */
export async function exchangeCodeForTokens(
  opts: ExchangeCodeOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<OidcTokenResponse> {
  const cfg = loadOidcConfig();
  const meta = await discoverMetadata(cfg.issuer, fetchImpl);
  const redirectUri = opts.redirectUri ?? cfg.redirectUri;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: opts.code,
    redirect_uri: redirectUri,
    client_id: cfg.clientId,
    code_verifier: opts.codeVerifier,
  });

  const res = await fetchImpl(meta.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
    cache: 'no-store',
  });
  return parseTokenResponse(res);
}

/**
 * refresh_token grant：拿新 access_token（同时 IdP 会轮换 refresh_token）。
 */
export async function refreshTokens(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OidcTokenResponse> {
  const cfg = loadOidcConfig();
  const meta = await discoverMetadata(cfg.issuer, fetchImpl);

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: cfg.clientId,
  });

  const res = await fetchImpl(meta.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
    cache: 'no-store',
  });
  return parseTokenResponse(res);
}

async function parseTokenResponse(res: Response): Promise<OidcTokenResponse> {
  if (!res.ok) {
    const err = await safeReadOidcError(res);
    throw new OidcClientError(err.error, err.error_description ?? `token endpoint returned ${res.status}`, res.status);
  }
  const json = (await res.json()) as OidcTokenResponse;
  if (!json.access_token) {
    throw new OidcClientError('server_error', 'token response missing access_token');
  }
  return json;
}

// ─────────── UserInfo ───────────

/**
 * 拿当前 access_token 对应的用户信息。
 * scope 包含 email / profile 时会返回相应字段。
 */
export async function fetchUserInfo(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OidcUserInfo> {
  const cfg = loadOidcConfig();
  const meta = await discoverMetadata(cfg.issuer, fetchImpl);

  const res = await fetchImpl(meta.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await safeReadOidcError(res);
    throw new OidcClientError(err.error, err.error_description ?? `userinfo returned ${res.status}`, res.status);
  }
  return (await res.json()) as OidcUserInfo;
}

// ─────────── Logout ───────────

/**
 * 撤销 refresh_token（OIDC RP-Initiated Logout 的最小实现）。
 * 浏览器侧一般会再跳 end_session_endpoint 做会话级登出。
 */
export async function revokeRefreshToken(
  refreshToken: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const cfg = loadOidcConfig();
  const meta = await discoverMetadata(cfg.issuer, fetchImpl);
  const body = new URLSearchParams();
  if (refreshToken) body.set('refresh_token', refreshToken);

  const res = await fetchImpl(meta.end_session_endpoint ?? `${cfg.issuer}/oauth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
    cache: 'no-store',
  });
  // logout 即使失败也忽略（前端应清本地态）
  if (!res.ok) {
    // 仅记录，不抛
    console.warn(`[oidc] logout endpoint returned ${res.status}`);
  }
}

/**
 * 构造 RP-Initiated 登出跳转 URL（含 post_logout_redirect_uri）。
 * 浏览器端用。
 */
export function buildEndSessionUrl(idTokenHint?: string): string {
  const cfg = loadOidcConfig();
  const url = new URL(`${cfg.issuer}/oauth/logout`);
  if (idTokenHint) url.searchParams.set('id_token_hint', idTokenHint);
  if (cfg.postLogoutRedirectUri) {
    url.searchParams.set('post_logout_redirect_uri', cfg.postLogoutRedirectUri);
  }
  return url.toString();
}

// ─────────── 错误类型 ───────────

/**
 * OIDC 客户端错误，封装 Sprint 1 冻结的 6 种 error_code。
 * 业务层可按 error 字段做 i18n / 重定向处理。
 */
export class OidcClientError extends Error {
  readonly error: string;
  readonly httpStatus?: number;

  constructor(error: string, message: string, httpStatus?: number) {
    super(message);
    this.name = 'OidcClientError';
    this.error = error;
    this.httpStatus = httpStatus;
  }
}

async function safeReadOidcError(res: Response): Promise<OidcErrorBody> {
  try {
    const j = (await res.json()) as OidcErrorBody;
    if (j && typeof j.error === 'string') return j;
  } catch {
    // fall through
  }
  return { error: 'server_error', error_description: `HTTP ${res.status}` };
}
