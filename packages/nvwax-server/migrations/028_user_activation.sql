-- ============================================
-- User Activation Tokens (Sprint 2)
-- 一次性激活 token；24 小时过期
-- 用于注册 → 邮件 → 激活链路
-- ============================================

BEGIN;

-- 1. 为 users 加 is_active 列（默认 TRUE 兼容存量用户）
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;

-- 2. 一次性激活 token 表
CREATE TABLE IF NOT EXISTS user_activation_tokens (
  token        TEXT        PRIMARY KEY,                     -- 32-byte base64url
  user_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMP   NOT NULL,
  used_at      TIMESTAMP,                                   -- 首次使用即标记
  created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_activation_tokens_user_id
  ON user_activation_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activation_tokens_active
  ON user_activation_tokens(user_id)
  WHERE used_at IS NULL;

-- 注释
COMMENT ON TABLE user_activation_tokens IS '账户激活 token（一次性，24 小时过期）';

COMMIT;
