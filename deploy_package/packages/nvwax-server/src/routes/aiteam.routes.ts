import { Router } from 'express';
import {
  createAiTeam,
  getUserAiTeams,
  getAiTeamById,
  updateAiTeam,
  deleteAiTeam,
  publishAiTeam,
  unpublishAiTeam,
  exportAiTeam,
  searchPublishedAiTeams,
  recommendAiTeams,
  generateAiTeamFromQuery
} from '../controllers/aiteam.controller.js';
import { userAuthMiddleware } from '../middleware/user-auth.middleware.js';

const router = Router();

// ========= 公开路由（无需认证） =========
// 搜索公开市场的 AiTeam
router.get('/search', searchPublishedAiTeams);
// 推荐相似的 AiTeam
router.get('/recommend', recommendAiTeams);
// AI 根据需求描述自动生成 AiTeam 预览
router.post('/generate-from-query', generateAiTeamFromQuery);

// ========= 需要认证的路由 =========
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
