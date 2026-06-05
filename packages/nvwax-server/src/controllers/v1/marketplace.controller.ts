/**
 * V1 Marketplace Controller
 *
 * 公开 API - Agent/AiTeam 市场浏览与搜索
 * 使用 API Key 认证，读取 req.apiKey.user_id
 */

import { Request, Response } from 'express';
import { AgentService } from '../../services/agent.service.js';
import { AiTeamService } from '../../services/aiteam.service.js';
import { TeamSkillService } from '../../services/team-skill.service.js';
import { databaseService } from '../../services/database.service.js';

const pool = databaseService.getPool();
const agentService = new AgentService(pool);
const aiteamService = new AiTeamService(pool);
const teamSkillService = new TeamSkillService(pool);

/**
 * GET /api/v1/marketplace/agents
 * 搜索已发布的 Agent
 */
export const searchAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category, tags, page = 1, limit = 20, sort_by = 'popular' } = req.query;

    const result = await agentService.searchPublishedAgents({
      query: q as string | undefined,
      category: category as string | undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      page: parseInt(page as string),
      limit: Math.min(parseInt(limit as string), 50)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[v1] Search agents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '搜索 Agent 失败'
      }
    });
  }
};

/**
 * GET /api/v1/marketplace/agents/:id
 * 获取已发布 Agent 详情
 */
export const getAgentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const agentId = Array.isArray(id) ? id[0] : id;

    // 获取 Agent 详情（不要求 userId，公开市场数据）
    const agent = await agentService.getAgentById(agentId, '');

    if (!agent) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Agent 不存在'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error: any) {
    console.error('[v1] Get agent by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取 Agent 详情失败'
      }
    });
  }
};

/**
 * GET /api/v1/marketplace/categories
 * 获取 Agent 分类列表
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*) as count FROM agents
       WHERE publish_status = 'published' AND category IS NOT NULL
       GROUP BY category ORDER BY count DESC`
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('[v1] Get categories error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取分类列表失败'
      }
    });
  }
};

/**
 * GET /api/v1/marketplace/aiteams
 * 搜索已发布的 AiTeam
 */
export const searchAiTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category, industry, tags, page = 1, limit = 20 } = req.query;

    // 如果指定了 industry，将其作为 category 进行筛选
    const filterCategory = (industry as string) || (category as string);

    const result = await aiteamService.searchPublishedAiTeams({
      query: q as string | undefined,
      category: filterCategory,
      tags: tags ? (tags as string).split(',') : undefined,
      page: parseInt(page as string),
      limit: Math.min(parseInt(limit as string), 50)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[v1] Search aiteams error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '搜索 AiTeam 失败'
      }
    });
  }
};

/**
 * GET /api/v1/marketplace/aiteams/:id
 * 获取已发布 AiTeam 详情
 */
export const getAiTeamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const aiteamId = Array.isArray(id) ? id[0] : id;

    const aiteam = await aiteamService.getAiTeamById(aiteamId, '');

    if (!aiteam) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'AiTeam 不存在'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: aiteam
    });
  } catch (error: any) {
    console.error('[v1] Get aiteam by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取 AiTeam 详情失败'
      }
    });
  }
};

/**
 * GET /api/v1/marketplace/industries
 * 获取行业分类列表
 */
export const getIndustries = async (req: Request, res: Response): Promise<void> => {
  try {
    const industries = await teamSkillService.getIndustryPluginCategories();
    res.json({
      success: true,
      data: industries
    });
  } catch (error: any) {
    console.error('[v1] Get industries error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取行业分类失败'
      }
    });
  }
};

/**
 * GET /api/v1/marketplace/plugins/:id
 * 获取行业插件详情
 */
export const getPluginDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pluginId = Array.isArray(id) ? id[0] : id;

    const teamSkill = await teamSkillService.getTeamSkillById(pluginId);
    if (!teamSkill) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '行业插件不存在'
        }
      });
      return;
    }

    // 获取该行业插件的 Agent 列表
    const agents = await teamSkillService.getIndustryAgents(pluginId);

    res.json({
      success: true,
      data: {
        ...teamSkill,
        agents
      }
    });
  } catch (error: any) {
    console.error('[v1] Get plugin detail error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取行业插件详情失败'
      }
    });
  }
};
