/**
 * OIDC 协议契约类型（与 Sprint 1 + ADR-004 冻结的 nvwax-server 端 6 端点对齐）
 *
 * - 字段名遵循 OIDC Core 1.0 规范
 * - 错误码严格 6 种：invalid_request / invalid_client / invalid_grant /
 *   unauthorized_client / unsupported_grant_type / server_error
 * - JWT claims 形状：sub / iss / aud / exp / iat / auth_time / nonce / email / name / picture
 */

export interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;

  response_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  token_endpoint_auth_methods_supported: string[];

  scopes_supported: string[];
  claims_supported: string[];

  code_challenge_methods_supported: string[];
  grant_types_supported: string[];
}

export interface OidcTokenResponse {
  access_token: string;
  token_type: 'Bearer' | string;
  expires_in: number; // seconds
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

/**
 * UserInfo 端点返回值（OIDC Core §5.3）。
 * 字段是否存在取决于请求的 scope。
 */
export interface OidcUserInfo {
  sub: string; // 用户 ID（必）
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  locale?: string;
  // IdP 可能扩展字段
  [key: string]: unknown;
}

export interface OidcErrorBody {
  error: OidcErrorCode | string;
  error_description?: string;
  error_uri?: string;
}

export type OidcErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'server_error';

/** IdP 端 JWT id_token claims 的最小子集。 */
export interface OidcIdTokenClaims {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  auth_time?: number;
  nonce?: string;
  email?: string;
  name?: string;
  picture?: string;
}
