import { Router } from 'express';
import { microbizController } from '../controllers/microbiz.controller.js';
import { userAuthMiddleware } from '../middleware/user-auth.middleware.js';

const router = Router();

// MicroBiz 团队路由
router.get('/teams', microbizController.getTeams.bind(microbizController));
router.get('/teams/:id', microbizController.getTeamById.bind(microbizController));
router.get('/teams/:id/agents', microbizController.getTeamAgents.bind(microbizController));

// MicroBiz Agent 路由
router.get('/agents', microbizController.getAllAgents.bind(microbizController));

// MicroBiz 安装管理（需要登录）
router.post('/install', userAuthMiddleware, microbizController.install.bind(microbizController));
router.get('/installations', userAuthMiddleware, microbizController.getInstallation.bind(microbizController));
router.put('/installations/bindings', userAuthMiddleware, microbizController.updateBindings.bind(microbizController));
router.put('/installations/preferences', userAuthMiddleware, microbizController.updatePreferences.bind(microbizController));
router.put('/installations/status', userAuthMiddleware, microbizController.updateStatus.bind(microbizController));

// MicroBiz Webhook 路由（无需登录，使用签名验证）
router.post('/webhooks/:platform', microbizController.handleWebhook.bind(microbizController));
router.get('/webhooks/events', microbizController.getWebhookEvents.bind(microbizController));

export default router;
