import { Router } from 'express';
import {
  createAiTeam,
  getUserAiTeams,
  getAiTeamById,
  updateAiTeam,
  deleteAiTeam,
  publishAiTeam,
  unpublishAiTeam,
  exportAiTeam
} from '../controllers/aiteam.controller.js';
import { userAuthMiddleware } from '../middleware/user-auth.middleware.js';

const router = Router();

// 所有路由都需要认证
router.use(userAuthMiddleware);

// AiTeam CRUD 路由
router.post('/', createAiTeam);
router.get('/', getUserAiTeams);
router.get('/:id', getAiTeamById);
router.put('/:id', updateAiTeam);
router.delete('/:id', deleteAiTeam);

// AiTeam 发布管理
router.post('/:id/publish', publishAiTeam);
router.post('/:id/unpublish', unpublishAiTeam);

// AiTeam 导出
router.post('/:id/export', exportAiTeam);

export default router;
