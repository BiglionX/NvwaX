import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// 公开路由（不需要认证）
router.post('/login', adminController.login);

// 需要认证的路由
router.use(authMiddleware);

// 管理员信息
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);
router.post('/change-password', adminController.changePassword);

// 管理员管理（超级管理员功能）
router.get('/admins', adminController.getAllAdmins);
router.post('/admins', adminController.createAdmin);
router.delete('/admins/:id', adminController.deleteAdmin);

// 用户管理
router.get('/users', adminController.getUserList);
router.get('/users/stats', adminController.getUserStats);
router.post('/users/:id/ban', adminController.banUser);
router.post('/users/:id/unban', adminController.unbanUser);

// 项目管理
router.get('/projects', adminController.getProjectList);
router.get('/projects/stats', adminController.getProjectStats);
router.post('/projects/:id/review', adminController.reviewProject);
router.post('/projects/:id/suspend', adminController.suspendProject);
router.post('/projects/:id/restore', adminController.restoreProject);

// 系统管理
router.get('/system/stats', adminController.getSystemStats);
router.get('/system/logs', adminController.getSystemLogs);
router.get('/system/health', adminController.getSystemHealth);
router.post('/system/clear-cache', adminController.clearCache);
router.post('/system/backup', adminController.backupDatabase);

// 爬虫管理
router.get('/crawler/status', adminController.getCrawlerStatus);
router.post('/crawler/trigger', adminController.triggerCrawler);
router.put('/crawler/config', adminController.updateCrawlerConfig);
router.get('/crawler/history', adminController.getCrawlerHistory);
router.post('/crawler/clean', adminController.cleanOldAgents);

// AI 业务管理
router.get('/agents', adminController.getAgentList);
router.get('/virtual-companies/builds', adminController.getVirtualCompanyBuilds);

// 通知管理
router.post('/notifications/announce', adminController.sendSystemAnnouncement);

// Token 配额管理
router.get('/tokens/overview', adminController.getTokenOverview);
router.get('/tokens/users', adminController.getTokenUsersList);
router.get('/tokens/users/:userId', adminController.getTokenUserDetail);
router.get('/tokens/consumption-breakdown', adminController.getTokenConsumptionBreakdown);
router.post('/tokens/reset-monthly', adminController.resetMonthlyQuotas);

// 支付配置管理
router.get('/payment-configs', adminController.getPaymentConfigs);
router.post('/payment-configs', adminController.savePaymentConfig);
router.post('/payment-configs/:provider/toggle', adminController.togglePaymentConfig);

// Token订单管理
router.get('/token-orders', adminController.getTokenOrders);
router.post('/token-orders/:id/confirm', adminController.confirmTokenOrder);
router.post('/token-orders/:id/cancel', adminController.cancelTokenOrder);

export default router;
