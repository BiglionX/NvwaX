import { Router } from 'express';
import { virtualCompanyCreationController } from '../controllers/virtual-company-creation.controller.js';
import { universalAuthMiddleware } from '../middleware/universal-auth.middleware.js';

const router = Router();

// 所有虚拟公司路由都需要用户或管理员认证
router.use(universalAuthMiddleware);

// 虚拟公司创建会话路由
router.post('/sessions', virtualCompanyCreationController.createSession);
router.get('/sessions', virtualCompanyCreationController.getUserSessions);
router.get('/sessions/:id', virtualCompanyCreationController.getSession);
router.post('/sessions/:id/message', virtualCompanyCreationController.sendMessage);
router.put('/sessions/:id/requirements', virtualCompanyCreationController.updateRequirements);
router.put('/sessions/:id/roles', virtualCompanyCreationController.updateRoles);
router.get('/sessions/:id/progress', virtualCompanyCreationController.getProgress);
router.delete('/sessions/:id', virtualCompanyCreationController.deleteSession);

// Agent 复用决策路由
router.post('/sessions/:id/decide-agents', virtualCompanyCreationController.decideAgents);
router.post('/sessions/:id/confirm-agent', virtualCompanyCreationController.confirmAgentDecision);
router.get('/sessions/:id/agent-decisions', virtualCompanyCreationController.getAgentDecisions);

// SSE 进度追踪路由
router.get('/sessions/:id/stream', virtualCompanyCreationController.streamProgress);
router.post('/sessions/:id/broadcast', virtualCompanyCreationController.broadcastProgress);

export default router;
