/**
 * V1 Agent Controller
 *
 * 公开 API - Agent CRUD + 发布管理
 * 使用 API Key 认证，读取 req.apiKey.user_id
 */

import { Request, Response } from 'express';
import { AgentService } from '../../services/agent.service.js';
import { databaseService } from '../../services/database.service.js';

const agentService = new AgentService(databaseService.getPool());

/**
 * POST /api/v1/agents
 * 创建 Agent
 */
export const createAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权，请使用有效的 API Key' }
      });
      return;
    }

    const { name, description, config, skills, dataSources, outputTypes, implementation, templateId, category, tags } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Agent 名称不能为空' }
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
      category,
      tags,
      userId
    });

    res.status(201).json({
      success: true,
      data: agent
    });
  } catch (error: any) {
    console.error('[v1] Create agent error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '创建 Agent 失败' }
    });
  }
};

/**
 * GET /api/v1/agents
 * 列出当前开发者的 Agent
 */
export const listAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权' }
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
    console.error('[v1] List agents error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取 Agent 列表失败' }
    });
  }
};

/**
 * GET /api/v1/agents/:id
 * 获取 Agent 详情（仅限自己的 Agent）
 */
export const getAgentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;
    const { id } = req.params;
    const agentId = Array.isArray(id) ? id[0] : id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权' }
      });
      return;
    }

    const agent = await agentService.getAgentById(agentId, userId);

    if (!agent) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agent 不存在或无权访问' }
      });
      return;
    }

    res.json({
      success: true,
      data: agent
    });
  } catch (error: any) {
    console.error('[v1] Get agent error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取 Agent 详情失败' }
    });
  }
};

/**
 * PUT /api/v1/agents/:id
 * 更新 Agent
 */
export const updateAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权' }
      });
      return;
    }

    const { id } = req.params;
    const agentId = Array.isArray(id) ? id[0] : id;

    const agent = await agentService.updateAgent(agentId, userId, req.body);

    res.json({
      success: true,
      data: agent
    });
  } catch (error: any) {
    console.error('[v1] Update agent error:', error);

    if (error.message?.includes('AGENT_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '更新 Agent 失败' }
    });
  }
};

/**
 * DELETE /api/v1/agents/:id
 * 删除 Agent
 */
export const deleteAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权' }
      });
      return;
    }

    const { id } = req.params;
    const agentId = Array.isArray(id) ? id[0] : id;

    await agentService.deleteAgent(agentId, userId);

    res.json({
      success: true,
      message: 'Agent 已删除'
    });
  } catch (error: any) {
    console.error('[v1] Delete agent error:', error);

    if (error.message?.includes('AGENT_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '删除 Agent 失败' }
    });
  }
};

/**
 * POST /api/v1/agents/:id/publish
 * 发布 Agent 到市场
 */
export const publishAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权' }
      });
      return;
    }

    const { id } = req.params;
    const agentId = Array.isArray(id) ? id[0] : id;

    const agent = await agentService.publishAgent(agentId, userId);

    res.json({
      success: true,
      data: agent,
      message: 'Agent 已发布到市场'
    });
  } catch (error: any) {
    console.error('[v1] Publish agent error:', error);

    if (error.message?.includes('AGENT_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '发布 Agent 失败' }
    });
  }
};

/**
 * POST /api/v1/agents/:id/unpublish
 * 取消发布 Agent
 */
export const unpublishAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权' }
      });
      return;
    }

    const { id } = req.params;
    const agentId = Array.isArray(id) ? id[0] : id;

    const agent = await agentService.unpublishAgent(agentId, userId);

    res.json({
      success: true,
      data: agent,
      message: 'Agent 已取消发布'
    });
  } catch (error: any) {
    console.error('[v1] Unpublish agent error:', error);

    if (error.message?.includes('AGENT_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '取消发布失败' }
    });
  }
};
