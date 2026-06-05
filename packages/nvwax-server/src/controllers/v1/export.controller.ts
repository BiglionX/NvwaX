/**
 * V1 Export Controller
 *
 * 公开 API - Agent/AiTeam 导出与下载
 * 使用 API Key 认证
 */

import { Request, Response } from 'express';
import { ExportService } from '../../services/export.service.js';
import { databaseService } from '../../services/database.service.js';

const pool = databaseService.getPool();
const exportService = new ExportService(pool);

/**
 * POST /api/v1/agents/:id/export
 * 导出 Agent 为指定格式
 */
export const exportAgent = async (req: Request, res: Response): Promise<void> => {
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
    const { format = 'json', includeMetadata = true, includeImplementation = false } = req.body;

    if (!['json', 'yaml', 'proclaw'].includes(format)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '不支持的导出格式，请使用 json、yaml 或 proclaw' }
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
    console.error('[v1] Export agent error:', error);

    if (error.message?.includes('AGENT_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '导出 Agent 失败' }
    });
  }
};

/**
 * POST /api/v1/aiteams/:id/export
 * 导出 AiTeam 为指定格式
 */
export const exportAiTeam = async (req: Request, res: Response): Promise<void> => {
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
    const { format = 'json', includeMetadata = true } = req.body;

    if (!['json', 'yaml', 'proclaw'].includes(format)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '不支持的导出格式，请使用 json、yaml 或 proclaw' }
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
    console.error('[v1] Export aiteam error:', error);

    if (error.message?.includes('AITEAM_NOT_FOUND')) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '导出 AiTeam 失败' }
    });
  }
};

/**
 * GET /api/v1/exports/:id/download
 * 下载导出的文件
 */
export const downloadExport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;
    const { id } = req.params;
    const exportId = Array.isArray(id) ? id[0] : id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权' }
      });
      return;
    }

    // 查询导出记录
    const dbResult = await pool.query(
      `SELECT * FROM agent_exports WHERE id = $1 AND user_id = $2`,
      [exportId, userId]
    );

    if (dbResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '导出记录不存在' }
      });
      return;
    }

    const record = dbResult.rows[0];

    if (record.status !== 'completed') {
      res.status(400).json({
        success: false,
        error: { code: 'EXPORT_NOT_READY', message: '导出尚未完成' }
      });
      return;
    }

    res.download(record.file_path);
  } catch (error: any) {
    console.error('[v1] Download export error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '下载文件失败' }
    });
  }
};

/**
 * POST /api/v1/export/batch
 * 批量导出
 */
export const batchExport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权' }
      });
      return;
    }

    const { items, format = 'json' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'items 不能为空' }
      });
      return;
    }

    if (!['json', 'yaml', 'proclaw'].includes(format)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '不支持的导出格式' }
      });
      return;
    }

    // 逐个导出
    const results = [];
    for (const item of items) {
      try {
        if (item.type === 'agent') {
          const result = await exportService.exportAgent(item.id, userId, {
            format: format as 'json' | 'yaml' | 'proclaw'
          });
          results.push(result);
        } else if (item.type === 'aiteam') {
          const result = await exportService.exportAiTeam(item.id, userId, {
            format: format as 'json' | 'yaml' | 'proclaw'
          });
          results.push(result);
        }
      } catch (err: any) {
        results.push({
          type: item.type,
          id: item.id,
          status: 'failed',
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        exports: results,
        total: results.length,
        successful: results.filter(r => r.status === 'completed' || (r as any).id).length,
        failed: results.filter(r => r.status === 'failed').length
      },
      message: '批量导出完成'
    });
  } catch (error: any) {
    console.error('[v1] Batch export error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '批量导出失败' }
    });
  }
};

/**
 * GET /api/v1/export/history
 * 获取导出历史
 */
export const getExportHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.apiKey?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未授权' }
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
    console.error('[v1] Get export history error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '获取导出历史失败' }
    });
  }
};
