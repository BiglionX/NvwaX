import { Router } from 'express';
import {
  createAgent,
  getUserAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  publishAgent,
  unpublishAgent,
  exportAgent
} from '../controllers/agent.controller.js';
import { userAuthMiddleware } from '../middleware/user-auth.middleware.js';

const router = Router();

// 所有路由都需要认证
router.use(userAuthMiddleware);

// Agent CRUD 路由
router.post('/', createAgent);
router.get('/', getUserAgents);
router.get('/:id', getAgentById);
router.put('/:id', updateAgent);
router.delete('/:id', deleteAgent);

// Agent 发布管理
router.post('/:id/publish', publishAgent);
router.post('/:id/unpublish', unpublishAgent);

// Agent 导出
router.post('/:id/export', exportAgent);

export default router;
