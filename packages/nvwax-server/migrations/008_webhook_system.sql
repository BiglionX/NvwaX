-- Migration: 008_webhook_system.sql
-- Description: Create webhook subscription and event tables for async notifications

BEGIN;

-- Webhook subscriptions table
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique subscription per event type and URL
  UNIQUE(tenant_id, event_type, url),
  
  -- Index for fast lookup by tenant and event type
  INDEX idx_webhook_sub_tenant_event ON webhook_subscriptions(tenant_id, event_type),
  INDEX idx_webhook_sub_active ON webhook_subscriptions(is_active)
);

-- Webhook events table (delivery log)
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for querying events
  INDEX idx_webhook_events_tenant ON webhook_events(tenant_id),
  INDEX idx_webhook_events_status ON webhook_events(status),
  INDEX idx_webhook_events_created ON webhook_events(created_at DESC),
  INDEX idx_webhook_events_type ON webhook_events(event_type)
);

-- Add comments
COMMENT ON TABLE webhook_subscriptions IS 'Webhook subscription configurations for tenants';
COMMENT ON TABLE webhook_events IS 'Log of webhook delivery attempts';

COMMENT ON COLUMN webhook_subscriptions.event_type IS 'Event type to subscribe to (e.g., chat.completed, api_key.created)';
COMMENT ON COLUMN webhook_subscriptions.url IS 'URL to send webhook POST requests to';
COMMENT ON COLUMN webhook_subscriptions.secret IS 'Secret key for signing webhook payloads (HMAC-SHA256)';

COMMENT ON COLUMN webhook_events.payload IS 'Event data sent in the webhook';
COMMENT ON COLUMN webhook_events.status IS 'Delivery status: pending, delivered, or failed';
COMMENT ON COLUMN webhook_events.attempts IS 'Number of delivery attempts made';

-- Function to clean up old webhook events (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_events
  WHERE created_at < NOW() - INTERVAL '30 days'
  RETURNING COUNT(*) INTO deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_subscriptions TO nvwax_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_events TO nvwax_app;

COMMIT;
