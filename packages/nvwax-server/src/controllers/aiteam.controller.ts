/**
 * AiTeam 控制器
 * 
 * 处理 AI 团队相关的 HTTP 请求
 */

import { Request, Response } from 'express';
import { AiTeamService } from '../services/aiteam.service.js';
import { ExportService } from '../services/export.service.js';
import { NvwaLeaderService } from '../services/nvwa-leader.service.js';
import { databaseService } from '../services/database.service.js';

const aiteamService = new AiTeamService(databaseService.getPool());
const exportService = new ExportService(databaseService.getPool());
const nvwaLeaderService = new NvwaLeaderService(databaseService.getPool());

/**
 * 创建 AiTeam
 */
export const createAiTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { name, description, members, workflow, triggers, category, tags } = req.body;

    // 验证必填字段
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'AiTeam 名称不能为空'
        }
      });
      return;
    }

    const aiteam = await aiteamService.createAiTeam({
      name: name.trim(),
      description,
      members,
      workflow,
      triggers,
      category,
      tags,
      userId
    });

    res.status(201).json({
      success: true,
      data: aiteam
    });
  } catch (error: any) {
    console.error('Create aiteam error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '创建 AiTeam 失败'
      }
    });
  }
};

/**
 * 获取用户的 AiTeam 列表
 */
export const getUserAiTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { status, page = 1, limit = 20 } = req.query;

    const result = await aiteamService.getAiTeamsByUserId(userId, {
      publishStatus: status as string | undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Get user aiteams error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取 AiTeam 列表失败'
      }
    });
  }
};

/**
 * 获取 AiTeam 详情
 */
export const getAiTeamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const aiteamId = Array.isArray(id) ? id[0] : id;
    const aiteamUserId = userId || '';

    const aiteam = await aiteamService.getAiTeamById(aiteamId, aiteamUserId);

    if (!aiteam) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AITEAM_NOT_FOUND',
          message: 'AiTeam 不存在或无权访问'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: aiteam
    });
  } catch (error: any) {
    console.error('Get aiteam by ID error:', error);
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
 * 更新 AiTeam
 */
export const updateAiTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { id } = req.params;
    const aiteamId = Array.isArray(id) ? id[0] : id;
    const updateData = req.body;

    const aiteam = await aiteamService.updateAiTeam(aiteamId, userId, updateData);

    res.json({
      success: true,
      data: aiteam
    });
  } catch (error: any) {
    console.error('Update aiteam error:', error);
    
    if (error.message.includes('AITEAM_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AITEAM_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新 AiTeam 失败'
      }
    });
  }
};

/**
 * 删除 AiTeam
 */
export const deleteAiTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { id } = req.params;
    const aiteamId = Array.isArray(id) ? id[0] : id;

    await aiteamService.deleteAiTeam(aiteamId, userId);

    res.json({
      success: true,
      message: 'AiTeam 已删除'
    });
  } catch (error: any) {
    console.error('Delete aiteam error:', error);
    
    if (error.message.includes('AITEAM_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AITEAM_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除 AiTeam 失败'
      }
    });
  }
};

/**
 * 添加成员到 AiTeam
 */
export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { id } = req.params;
    const aiteamId = Array.isArray(id) ? id[0] : id;
    const { agentId, role, responsibilities, config } = req.body;

    if (!agentId || !role) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'agentId 和 role 是必填字段'
        }
      });
      return;
    }

    const aiteam = await aiteamService.addMember(aiteamId, userId, {
      agentId,
      role,
      responsibilities,
      config
    });

    res.json({
      success: true,
      data: aiteam,
      message: '成员添加成功'
    });
  } catch (error: any) {
    console.error('Add member error:', error);
    
    if (error.message.includes('AITEAM_NOT_FOUND') || error.message.includes('AGENT_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '添加成员失败'
      }
    });
  }
};

/**
 * 从 AiTeam 移除成员
 */
export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { id, agentId } = req.params;
    const aiteamId = Array.isArray(id) ? id[0] : id;
    const memberId = Array.isArray(agentId) ? agentId[0] : agentId;

    const aiteam = await aiteamService.removeMember(aiteamId, userId, memberId);

    res.json({
      success: true,
      data: aiteam,
      message: '成员移除成功'
    });
  } catch (error: any) {
    console.error('Remove member error:', error);
    
    if (error.message.includes('AITEAM_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AITEAM_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '移除成员失败'
      }
    });
  }
};

/**
 * 更新成员角色
 */
