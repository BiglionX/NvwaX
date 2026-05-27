-- Token Quota & Billing System Migration
-- 用户每月免费100万token，超出按10元/百万token计费

-- 1. 用户Token配额表 - 存储每月配额和使用量
CREATE TABLE IF NOT EXISTS user_token_quotas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monthly_limit INTEGER NOT NULL DEFAULT 1000000, -- 每月免费额度，默认100万token
  used_this_month INTEGER NOT NULL DEFAULT 0, -- 本月已使用量
  total_used INTEGER NOT NULL DEFAULT 0, -- 累计总使用量
  overage_tokens INTEGER NOT NULL DEFAULT 0, -- 累计超额token数
  overage_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- 累计超额费用(元)
  last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 上次重置时间
  reset_day INTEGER NOT NULL DEFAULT 1, -- 每月重置日(1-28)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_token_quotas_user_id ON user_token_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_token_quotas_reset ON user_token_quotas(last_reset_at);

-- 2. Token消费明细表 - 记录每次token消耗的来源
CREATE TABLE IF NOT EXISTS token_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quota_id TEXT REFERENCES user_token_quotas(id) ON DELETE SET NULL,
  tokens_consumed INTEGER NOT NULL DEFAULT 0, -- 本次消耗token数
  is_overage BOOLEAN NOT NULL DEFAULT false, -- 是否为超额消费
  overage_cost DECIMAL(10, 4) NOT NULL DEFAULT 0.0000, -- 本次超额费用(元)
  endpoint TEXT, -- 消耗来源端点，如 '/v1/chat/completions'
  source_type TEXT NOT NULL DEFAULT 'api_call', -- 消耗类型: api_call, agent, workflow, etc.
  description TEXT, -- 描述信息
  model TEXT, -- 使用的模型
  metadata JSONB DEFAULT '{}'::jsonb, -- 额外元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_token_tx_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_tx_created_at ON token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_tx_source_type ON token_transactions(source_type);
CREATE INDEX IF NOT EXISTS idx_token_tx_endpoint ON token_transactions(endpoint);
CREATE INDEX IF NOT EXISTS idx_token_tx_user_month ON token_transactions(user_id, created_at DESC);

-- 注释
COMMENT ON TABLE user_token_quotas IS '用户每月Token配额和消耗记录，默认100万/月免费';
COMMENT ON TABLE token_transactions IS 'Token消耗明细，记录每次消耗的来源和数量';

-- 触发更新 updated_at
CREATE OR REPLACE FUNCTION update_token_quota_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_token_quotas_updated_at BEFORE UPDATE ON user_token_quotas
  FOR EACH ROW EXECUTE FUNCTION update_token_quota_timestamp();
