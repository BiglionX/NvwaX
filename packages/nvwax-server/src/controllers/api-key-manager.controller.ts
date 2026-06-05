/**
 * API Key Manager Controller
 *
 * JWT 保护的 API Key 管理端点（用于用户中心个人页面）
 * 与 /api/sdk/api-keys 不同，这些端点使用 userAuthMiddleware (JWT) 而非 API Key
 */

import { Request, Response } from 'express';
import { apiKeyService } from '../services/api-key.service.js';
import { tenantService } from '../services/tenant.service.js';
import { databaseService } from '../services/database.service.js';

export class ApiKeyManagerController {
  /**
   * POST /api/user/api-keys
   * 创建新的 API Key
   */
  async createApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '请先登录' }
        });
        return;
      }

      const { name, expiresInDays } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'API Key 名称不能为空' }
        });
        return;
      }

      // 获取用户的默认 tenant
      const tenants = await tenantService.listUserTenants(userId);
      if (!tenants || tenants.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_TENANT', message: '未找到租户，请先创建项目' }
        });
        return;
      }

      const tenantId = tenants[0].id;

      const apiKey = await apiKeyService.createApiKey({
        userId,
        tenantId,
        name,
        permissions: ['*'],
        rateLimit: 0, // 无限制，按 token 计费
        expiresInDays
      });

      res.status(201).json({
        success: true,
        data: {
          id: apiKey.id,
          key_prefix: apiKey.key_prefix,
          secret_key: apiKey.secret_key,
          name: apiKey.name,
          permissions: apiKey.permissions,
          rate_limit: apiKey.rate_limit,
          expires_at: apiKey.expires_at,
          created_at: apiKey.created_at,
          warning: '请立即保存密钥，生成后不再显示'
        }
      });
    } catch (error) {
      console.error('Create API key error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '创建 API Key 失败' }
      });
    }
  }

  /**
   * GET /api/user/api-keys
   * 列出当前用户的所有 API Keys
   */
  async listApiKeys(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '请先登录' }
        });
        return;
      }

      // 获取用户的所有 tenants
      const tenants = await tenantService.listUserTenants(userId);
      const tenantIds = tenants.map(t => t.id);

      if (tenantIds.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }

      // 查询所有 API Keys
      const result = await databaseService.getPool().query(
        `SELECT * FROM api_keys 
         WHERE user_id = $1 AND tenant_id = ANY($2)
         ORDER BY created_at DESC`,
        [userId, tenantIds]
      );

      res.json({
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          key_prefix: row.key_prefix,
          name: row.name,
          permissions: row.permissions,
          rate_limit: row.rate_limit,
          expires_at: row.expires_at,
          last_used_at: row.last_used_at,
          is_active: row.is_active,
          created_at: row.created_at
        }))
      });
    } catch (error) {
      console.error('List API keys error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '获取 API Key 列表失败' }
      });
    }
  }

  /**
   * DELETE /api/user/api-keys/:id
   * 删除 API Key
   */
  async deleteApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '请先登录' }
        });
        return;
      }

      const keyId = Array.isArray(id) ? id[0] : id;
      const deleted = await apiKeyService.deleteApiKey(keyId, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'API Key 不存在' }
        });
        return;
      }

      res.json({ success: true, message: 'API Key 已删除' });
    } catch (error) {
      console.error('Delete API key error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '删除 API Key 失败' }
      });
    }
  }

  /**
   * PUT /api/user/api-keys/:id
   * 更新 API Key（名称、权限等）
   */
  async updateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '请先登录' }
        });
        return;
      }

      const keyId = Array.isArray(id) ? id[0] : id;
      const { name, permissions, rateLimit } = req.body;

      const apiKey = await apiKeyService.updateApiKey(keyId, userId, {
        name,
        permissions,
        rate_limit: rateLimit
      });

      if (!apiKey) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'API Key 不存在' }
        });
        return;
      }

      res.json({ success: true, data: apiKey });
    } catch (error) {
      console.error('Update API key error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '更新 API Key 失败' }
      });
    }
  }

  /**
   * GET /api/user/api-keys/usage
   * 获取使用量统计
   */
  async getUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '请先登录' }
        });
        return;
      }

      const tenants = await tenantService.listUserTenants(userId);
      if (!tenants || tenants.length === 0) {
        res.json({ success: true, data: { usage: [], quota: null } });
        return;
      }

      const tenantId = tenants[0].id;
      const period = (req.query.period as 'day' | 'week' | 'month') || 'month';

      const stats = await apiKeyService.getUsageStats(tenantId, period);
      const quota = await tenantService.getQuotaUsage(tenantId);

      res.json({
        success: true,
        data: { period, usage: stats, quota }
      });
    } catch (error) {
      console.error('Get usage stats error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '获取使用量统计失败' }
      });
    }
  }
}

export const apiKeyManagerController = new ApiKeyManagerController();
