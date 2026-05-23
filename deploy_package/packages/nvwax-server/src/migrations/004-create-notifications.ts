/**
 * 通知系统数据库迁移
 * 创建 notifications 表和相关索引
 */

import { Pool } from 'pg';

export async function createNotificationsTable(pool: Pool): Promise<void> {
  console.log('Creating notifications table...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      data JSONB DEFAULT '{}',
      is_read BOOLEAN DEFAULT FALSE,
      priority VARCHAR(20) DEFAULT 'normal',
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      CONSTRAINT fk_notifications_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
    );
    
    -- 索引优化
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
    CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
    
    -- 复合索引：未读通知查询
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
      ON notifications(user_id, is_read) 
      WHERE is_read = FALSE;
  `);
  
  console.log('✅ Notifications table created successfully');
}

export async function dropNotificationsTable(pool: Pool): Promise<void> {
  console.log('Dropping notifications table...');
  
  await pool.query('DROP TABLE IF EXISTS notifications CASCADE');
  
  console.log('✅ Notifications table dropped successfully');
}
