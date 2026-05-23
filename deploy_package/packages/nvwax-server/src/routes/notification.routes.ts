import { Router } from 'express';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notification.controller.js';
import { universalAuthMiddleware } from '../middleware/universal-auth.middleware.js';

const router = Router();

// 所有路由都需要认证（用户或管理员）
router.use(universalAuthMiddleware);

// 通知路由
router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;
