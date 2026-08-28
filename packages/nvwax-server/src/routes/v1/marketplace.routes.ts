import { Router } from 'express';
import {
  searchAgents,
  getAgentById,
  getAgentReviews,
  getCategories,
  searchAiTeams,
  getAiTeamById,
  getIndustries,
  getPluginDetail
} from '../../controllers/v1/marketplace.controller.js';
import { requirePermission } from '../../middleware/api-key-auth.middleware.js';

const router = Router();

// Agent 广场 - 只需 marketplace:read 权限
router.get('/agents', requirePermission('marketplace:read'), searchAgents);
router.get('/agents/:id', requirePermission('marketplace:read'), getAgentById);
// v1.5.1 (Sprint 2.18+)：Agent 评论分页（agent_reviews 表不存在时返回空 reviews）
router.get('/agents/:id/reviews', requirePermission('marketplace:read'), getAgentReviews);
router.get('/categories', requirePermission('marketplace:read'), getCategories);

// AiTeam 广场
router.get('/aiteams', requirePermission('marketplace:read'), searchAiTeams);
router.get('/aiteams/:id', requirePermission('marketplace:read'), getAiTeamById);

// 行业插件
router.get('/industries', requirePermission('marketplace:read'), getIndustries);
router.get('/plugins/:id', requirePermission('marketplace:read'), getPluginDetail);

export default router;
