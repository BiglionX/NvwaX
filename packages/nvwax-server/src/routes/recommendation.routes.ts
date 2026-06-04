/**
 * Recommendation Routes
 * 
 * Agent/Skill 推荐相关 API 路由
 * 对应 PRD v2.0 章节 2.5.1
 * 
 * 基础路径: /v2/agents
 * 完整路径: /api/v2/agents/recommend
 */

import { Router } from 'express';
import { recommendationController } from '../controllers/recommendation.controller.js';

const router = Router();

/**
 * POST /api/v2/agents/recommend
 * 提交插件 ID，返回推荐的 Agent 列表
 * 对应 PRD 2.5.1
 */
router.post('/recommend', recommendationController.recommendAgents.bind(recommendationController));

/**
 * GET /api/v2/agents/recommend-skills
 * 根据行业标签推荐 Skills
 */
router.get('/recommend-skills', recommendationController.recommendSkills.bind(recommendationController));

export default router;
