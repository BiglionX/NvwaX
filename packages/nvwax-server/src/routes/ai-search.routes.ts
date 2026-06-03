import { Router } from 'express';
import { aiSearchController } from '../controllers/ai-search.controller.js';
import { userAuthMiddleware } from '../middleware/user-auth.middleware.js';

const router = Router();

// 创建新的搜索会话
router.post('/sessions', userAuthMiddleware, aiSearchController.createSession.bind(aiSearchController));

// 发送消息进行对话式搜索
router.post('/chat', userAuthMiddleware, aiSearchController.chat.bind(aiSearchController));

// 获取会话详情
router.get('/sessions/:sessionId', userAuthMiddleware, aiSearchController.getSession.bind(aiSearchController));

export default router;
