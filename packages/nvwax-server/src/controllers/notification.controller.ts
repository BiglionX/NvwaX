/**
 * 通知控制器
 * 
 * 处理通知相关的 HTTP 请求
 */

import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { databaseService } from '../services/database.service.js';

const notificationService = new NotificationService(databaseService.getPool());

/**
 * 获取用户的通知列表
 */
export const getUserNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { isRead, type, page = 1, limit = 20 } = req.query;

    const result = await notificationService.getUserNotifications(userId, {
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      type: type as string | undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取通知列表失败'
      }
    });
  }
};

/**
 * 获取未读通知数量
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取未读数量失败'
      }
    });
  }
};

/**
 * 标记通知为已读
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { id } = req.params;
    const notificationId = Array.isArray(id) ? id[0] : id;

    const notification = await notificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      data: notification
    });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    
    if (error.message.includes('NOTIFICATION_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '标记已读失败'
      }
    });
  }
};

/**
 * 批量标记所有通知为已读
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: '所有通知已标记为已读'
    });
  } catch (error: any) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '批量标记已读失败'
      }
    });
  }
};

/**
 * 删除通知
 */
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { id } = req.params;
    const notificationId = Array.isArray(id) ? id[0] : id;

    await notificationService.deleteNotification(notificationId, userId);

    res.json({
      success: true,
      message: '通知已删除'
    });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    
    if (error.message.includes('NOTIFICATION_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除通知失败'
      }
    });
  }
};
