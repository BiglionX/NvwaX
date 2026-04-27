/**
 * 通知服务
 * 处理通知的创建、查询、标记已读等操作
 */

import { Pool } from 'pg';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
}

export class NotificationService {
  constructor(private pool: Pool) {}

  /**
   * 创建通知
   */
  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const { userId, type, title, message, data = {}, priority = 'normal', expiresAt } = input;
    
    const result = await this.pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data, priority, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, type, title, message, JSON.stringify(data), priority, expiresAt]
    );
    
    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * 获取用户通知列表
   */
  async getUserNotifications(userId: string, options: {
    isRead?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ notifications: Notification[]; total: number }> {
    const { isRead, type, page = 1, limit = 20 } = options;
    
    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;
    
    if (isRead !== undefined) {
      conditions.push(`is_read = $${paramIndex++}`);
      params.push(isRead);
    }
    
    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // 获取总数
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM notifications ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // 获取数据
    const offset = (page - 1) * limit;
    const result = await this.pool.query(
      `SELECT * FROM notifications 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );
    
    return {
      notifications: result.rows.map(row => this.mapRowToNotification(row)),
      total,
    };
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    
    return parseInt(result.rows[0].count);
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const result = await this.pool.query(
      `UPDATE notifications 
       SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('NOTIFICATION_NOT_FOUND');
    }
    
    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE notifications 
       SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
    
    if (result.rowCount === 0) {
      throw new Error('NOTIFICATION_NOT_FOUND');
    }
  }

  /**
   * 清理过期通知
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM notifications 
       WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP`
    );
    
    return result.rowCount || 0;
  }

  /**
   * 将数据库行映射为 Notification 对象
   */
  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: JSON.parse(row.data || '{}'),
      isRead: row.is_read,
      priority: row.priority,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