export const updateMemberRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { id, agentId } = req.params;
    const aiteamId = Array.isArray(id) ? id[0] : id;
    const memberId = Array.isArray(agentId) ? agentId[0] : agentId;
    const { role, responsibilities, config } = req.body;

    const aiteam = await aiteamService.updateMemberRole(aiteamId, userId, memberId, {
      role,
      responsibilities,
      config
    });

    res.json({
      success: true,
      data: aiteam,
      message: '成员角色更新成功'
    });
  } catch (error: any) {
    console.error('Update member role error:', error);
    
    if (error.message.includes('AITEAM_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AITEAM_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新成员角色失败'
      }
    });
  }
};

/**
 * 发布 AiTeam 到市场
 */
export const publishAiTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { id } = req.params;
    const aiteamId = Array.isArray(id) ? id[0] : id;

    const aiteam = await aiteamService.publishAiTeam(aiteamId, userId);

    res.json({
      success: true,
      data: aiteam,
      message: 'AiTeam 已发布到市场'
    });
  } catch (error: any) {
    console.error('Publish aiteam error:', error);
    
    if (error.message.includes('AITEAM_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AITEAM_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '发布 AiTeam 失败'
      }
    });
  }
};

/**
 * 取消发布 AiTeam
 */
export const unpublishAiTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { id } = req.params;
    const aiteamId = Array.isArray(id) ? id[0] : id;

    const aiteam = await aiteamService.unpublishAiTeam(aiteamId, userId);

    res.json({
      success: true,
      data: aiteam,
      message: 'AiTeam 已取消发布'
    });
  } catch (error: any) {
    console.error('Unpublish aiteam error:', error);
    
    if (error.message.includes('AITEAM_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AITEAM_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '取消发布失败'
      }
    });
  }
};

/**
 * 搜索公开市场的 AiTeam
 */
export const searchPublishedAiTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category, tags, page = 1, limit = 20 } = req.query;

    const result = await aiteamService.searchPublishedAiTeams({
      query: q as string | undefined,
      category: category as string | undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Search published aiteams error:', error);
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
 * 推荐相似的 AiTeam
 */
export const recommendAiTeams = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '查询参数 q 不能为空'
        }
      });
      return;
    }

    const result = await aiteamService.recommendAiTeams({
      query: q as string,
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Recommend aiteams error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '推荐 AiTeam 失败'
      }
    });
  }
};

/**
 * 根据需求描述自动生成 AiTeam
 * POST /api/aiteams/generate-from-query
 * Body: { query: string }
 */
export const generateAiTeamFromQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;

    if (!query) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '查询参数 query 不能为空'
        }
      });
      return;
    }

    // 复用 NvwaLeaderService 生成团队配置
    const teamConfig = await nvwaLeaderService.generateTeamFromNvwa({
      description: query,
      dataSources: [],
      outputs: [],
      implementation: '',
      skills: []
    }, false); // isAiTeam = false, 生成普通团队

    // 映射为 AiTeam 预览结构
    const preview = {
      name: teamConfig.teamName || `${query.substring(0, 15)}团队`,
      description: teamConfig.teamDescription || `专注于${query}的 AI 团队`,
      category: teamConfig.category || 'general',
      tags: teamConfig.tags || [],
      members: (teamConfig.roles || []).map((role: any) => ({
        role: role.roleName || role.role || '成员',
        responsibilities: role.description || role.responsibilities?.[0] || ''
      })),
      workflow: teamConfig.workflow || { steps: [] }
    };

    res.json({
      success: true,
      data: preview
    });
  } catch (error: any) {
    console.error('Generate aiteam from query error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '生成 AiTeam 失败'
      }
    });
  }
};

/**
 * 获取用户统计信息
 */
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const stats = await aiteamService.getUserStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取统计信息失败'
      }
    });
  }
};

/**
 * 导出 AiTeam
 */
export const exportAiTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权，请先登录'
        }
      });
      return;
    }

    const { id } = req.params;
    const aiteamId = Array.isArray(id) ? id[0] : id;
    const { format = 'json', includeMetadata = true } = req.body;

    // 验证格式
    if (!['json', 'yaml', 'proclaw'].includes(format)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '不支持的导出格式，请使用 json、yaml 或 proclaw'
        }
      });
      return;
    }

    const result = await exportService.exportAiTeam(aiteamId, userId, {
      format: format as 'json' | 'yaml' | 'proclaw',
      includeMetadata
    });

    res.json({
      success: true,
      data: result,
      message: '导出成功'
    });
  } catch (error: any) {
    console.error('Export aiteam error:', error);
    
    if (error.message.includes('AITEAM_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AITEAM_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '导出 AiTeam 失败'
      }
    });
  }
};
