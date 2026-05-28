import { Router } from 'express';
import { aiteamCreationController } from '../controllers/aiteam-creation.controller.js';
import { universalAuthMiddleware } from '../middleware/universal-auth.middleware.js';

const router = Router();

// 所有 AiTeam 创建路由都需要用户或管理员认证
router.use(universalAuthMiddleware);

// AiTeam 创建会话路由
router.post('/sessions', aiteamCreationController.createSession);
router.get('/sessions', aiteamCreationController.getUserSessions);
router.get('/sessions/:id', aiteamCreationController.getSession);
router.post('/sessions/:id/message', aiteamCreationController.sendMessage);
router.post('/sessions/:id/nvwax-match', aiteamCreationController.triggerNvwaXMatch);
router.post('/sessions/:id/confirm', aiteamCreationController.confirmAndSaveTeam);
router.post('/sessions/:id/publish-to-marketplace', aiteamCreationController.publishToMarketplace);
router.get('/sessions/:id/download', aiteamCreationController.downloadDocumentPackage);
router.post('/sessions/:id/integrate-proclaw', aiteamCreationController.integrateToProClaw);
router.put('/sessions/:id/requirements', aiteamCreationController.updateRequirements);
router.put('/sessions/:id/roles', aiteamCreationController.updateRoles);
router.get('/sessions/:id/progress', aiteamCreationController.getProgress);
router.delete('/sessions/:id', aiteamCreationController.deleteSession);

// Agent 复用决策路由
router.post('/sessions/:id/decide-agents', aiteamCreationController.decideAgents);
router.post('/sessions/:id/confirm-agent', aiteamCreationController.confirmAgentDecision);
router.get('/sessions/:id/agent-decisions', aiteamCreationController.getAgentDecisions);

// SSE 进度追踪路由
router.get('/sessions/:id/stream', aiteamCreationController.streamProgress);
router.post('/sessions/:id/broadcast', aiteamCreationController.broadcastProgress);

export default router;
