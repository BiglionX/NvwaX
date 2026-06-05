/**
 * V1 AiTeam Controller
 *
 * 公开 API - AiTeam CRUD + 发布管理
 * 使用 API Key 认证，读取 req.apiKey.user_id
 */

import { Request, Response } from 'express';
import { AiTeamService } from '../../services/aiteam.service.js';
import { databaseService } from '../../services/database.service.js';

const aiteamService = new AiTeamService(databaseService.getPool());

/**
 * POST /api/v1/aiteams
 * 创建 AiTeam
 */
export const createAiTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权，请使用有效的 API Key' }
      });
      return;
    }

    const { name, description, members, workflow, triggers, category, tags } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'AiTeam 名称不能为空' }
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
    console.error('[v1] Create aiteam error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '创建 AiTeam 失败' }
    });
  }
};

/**
 * GET /api/v1/aiteams
 * 列出当前开发者的 AiTeam
 */
export const listAiTeams = async (req: Request, res: Response): Promise<void> => {
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
    console.error('[v1] List aiteams error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取 AiTeam 列表失败' }
    });
  }
};

/**
 * GET /api/v1/aiteams/:id
 * 获取 AiTeam 详情（仅限自己的 AiTeam）
 */
export const getAiTeamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;
    const { id } = req.params;
    const aiteamId = Array.isArray(id) ? id[0] : id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权' }
      });
      return;
    }

    const aiteam = await aiteamService.getAiTeamById(aiteamId, userId);

    if (!aiteam) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'AiTeam 不存在或无权访问' }
      });
      return;
    }

    res.json({
      success: true,
      data: aiteam
    });
  } catch (error: any) {
    console.error('[v1] Get aiteam error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取 AiTeam 详情失败' }
    });
  }
};

/**
 * PUT /api/v1/aiteams/:id
 * 更新 AiTeam
 */
export const updateAiTeam = async (req: Request, res: Response): Promise<void> => {
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
    const aiteamId = Array.isArray(id) ? id[0] : id;

    const aiteam = await aiteamService.updateAiTeam(aiteamId, userId, req.body);

    res.json({
      success: true,
      data: aiteam
    });
  } catch (error: any) {
    console.error('[v1] Update aiteam error:', error);

    if (error.message?.includes('AITEAM_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '更新 AiTeam 失败' }
    });
  }
};

/**
 * DELETE /api/v1/aiteams/:id
 * 删除 AiTeam
 */
export const deleteAiTeam = async (req: Request, res: Response): Promise<void> => {
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
    const aiteamId = Array.isArray(id) ? id[0] : id;

    await aiteamService.deleteAiTeam(aiteamId, userId);

    res.json({
      success: true,
      message: 'AiTeam 已删除'
    });
  } catch (error: any) {
    console.error('[v1] Delete aiteam error:', error);

    if (error.message?.includes('AITEAM_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '删除 AiTeam 失败' }
    });
  }
};

/**
 * POST /api/v1/aiteams/:id/publish
 * 发布 AiTeam 到市场
 */
export const publishAiTeam = async (req: Request, res: Response): Promise<void> => {
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
    const aiteamId = Array.isArray(id) ? id[0] : id;

    const aiteam = await aiteamService.publishAiTeam(aiteamId, userId);

    res.json({
      success: true,
      data: aiteam,
      message: 'AiTeam 已发布到市场'
    });
  } catch (error: any) {
    console.error('[v1] Publish aiteam error:', error);

    if (error.message?.includes('AITEAM_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '发布 AiTeam 失败' }
    });
  }
};

/**
 * POST /api/v1/aiteams/:id/unpublish
 * 取消发布 AiTeam
 */
export const unpublishAiTeam = async (req: Request, res: Response): Promise<void> => {
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
    const aiteamId = Array.isArray(id) ? id[0] : id;

    const aiteam = await aiteamService.unpublishAiTeam(aiteamId, userId);

    res.json({
      success: true,
      data: aiteam,
      message: 'AiTeam 已取消发布'
    });
  } catch (error: any) {
    console.error('[v1] Unpublish aiteam error:', error);

    if (error.message?.includes('AITEAM_NOT_FOUND')) {
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
