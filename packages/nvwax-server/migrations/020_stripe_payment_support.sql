-- Stripe Payment Support Migration
-- 为 token_orders 表添加 Stripe 支持字段

-- 添加 stripe_session_id 字段（用于 Stripe Checkout Session 关联）
ALTER TABLE token_orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_token_orders_stripe_session ON token_orders(stripe_session_id);
