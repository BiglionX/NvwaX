import { Request, Response } from 'express';
import { apiKeyService } from '../services/api-key.service.js';
import { tenantService } from '../services/tenant.service.js';

export class SdkController {
  /**
   * Create a new API key
   * POST /api/sdk/api-keys
   */
  async createApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User authentication required' }
        });
        return;
      }

      const { name, tenantId, permissions, rateLimit, expiresInDays } = req.body;

      // Validation
      if (!name || !tenantId) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Name and tenantId are required' 
          }
        });
        return;
      }

      // Verify user has access to this tenant
      const hasAccess = await tenantService.hasTenantAccess(userId, tenantId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: { 
            code: 'FORBIDDEN', 
            message: 'You do not have access to this tenant' 
          }
        });
        return;
      }

      // Create API key
      const apiKey = await apiKeyService.createApiKey({
        userId,
        tenantId,
        name,
        permissions,
        rateLimit,
        expiresInDays
      });

      res.status(201).json({
        success: true,
        data: {
          id: apiKey.id,
          key_prefix: apiKey.key_prefix,
          secret_key: apiKey.secret_key, // Only shown once!
          name: apiKey.name,
          permissions: apiKey.permissions,
          rate_limit: apiKey.rate_limit,
          expires_at: apiKey.expires_at,
          created_at: apiKey.created_at,
          warning: 'Store your secret key securely. It will not be shown again.'
        }
      });
    } catch (error) {
      console.error('Create API key error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to create API key' 
        }
      });
    }
  }

  /**
   * List all API keys for the current tenant
   * GET /api/sdk/api-keys
   */
  async listApiKeys(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      const tenantId = req.apiKey?.tenant_id;

      if (!userId || !tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const apiKeys = await apiKeyService.listApiKeys(userId, tenantId);

      res.json({
        success: true,
        data: apiKeys.map(key => ({
          id: key.id,
          key_prefix: key.key_prefix,
          name: key.name,
          permissions: key.permissions,
          rate_limit: key.rate_limit,
          expires_at: key.expires_at,
          last_used_at: key.last_used_at,
          is_active: key.is_active,
          created_at: key.created_at
          // Note: Never expose key_hash or full secret_key
        }))
      });
    } catch (error) {
      console.error('List API keys error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to list API keys' 
        }
      });
    }
  }

  /**
   * Get a specific API key by ID
   * GET /api/sdk/api-keys/:id
   */
  async getApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      const { id } = req.params;

      if (!userId || Array.isArray(id)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const apiKey = await apiKeyService.getApiKeyById(id, userId);

      if (!apiKey) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'API key not found' }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: apiKey.id,
          key_prefix: apiKey.key_prefix,
          name: apiKey.name,
          permissions: apiKey.permissions,
          rate_limit: apiKey.rate_limit,
          expires_at: apiKey.expires_at,
          last_used_at: apiKey.last_used_at,
          is_active: apiKey.is_active,
          created_at: apiKey.created_at,
          updated_at: apiKey.updated_at
        }
      });
    } catch (error) {
      console.error('Get API key error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to get API key' 
        }
      });
    }
  }

  /**
   * Update an API key
   * PUT /api/sdk/api-keys/:id
   */
  async updateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      const { id } = req.params;
      const { name, permissions, rateLimit } = req.body;

      if (!userId || Array.isArray(id)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const apiKey = await apiKeyService.updateApiKey(id, userId, {
        name,
        permissions,
        rate_limit: rateLimit
      });

      if (!apiKey) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'API key not found' }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: apiKey.id,
          name: apiKey.name,
          permissions: apiKey.permissions,
          rate_limit: apiKey.rate_limit,
          updated_at: apiKey.updated_at
        }
      });
    } catch (error) {
      console.error('Update API key error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to update API key' 
        }
      });
    }
  }

  /**
   * Delete (revoke) an API key
   * DELETE /api/sdk/api-keys/:id
   */
  async deleteApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      const { id } = req.params;

      if (!userId || Array.isArray(id)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const deleted = await apiKeyService.deleteApiKey(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'API key not found' }
        });
        return;
      }

      res.json({
        success: true,
        message: 'API key successfully revoked'
      });
    } catch (error) {
      console.error('Delete API key error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to delete API key' 
        }
      });
    }
  }

  /**
   * Rotate an API key (deactivate old, create new)
   * POST /api/sdk/api-keys/:id/rotate
   */
  async rotateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      const { id } = req.params;

      if (!userId || Array.isArray(id)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const newKey = await apiKeyService.rotateApiKey(id, userId);

      res.json({
        success: true,
        data: {
          id: newKey.id,
          key_prefix: newKey.key_prefix,
          secret_key: newKey.secret_key, // Only shown once!
          name: newKey.name,
          permissions: newKey.permissions,
          rate_limit: newKey.rate_limit,
          created_at: newKey.created_at,
          warning: 'Store your new secret key securely. The old key has been deactivated.'
        }
      });
    } catch (error) {
      console.error('Rotate API key error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to rotate API key' 
        }
      });
    }
  }

  /**
   * Get API usage statistics
   * GET /api/sdk/usage
   */
  async getUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.apiKey?.tenant_id;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const period = (req.query.period as 'day' | 'week' | 'month') || 'month';

      const stats = await apiKeyService.getUsageStats(tenantId, period);

      // Get quota information
      const quota = await tenantService.getQuotaUsage(tenantId);

      res.json({
        success: true,
        data: {
          period,
          usage: stats,
          quota
        }
      });
    } catch (error) {
      console.error('Get usage stats error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to get usage statistics' 
        }
      });
    }
  }
}

export const sdkController = new SdkController();
