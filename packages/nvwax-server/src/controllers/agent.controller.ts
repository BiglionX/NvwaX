/**
 * Agent 控制器
 * 
 * 处理智能体相关的 HTTP 请求
 */

import { Request, Response } from 'express';
import { AgentService } from '../services/agent.service.js';
import { databaseService } from '../services/database.service.js';

const agentService = new AgentService(databaseService.getPool());

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

    res.status(201).json({
      success: true,
      data: agent
    });
  } catch (error: any) {
    console.error('Create agent error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '创建智能体失败'
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

    await agentService.deleteAgent(agentId, userId);

    res.json({
      success: true,
      message: '智能体已删除'
    });
  } catch (error: any) {
    console.error('Delete agent error:', error);
    
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
