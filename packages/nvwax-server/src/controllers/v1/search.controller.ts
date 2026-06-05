/**
 * V1 Search Controller
 *
 * 公开 API - Agent 搜索、技能搜索、统一搜索
 * 使用 API Key 认证
 */

import { Request, Response } from 'express';
import { agentSearchService } from '../../services/agent-search.service.js';
import { skillHubService } from '../../services/skillhub.service.js';

/**
 * GET /api/v1/search/agents
 * 全网 Agent 搜索（GitHub / HuggingFace / 聚合搜索）
 */
export const searchAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, source = 'all', page = 1, limit = 20 } = req.query;
    const query = (q as string) || '';

    if (!query.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '搜索关键词不能为空' }
      });
      return;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 50);

    const result = await agentSearchService.searchAgents(query, pageNum, limitNum);

    res.json({
      success: true,
      data: {
        agents: result.data || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total || (Array.isArray(result) ? result.length : 0)
        }
      }
    });
  } catch (error: any) {
    console.error('[v1] Search agents error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '搜索 Agent 失败' }
    });
  }
};

/**
 * GET /api/v1/search/skills
 * SkillHub 技能搜索
 */
export const searchSkills = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const query = (q as string) || '';

    if (!query.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '搜索关键词不能为空' }
      });
      return;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 50);

    const result = await skillHubService.searchSkills(query, pageNum, limitNum);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[v1] Search skills error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '搜索技能失败' }
    });
  }
};

/**
 * POST /api/v1/search/unified
 * 统一搜索（Agents + Skills + AiTeams）
 */
export const unifiedSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, page = 1, limit = 20 } = req.body;
    const query = q || '';

    if (!query.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '搜索关键词不能为空' }
      });
      return;
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    const [agentsResult, skillsResult] = await Promise.all([
      agentSearchService.searchAgents(query, pageNum, Math.floor(limitNum / 2)),
      skillHubService.searchSkills(query, pageNum, Math.floor(limitNum / 2))
    ]);

    res.json({
      success: true,
      data: {
        agents: agentsResult,
        skills: skillsResult
      }
    });
  } catch (error: any) {
    console.error('[v1] Unified search error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '统一搜索失败' }
    });
  }
};
