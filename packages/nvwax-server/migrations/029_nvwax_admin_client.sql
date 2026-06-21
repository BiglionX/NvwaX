-- ============================================
-- NvwaX Admin OIDC Client (Sprint 2.11)
-- 为 admin 后台创建独立的 OIDC 客户端
-- ============================================

BEGIN;

INSERT INTO oidc_clients (
  client_id, client_secret_hash, name,
  redirect_uris, allowed_scopes, allowed_grant_types,
  require_pkce, token_endpoint_auth_method, is_active
)
VALUES (
  'nvwax-admin',
  NULL,
  'NvwaX Admin Backend',
  ARRAY[
    'https://account.proclaw.cc/oauth/callback',
    'https://nvwax.proclaw.cc/oauth/callback',
    'http://localhost:3000/oauth/callback'
  ],
  ARRAY['openid','profile','email'],
  ARRAY['authorization_code','refresh_token'],
  TRUE,
  'none',
  TRUE
)
ON CONFLICT (client_id) DO UPDATE SET
  redirect_uris = EXCLUDED.redirect_uris,
  allowed_scopes = EXCLUDED.allowed_scopes,
  is_active = EXCLUDED.is_active;

COMMIT;
