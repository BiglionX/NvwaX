/**
 * 通知服务
 * 
 * 管理用户通知的 CRUD 操作和业务逻辑
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
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
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
}

export class NotificationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 创建通知
   */
  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const notificationId = uuidv4();
    
    const result = await this.pool.query(
      `INSERT INTO notifications (
        id, user_id, type, title, message, data, priority, expires_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        notificationId,
        input.userId,
        input.type,
        input.title,
        input.message,
        JSON.stringify(input.data || {}),
        input.priority || 'normal',
        input.expiresAt || null
      ]
    );

    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * 获取用户的通知列表
   */
  async getUserNotifications(userId: string, options?: {
    isRead?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ notifications: Notification[]; total: number }> {
    const { isRead, type, page = 1, limit = 20 } = options || {};
    
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

    // 过滤已过期的通知
    conditions.push('(expires_at IS NULL OR expires_at > NOW())');

    const whereClause = conditions.join(' AND ');

    // 查询总数
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM notifications WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 查询数据
    const offset = (page - 1) * limit;
    const dataResult = await this.pool.query(
      `SELECT * FROM notifications WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const notifications = dataResult.rows.map(row => this.mapRowToNotification(row));

    return { notifications, total };
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );
    
    return parseInt(result.rows[0].count);
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const result = await this.pool.query(
      `UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('NOTIFICATION_NOT_FOUND: 通知不存在或无权访问');
    }

    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * 批量标记所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE notifications SET is_read = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('NOTIFICATION_NOT_FOUND: 通知不存在或无权访问');
    }
  }

  /**
   * 清理过期通知
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM notifications WHERE expires_at IS NOT NULL AND expires_at < NOW()`
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
