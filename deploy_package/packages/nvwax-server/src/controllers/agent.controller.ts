/**
 * Agent 控制器
 * 
 * 处理智能体相关的 HTTP 请求
 */

import { Request, Response } from 'express';
import { AgentService } from '../services/agent.service.js';
import { ExportService } from '../services/export.service.js';
import { databaseService } from '../services/database.service.js';

const agentService = new AgentService(databaseService.getPool());
const exportService = new ExportService(databaseService.getPool());

/**
 * 创建智能体
 */
export const createAgent = async (req: Request, res: Response): Promise<void> => {
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

    const { name, description, config, skills, dataSources, outputTypes, implementation, templateId } = req.body;

    // 验证必填字段
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '智能体名称不能为空'
        }
      });
      return;
    }

    const agent = await agentService.createAgent({
      name: name.trim(),
      description,
      config,
      skills,
      dataSources,
      outputTypes,
      implementation,
      templateId,
      userId
    });

    console.log('✅ Agent created successfully:', agent.id);

    res.status(201).json({
      success: true,
      data: agent
    });
  } catch (error: any) {
    console.error('❌ Create agent error:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '创建智能体失败',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

/**
 * 获取用户的智能体列表
 */
export const getUserAgents = async (req: Request, res: Response): Promise<void> => {
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

    const result = await agentService.getAgentsByUserId(userId, {
      status: status as string | undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Get user agents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取智能体列表失败'
      }
    });
  }
};

/**
 * 获取智能体详情
 */
export const getAgentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const agentId = Array.isArray(id) ? id[0] : id;
    const agentUserId = userId || '';

    const agent = await agentService.getAgentById(agentId, agentUserId);

    if (!agent) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: '智能体不存在或无权访问'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error: any) {
    console.error('Get agent by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取智能体详情失败'
      }
    });
  }
};

/**
 * 更新智能体
 */
export const updateAgent = async (req: Request, res: Response): Promise<void> => {
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
    const agentId = Array.isArray(id) ? id[0] : id;
    const updateData = req.body;

    const agent = await agentService.updateAgent(agentId, userId, updateData);

    res.json({
      success: true,
      data: agent
    });
  } catch (error: any) {
    console.error('Update agent error:', error);
    
    if (error.message.includes('AGENT_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新智能体失败'
      }
    });
  }
};

/**
 * 删除智能体
 */
export const deleteAgent = async (req: Request, res: Response): Promise<void> => {
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
    const agentId = Array.isArray(id) ? id[0] : id;

    console.log('🗑️ Deleting agent:', agentId, 'for user:', userId);

    await agentService.deleteAgent(agentId, userId);

    console.log('✅ Agent deleted successfully:', agentId);

    res.json({
      success: true,
      message: '智能体已删除'
    });
  } catch (error: any) {
    console.error('❌ Delete agent error:', error);
    console.error('   Error message:', error.message);
    
    if (error.message.includes('AGENT_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除智能体失败'
      }
    });
  }
};

/**
 * 发布智能体到市场
 */
export const publishAgent = async (req: Request, res: Response): Promise<void> => {
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
    const agentId = Array.isArray(id) ? id[0] : id;

    const agent = await agentService.publishAgent(agentId, userId);

    res.json({
      success: true,
      data: agent,
      message: '智能体已发布到市场'
    });
  } catch (error: any) {
    console.error('Publish agent error:', error);
    
    if (error.message.includes('AGENT_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '发布智能体失败'
      }
    });
  }
};

/**
 * 取消发布智能体
 */
export const unpublishAgent = async (req: Request, res: Response): Promise<void> => {
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
    const agentId = Array.isArray(id) ? id[0] : id;

    const agent = await agentService.unpublishAgent(agentId, userId);

    res.json({
      success: true,
      data: agent,
      message: '智能体已取消发布'
    });
  } catch (error: any) {
    console.error('Unpublish agent error:', error);
    
    if (error.message.includes('AGENT_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
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
 * 搜索公开市场的智能体
 */
export const searchPublishedAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, category, tags, page = 1, limit = 20 } = req.query;

    const result = await agentService.searchPublishedAgents({
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
    console.error('Search published agents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '搜索智能体失败'
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

    const stats = await agentService.getUserStats(userId);

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
 * 导出智能体
 */
export const exportAgent = async (req: Request, res: Response): Promise<void> => {
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
    const agentId = Array.isArray(id) ? id[0] : id;
    const { format = 'json', includeMetadata = true, includeImplementation = false } = req.body;

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

    const result = await exportService.exportAgent(agentId, userId, {
      format: format as 'json' | 'yaml' | 'proclaw',
      includeMetadata,
      includeImplementation
    });

    res.json({
      success: true,
      data: result,
      message: '导出成功'
    });
  } catch (error: any) {
    console.error('Export agent error:', error);
    
    if (error.message.includes('AGENT_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: error.message
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '导出智能体失败'
      }
    });
  }
};

/**
 * 获取导出历史
 */
export const getExportHistory = async (req: Request, res: Response): Promise<void> => {
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

    const { limit = 20 } = req.query;
    const history = await exportService.getExportHistory(userId, parseInt(limit as string));

    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Get export history error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取导出历史失败'
      }
    });
  }
};
