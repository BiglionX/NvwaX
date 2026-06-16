-- ============================================
-- OIDC RP Clients Seed (Sprint 2)
-- 4 个 ProClaw RP 注册到 oidc_clients
-- 公网 redirect_uri 运维可后续在 DB 中追加；本地 dev 用 localhost
-- ============================================

BEGIN;

INSERT INTO oidc_clients (
  client_id, client_secret_hash, name,
  redirect_uris, allowed_scopes, allowed_grant_types,
  require_pkce, token_endpoint_auth_method, is_active
)
VALUES
  -- ProClaw Desktop (Electron) — 本地回环 + 桌面协议
  (
    'proclaw-desktop',
    NULL,
    'ProClaw Desktop (Electron)',
    ARRAY[
      'proclaw://oauth/callback',
      'http://localhost:7842/callback',
      'http://127.0.0.1:7842/callback'
    ],
    ARRAY['openid','profile','email'],
    ARRAY['authorization_code','refresh_token'],
    TRUE,
    'none',
    TRUE
  ),
  -- ProClaw Web (nvwax.proclaw.cc) — 主站
  (
    'proclaw-web',
    NULL,
    'ProClaw Web (nvwax.proclaw.cc)',
    ARRAY[
      'https://nvwax.proclaw.cc/oauth/callback',
      'https://www.nvwax.proclaw.cc/oauth/callback',
      'http://localhost:3000/oauth/callback'
    ],
    ARRAY['openid','profile','email'],
    ARRAY['authorization_code','refresh_token'],
    TRUE,
    'none',
    TRUE
  ),
  -- ProClaw Mobile (React Native) — 移动端 + 公网回调
  (
    'proclaw-mobile',
    NULL,
    'ProClaw Mobile (React Native)',
    ARRAY[
      'proclaw-mobile://oauth/callback',
      'https://proclaw-mobile.proclaw.cc/oauth/callback'
    ],
    ARRAY['openid','profile','email'],
    ARRAY['authorization_code','refresh_token'],
    TRUE,
    'none',
    TRUE
  ),
  -- SkillHub Web (skillhub.proclaw.cc) — 跨产品 SSO
  (
    'skillhub-web',
    NULL,
    'SkillHub Web (skillhub.proclaw.cc)',
    ARRAY[
      'https://skillhub.proclaw.cc/oauth/callback',
      'http://localhost:3001/oauth/callback'
    ],
    ARRAY['openid','profile','email'],
    ARRAY['authorization_code','refresh_token'],
    TRUE,
    'none',
    TRUE
  )
ON CONFLICT (client_id) DO NOTHING;

-- 注释：4 个 RP 均为 public client（token_endpoint_auth_method='none'），
-- 强 PKCE 是 Sprint 1 强制约束；client_secret 列保持 NULL。

COMMIT;
