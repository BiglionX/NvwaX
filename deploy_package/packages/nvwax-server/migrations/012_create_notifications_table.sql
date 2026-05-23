-- ============================================
-- NvwaX 通知系统数据库迁移脚本
-- 版本: 1.0.0
-- 日期: 2026-05-15
-- 描述: 创建 notifications 表以支持站内通知系统
-- ============================================

-- ============================================
-- 1. 创建 notifications 表
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  priority VARCHAR(20) DEFAULT 'normal',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_notification_type CHECK (type IN (
    'bounty_claimed',
    'bounty_submitted',
    'bounty_verified',
    'bounty_completed',
    'bounty_cancelled',
    'agent_created',
    'agent_updated',
    'team_execution_started',
    'team_execution_completed',
    'system_announcement',
    'points_received',
    'skill_approved'
  )),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- 部分索引：快速查询未读通知
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, created_at DESC) 
  WHERE is_read = false;

-- ============================================
-- 2. 创建触发器（自动更新 updated_at）
-- ============================================

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. 添加注释
-- ============================================

COMMENT ON TABLE notifications IS '用户通知表，存储站内通知';
COMMENT ON COLUMN notifications.user_id IS '接收通知的用户ID';
COMMENT ON COLUMN notifications.type IS '通知类型（枚举）';
COMMENT ON COLUMN notifications.title IS '通知标题';
COMMENT ON COLUMN notifications.message IS '通知内容';
COMMENT ON COLUMN notifications.data IS '附加数据（JSON格式）';
COMMENT ON COLUMN notifications.is_read IS '是否已读';
COMMENT ON COLUMN notifications.priority IS '优先级：low, normal, high, urgent';
COMMENT ON COLUMN notifications.expires_at IS '过期时间（可选）';

-- ============================================
-- 4. 创建视图（简化常用查询）
-- ============================================

-- 用户未读通知视图
CREATE OR REPLACE VIEW user_unread_notifications AS
SELECT 
  n.*,
  u.name as user_name,
  u.email as user_email
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
WHERE n.is_read = false
ORDER BY n.created_at DESC;

-- ============================================
-- 迁移完成
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Notifications 表创建成功！';
  RAISE NOTICE '新增表: notifications';
  RAISE NOTICE '索引: 6个（user_id, is_read, created_at, type, priority, user_unread）';
  RAISE NOTICE '视图: user_unread_notifications';
  RAISE NOTICE '通知类型: 12种（悬赏、智能体、团队、系统等）';
END $$;
