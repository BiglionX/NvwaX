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
 *
 * v1.5.1 (Sprint 2.18+)：扩展返回 author / usageCount / relatedAgents 字段
 * 以支持 NvWaX Web marketplace 详情页（4 个页面 + Web Component 详情视图）。
 * 单个补充查询失败不影响主返回（try/catch 包裹）。
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

    // v1.5.1：补 author / usageCount / relatedAgents 字段（容错）
    let author: { id: string; name: string } | null = null;
    let usageCount = 0;
    let relatedAgents: any[] = [];

    try {
      const authorRes = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [agent.userId]
      );
      const row = authorRes.rows[0];
      author = row
        ? { id: row.id, name: row.name || (row.email ? String(row.email).split('@')[0] : 'Anonymous') }
        : null;
    } catch (e) {
      console.warn('[v1] getAgentById author query failed:', e);
    }

    try {
      // industry_agents 是公开关联表，无则跳过
      const usageRes = await pool.query(
        'SELECT COUNT(*)::int as cnt FROM industry_agents WHERE agent_id = $1',
        [agentId]
      );
      usageCount = usageRes.rows[0]?.cnt ?? 0;
    } catch (e) {
      // 表不存在时静默忽略
    }

    try {
      const relatedRes = await pool.query(
        `SELECT id, name, description, thumbnail_url
         FROM agents
         WHERE publish_status = 'published'
           AND category = $1
           AND id != $2
         ORDER BY rating DESC NULLS LAST, download_count DESC NULLS LAST
         LIMIT 5`,
        [agent.category ?? '', agentId]
      );
      relatedAgents = relatedRes.rows;
    } catch (e) {
      console.warn('[v1] getAgentById relatedAgents query failed:', e);
    }

    res.json({
      success: true,
      data: {
        ...agent,
        author,
        usageCount,
        relatedAgents
      }
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
 *
 * v1.5.1 (Sprint 2.18+)：扩展返回 author / agents / memberCount / skillCount / relatedTeams
 * 以支持 NvWaX Web marketplace AiTeam 详情页。
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

    // v1.5.1：补 author / agents / memberCount / skillCount / relatedTeams
    let author: { id: string; name: string } | null = null;
    let agents: any[] = [];
    let relatedTeams: any[] = [];

    try {
      const authorRes = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [aiteam.userId]
      );
      const row = authorRes.rows[0];
      author = row
        ? { id: row.id, name: row.name || (row.email ? String(row.email).split('@')[0] : 'Anonymous') }
        : null;
    } catch (e) {
      console.warn('[v1] getAiTeamById author query failed:', e);
    }

    // 从已有 members 数组里提取 agent_id，去重查 agent 详情
    // 防御：m 可能是 null / undefined（如导入路径残留的脏数据）
    const memberIds: string[] = Array.isArray((aiteam as any).members)
      ? Array.from(
          new Set(
            (aiteam as any).members
              .filter((m: any) => m && typeof m === 'object')
              .map((m: any) => m.agentId || m.agent_id)
              .filter((id: any) => typeof id === 'string' && id.length > 0)
          )
        )
      : [];

    if (memberIds.length > 0) {
      try {
        // 用 ANY($1) 把数组转成 PG 参数
        const agentsRes = await pool.query(
          `SELECT id, name, description, category, thumbnail_url, rating
           FROM agents
           WHERE id = ANY($1::text[])`,
          [memberIds]
        );
        agents = agentsRes.rows;
      } catch (e) {
        console.warn('[v1] getAiTeamById agents query failed:', e);
      }
    }

    const memberCount = Array.isArray((aiteam as any).members)
      ? (aiteam as any).members.length
      : 0;
    // skillCount 暂用 skills 字段；当前 AiTeam 模型未暴露，回退 0
    const skillCount = Array.isArray((aiteam as any).skills)
      ? (aiteam as any).skills.length
      : 0;

    try {
      const relatedRes = await pool.query(
        `SELECT id, name, description, thumbnail_url
         FROM aiteams
         WHERE publish_status = 'published'
           AND category = $1
           AND id != $2
         ORDER BY rating DESC NULLS LAST, download_count DESC NULLS LAST
         LIMIT 5`,
        [aiteam.category ?? '', aiteamId]
      );
      relatedTeams = relatedRes.rows;
    } catch (e) {
      console.warn('[v1] getAiTeamById relatedTeams query failed:', e);
    }

    res.json({
      success: true,
      data: {
        ...aiteam,
        author,
        agents,
        memberCount,
        skillCount,
        relatedTeams
      }
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
 *
 * v1.5.1 (Sprint 2.18+)：补 author / usageCount 字段
 * 以支持 NvWaX Web marketplace Industry Plugin 详情页。
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

    // v1.5.1：补 author / usageCount
    let author: { id: string; name: string } | null = null;
    let usageCount = 0;

    const tsUserId = (teamSkill as any).userId ?? (teamSkill as any).user_id ?? (teamSkill as any).author_id;
    if (tsUserId) {
      try {
        const authorRes = await pool.query(
          'SELECT id, name, email FROM users WHERE id = $1',
          [tsUserId]
        );
        const row = authorRes.rows[0];
        author = row
          ? { id: row.id, name: row.name || (row.email ? String(row.email).split('@')[0] : 'Anonymous') }
          : null;
      } catch (e) {
        console.warn('[v1] getPluginDetail author query failed:', e);
      }
    }

    try {
      // industry_agents 是公开关联表，无则跳过
      const usageRes = await pool.query(
        'SELECT COUNT(*)::int as cnt FROM industry_agents WHERE team_skill_id = $1',
        [pluginId]
      );
      usageCount = usageRes.rows[0]?.cnt ?? 0;
    } catch (e) {
      // 表不存在静默
    }

    res.json({
      success: true,
      data: {
        ...teamSkill,
        agents,
        author,
        usageCount
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

/**
 * GET /api/v1/marketplace/agents/:id/reviews
 * 获取 Agent 评论分页（v1.5.1 Sprint 2.18+）
 *
 * 容错：agent_reviews 表不存在时返回空 reviews（前端按空状态渲染）。
 * 表 schema 计划在 v1.6.0 引入。
 */
export const getAgentReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const agentId = Array.isArray(id) ? id[0] : id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // 先检查 reviews 表是否存在
    const tableCheck = await pool.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name = 'agent_reviews'
       ) as exists`
    );

    if (!tableCheck.rows[0]?.exists) {
      res.json({
        success: true,
        data: { reviews: [], total: 0, page, limit }
      });
      return;
    }

    const offset = (page - 1) * limit;
    const reviewsResult = await pool.query(
      `SELECT id, agent_id, user_id, rating, content, created_at
       FROM agent_reviews
       WHERE agent_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [agentId, limit, offset]
    );

    const totalResult = await pool.query(
      'SELECT COUNT(*)::int as cnt FROM agent_reviews WHERE agent_id = $1',
      [agentId]
    );

    res.json({
      success: true,
      data: {
        reviews: reviewsResult.rows,
        total: totalResult.rows[0]?.cnt ?? 0,
        page,
        limit
      }
    });
  } catch (error: any) {
    console.error('[v1] Get agent reviews error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取 Agent 评论失败'
      }
    });
  }
};
