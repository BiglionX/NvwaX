/**
 * OIDC 错误（遵循 RFC 6749 §5.2 + RFC 6750 §3.1 + OIDC Core 1.0 §3.1.2.6）
 */

export type OidcErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'invalid_scope'
  | 'unsupported_grant_type'
  | 'unauthorized_client'
  | 'access_denied'
  | 'server_error';

const HTTP_STATUS: Record<OidcErrorCode, number> = {
  invalid_request: 400,
  invalid_client: 401,
  invalid_grant: 400,
  invalid_scope: 400,
  unsupported_grant_type: 400,
  unauthorized_client: 400,
  access_denied: 403,
  server_error: 500,
};

export class OidcError extends Error {
  public readonly code: OidcErrorCode;
  public readonly httpStatus: number;

  constructor(code: OidcErrorCode, description?: string) {
    super(description ?? code);
    this.name = 'OidcError';
    this.code = code;
    this.httpStatus = HTTP_STATUS[code];
  }

  toJson() {
    return {
      error: this.code,
      error_description: this.message,
    };
  }
}
