-- SDK Integration Migration
-- Creates tables for API key management, tenant isolation, and RBAC

-- 1. Tenants table - manages tenant information
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster tenant lookups
CREATE INDEX idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX idx_tenants_plan ON tenants(plan);

-- 2. API Keys table - stores developer credentials
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key_hash TEXT NOT NULL, -- Hashed API key (never store plain text)
  key_prefix TEXT NOT NULL, -- First 8 characters for identification (e.g., "nvwx_abc123")
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Human-readable name for the key
  permissions JSONB DEFAULT '["sdk:*"]'::jsonb, -- Array of permission strings
  rate_limit INTEGER DEFAULT 1000, -- Requests per hour
  expires_at TIMESTAMP, -- Optional expiration date
  last_used_at TIMESTAMP, -- Track when key was last used
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for API key operations
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE UNIQUE INDEX idx_api_keys_unique_active ON api_keys(key_hash) WHERE is_active = true;

-- 3. Roles table - RBAC role definitions
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'admin', 'developer', 'viewer'
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of permission strings
  is_system BOOLEAN DEFAULT false, -- System roles cannot be deleted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);

-- Index for role lookups
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);

-- 4. User Roles table - assigns roles to users within a tenant
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by TEXT REFERENCES users(id), -- Who assigned this role
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- Optional expiration for temporary roles
  UNIQUE(user_id, role_id)
);

-- Indexes for user role queries
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- 5. API Usage table - tracks API consumption for billing
CREATE TABLE IF NOT EXISTS api_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  api_key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL, -- e.g., '/v1/chat/completions'
  method TEXT NOT NULL DEFAULT 'POST',
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10, 4) DEFAULT 0.0000, -- Cost in USD or points
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'rate_limited')),
  response_time_ms INTEGER, -- Response time in milliseconds
  ip_address INET, -- Client IP for security monitoring
  user_agent TEXT, -- Client user agent
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (model, etc.)
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for usage analytics
CREATE INDEX idx_api_usage_tenant_id ON api_usage(tenant_id);
CREATE INDEX idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp DESC);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);

-- 6. Webhooks table - stores webhook configurations
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL, -- Webhook endpoint URL
  events JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of event types to subscribe
  secret TEXT NOT NULL, -- HMAC secret for signature verification
  is_active BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}'::jsonb, -- Custom headers to send
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for webhook management
CREATE INDEX idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- 7. Webhook Events table - tracks webhook delivery attempts
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- e.g., 'chat.completed', 'task.started'
  payload JSONB NOT NULL, -- Event payload
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  response_code INTEGER, -- HTTP response code from webhook endpoint
  response_body TEXT, -- Response from webhook endpoint (truncated)
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP, -- When to retry (exponential backoff)
  delivered_at TIMESTAMP, -- When successfully delivered
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for webhook event tracking
CREATE INDEX idx_webhook_events_webhook_id ON webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_next_retry ON webhook_events(next_retry_at) WHERE status = 'pending';

-- 8. Billing Plans table - defines subscription tiers
CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE, -- e.g., 'Free', 'Pro', 'Enterprise'
  description TEXT,
  monthly_quota INTEGER NOT NULL, -- Monthly API call limit
  overage_rate DECIMAL(10, 4) DEFAULT 0.0000, -- Cost per additional request
  features JSONB DEFAULT '[]'::jsonb, -- Array of feature flags
  price_monthly DECIMAL(10, 2) DEFAULT 0.00, -- Monthly price in USD
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default billing plans
INSERT INTO billing_plans (name, description, monthly_quota, overage_rate, features, price_monthly) VALUES
('free', 'Free tier for testing and small projects', 1000, 0.0010, '["basic_chat", "webhooks"]', 0.00),
('pro', 'Professional tier for growing businesses', 50000, 0.0005, '["basic_chat", "webhooks", "priority_support", "custom_models"]', 49.99),
('enterprise', 'Enterprise tier with unlimited usage', -1, 0.0003, '["basic_chat", "webhooks", "priority_support", "custom_models", "dedicated_infrastructure", "sla"]', 499.99)
ON CONFLICT (name) DO NOTHING;

-- 9. Add tenant_id to existing tables for data isolation
-- Note: This will be done in a separate migration to avoid locking issues

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_plans_updated_at BEFORE UPDATE ON billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for public marketplace data (cross-tenant access)
CREATE OR REPLACE VIEW public_team_skills AS
SELECT ts.*
FROM team_skills ts
JOIN tenants t ON ts.tenant_id = t.id
WHERE ts.is_public = true AND t.plan != 'free';

CREATE OR REPLACE VIEW public_agents AS
SELECT am.*
FROM agent_metadata am
JOIN tenants t ON am.tenant_id = t.id
WHERE am.is_public = true;

COMMENT ON TABLE tenants IS 'Manages tenant organizations and their subscription plans';
COMMENT ON TABLE api_keys IS 'Stores hashed API keys for developer authentication';
COMMENT ON TABLE roles IS 'Defines RBAC roles with specific permissions';
COMMENT ON TABLE user_roles IS 'Maps users to roles within a tenant';
COMMENT ON TABLE api_usage IS 'Tracks API consumption for billing and analytics';
COMMENT ON TABLE webhooks IS 'Configures webhook endpoints for event notifications';
COMMENT ON TABLE webhook_events IS 'Tracks webhook delivery attempts and status';
COMMENT ON TABLE billing_plans IS 'Defines subscription tiers and pricing';
