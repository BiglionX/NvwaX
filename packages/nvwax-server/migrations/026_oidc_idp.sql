-- ============================================
-- OIDC IdP Schema Migration
-- Sprint 1 — 统一认证引擎骨架
-- 为 ProClaw / skillhub 提供 OIDC 标准协议
-- ============================================

BEGIN;

-- 1. OIDC 客户端注册表（RP 注册）
CREATE TABLE IF NOT EXISTS oidc_clients (
  client_id TEXT PRIMARY KEY,
  client_secret_hash TEXT,                              -- bcrypt 哈希；public client 可为 NULL
  name TEXT NOT NULL,
  redirect_uris TEXT[] NOT NULL,                        -- 允许的回调 URI 白名单
  allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY['openid','profile','email'],
  allowed_grant_types TEXT[] NOT NULL DEFAULT ARRAY['authorization_code','refresh_token'],
  require_pkce BOOLEAN NOT NULL DEFAULT TRUE,           -- Sprint 1 强制 PKCE
  token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none', -- 'none' (public) | 'client_secret_post'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oidc_clients_active ON oidc_clients(is_active);

-- 2. 授权码表（一次性 code，PKCE 校验用）
CREATE TABLE IF NOT EXISTS oidc_authorization_codes (
  code TEXT PRIMARY KEY,                                -- 32-byte base64url
  client_id TEXT NOT NULL REFERENCES oidc_clients(client_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256',   -- 'S256' | 'plain'
  nonce TEXT,                                          -- OIDC 透传给 id_token
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,                  -- 一次性消费标记
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oidc_auth_codes_client_id ON oidc_authorization_codes(client_id);
CREATE INDEX IF NOT EXISTS idx_oidc_auth_codes_user_id ON oidc_authorization_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_oidc_auth_codes_expires_at ON oidc_authorization_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_oidc_auth_codes_used ON oidc_authorization_codes(used) WHERE used = FALSE;

-- 3. 刷新令牌表（不透明 token，存 hash；强制链式轮换）
CREATE TABLE IF NOT EXISTS oidc_refresh_tokens (
  token_hash TEXT PRIMARY KEY,                          -- SHA-256(token) 十六进制
  client_id TEXT NOT NULL REFERENCES oidc_clients(client_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  rotated_from TEXT,                                    -- 旧 token 的 hash（链式审计）
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oidc_refresh_tokens_user_id ON oidc_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oidc_refresh_tokens_client_id ON oidc_refresh_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_oidc_refresh_tokens_expires_at ON oidc_refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_oidc_refresh_tokens_active
  ON oidc_refresh_tokens(client_id, user_id)
  WHERE revoked = FALSE;

-- 4. 种子：本地开发 RP（proclaw-desktop / proclaw-web / skillhub-web 后续 Sprint 注册）
INSERT INTO oidc_clients (
  client_id, client_secret_hash, name,
  redirect_uris, allowed_scopes, allowed_grant_types,
  require_pkce, token_endpoint_auth_method, is_active
)
VALUES (
  'nvwax-dev-client',
  NULL,
  'Local Development Client',
  ARRAY['http://localhost:3000/callback', 'http://127.0.0.1:3000/callback'],
  ARRAY['openid','profile','email'],
  ARRAY['authorization_code','refresh_token'],
  TRUE,
  'none',
  TRUE
)
ON CONFLICT (client_id) DO NOTHING;

-- 5. updated_at 自动维护
CREATE OR REPLACE FUNCTION update_oidc_clients_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_oidc_clients_updated_at ON oidc_clients;
CREATE TRIGGER trg_oidc_clients_updated_at BEFORE UPDATE ON oidc_clients
  FOR EACH ROW EXECUTE FUNCTION update_oidc_clients_timestamp();

-- ============================================
-- 注释
-- ============================================
COMMENT ON TABLE oidc_clients IS 'OIDC Relying Party 客户端注册表（RP）';
COMMENT ON TABLE oidc_authorization_codes IS '授权码（一次性，PKCE 关联，10 分钟过期）';
COMMENT ON TABLE oidc_refresh_tokens IS '刷新令牌（不透明 token，30 天过期，强制链式轮换）';

COMMIT;
