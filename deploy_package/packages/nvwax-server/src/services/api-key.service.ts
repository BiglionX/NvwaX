import crypto from 'crypto';
import { Pool } from 'pg';
import { databaseService } from './database.service.js';

export interface ApiKey {
  id: string;
  key_prefix: string; // First 8 chars for display (e.g., "nvwx_abc123")
  user_id: string;
  tenant_id: string;
  name: string;
  permissions: string[];
  rate_limit: number;
  expires_at?: Date;
  last_used_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateApiKeyInput {
  userId: string;
  tenantId: string;
  name: string;
  permissions?: string[];
  rateLimit?: number;
  expiresInDays?: number; // Optional expiration
}

export interface ApiKeyWithSecret extends ApiKey {
  secret_key: string; // Full API key (only returned once during creation)
}

export class ApiKeyService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Generate a new API key with secure random string
   * Format: nvwx_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   */
  private generateApiKey(): { fullKey: string; prefix: string; hash: string } {
    const randomPart1 = crypto.randomBytes(4).toString('hex'); // 8 chars
    const randomPart2 = crypto.randomBytes(16).toString('hex'); // 32 chars
    const fullKey = `nvwx_${randomPart1}_${randomPart2}`;
    const prefix = `nvwx_${randomPart1}`;
    
    // Hash the key using SHA-256 for storage
    const hash = crypto.createHash('sha256').update(fullKey).digest('hex');
    
    return { fullKey, prefix, hash };
  }

  /**
   * Create a new API key for a user/tenant
   */
  async createApiKey(input: CreateApiKeyInput): Promise<ApiKeyWithSecret> {
    const { userId, tenantId, name, permissions = ['sdk:*'], rateLimit = 1000, expiresInDays } = input;
    
    // Verify tenant exists and user is owner or has permission
    const tenantCheck = await this.pool.query(
      'SELECT id FROM tenants WHERE id = $1 AND owner_id = $2',
      [tenantId, userId]
    );
    
    if (tenantCheck.rows.length === 0) {
      throw new Error('Invalid tenant or insufficient permissions');
    }

    // Generate API key
    const { fullKey, prefix, hash } = this.generateApiKey();
    
    // Calculate expiration date if provided
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Insert into database
    const result = await this.pool.query(
      `INSERT INTO api_keys 
       (key_hash, key_prefix, user_id, tenant_id, name, permissions, rate_limit, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [hash, prefix, userId, tenantId, name, JSON.stringify(permissions), rateLimit, expiresAt]
    );

    const apiKey = this.formatApiKey(result.rows[0]);
    
    // Return with the full secret key (only shown once)
    return {
      ...apiKey,
      secret_key: fullKey
    };
  }

  /**
   * Get API key by ID (without exposing hash)
   */
  async getApiKeyById(id: string, userId: string): Promise<ApiKey | null> {
    const result = await this.pool.query(
      'SELECT * FROM api_keys WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatApiKey(result.rows[0]);
  }

  /**
   * List all API keys for a user in a tenant
   */
  async listApiKeys(userId: string, tenantId: string): Promise<ApiKey[]> {
    const result = await this.pool.query(
      `SELECT * FROM api_keys 
       WHERE user_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC`,
      [userId, tenantId]
    );

    return result.rows.map(row => this.formatApiKey(row));
  }

  /**
   * Validate API key and return associated data
   * This is used by the authentication middleware
   */
  async validateApiKey(apiKey: string): Promise<{ 
    isValid: boolean; 
    apiKey?: ApiKey; 
    tenantId?: string;
    error?: string;
  }> {
    try {
      // Hash the provided key
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      // Look up the key
      const result = await this.pool.query(
        `SELECT ak.*, t.plan as tenant_plan
         FROM api_keys ak
         JOIN tenants t ON ak.tenant_id = t.id
         WHERE ak.key_hash = $1 AND ak.is_active = true`,
        [hash]
      );

      if (result.rows.length === 0) {
        return { isValid: false, error: 'Invalid API key' };
      }

      const apiKeyData = result.rows[0];
      
      // Check expiration
      if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
        return { isValid: false, error: 'API key has expired' };
      }

      // Update last used timestamp (async, don't wait)
      this.updateLastUsed(apiKeyData.id).catch(err => {
        console.error('Failed to update last_used_at:', err);
      });

      return {
        isValid: true,
        apiKey: this.formatApiKey(apiKeyData),
        tenantId: apiKeyData.tenant_id
      };
    } catch (error) {
      console.error('API key validation error:', error);
      return { isValid: false, error: 'Internal server error' };
    }
  }

  /**
   * Rotate an API key (deactivate old, create new)
   */
  async rotateApiKey(id: string, userId: string): Promise<ApiKeyWithSecret> {
    // Get existing key
    const existingKey = await this.getApiKeyById(id, userId);
    
    if (!existingKey) {
      throw new Error('API key not found');
    }

    // Deactivate old key
    await this.pool.query(
      'UPDATE api_keys SET is_active = false WHERE id = $1',
      [id]
    );

    // Create new key with same settings
    const newKey = await this.createApiKey({
      userId,
      tenantId: existingKey.tenant_id,
      name: `${existingKey.name} (Rotated)`,
      permissions: existingKey.permissions,
      rateLimit: existingKey.rate_limit
    });

    return newKey;
  }

  /**
   * Delete (revoke) an API key
   */
  async deleteApiKey(id: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Update API key settings
   */
  async updateApiKey(
    id: string, 
    userId: string, 
    updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'rate_limit'>>
  ): Promise<ApiKey | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.permissions !== undefined) {
      fields.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(updates.permissions));
    }
    if (updates.rate_limit !== undefined) {
      fields.push(`rate_limit = $${paramIndex++}`);
      values.push(updates.rate_limit);
    }

    if (fields.length === 0) {
      return this.getApiKeyById(id, userId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const result = await this.pool.query(
      `UPDATE api_keys 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatApiKey(result.rows[0]);
  }

  /**
   * Check rate limit for an API key
   * Returns true if request is allowed, false if rate limited
   */
  async checkRateLimit(apiKeyId: string): Promise<{ allowed: boolean; remaining?: number }> {
    const keyResult = await this.pool.query(
      'SELECT rate_limit FROM api_keys WHERE id = $1',
      [apiKeyId]
    );

    if (keyResult.rows.length === 0) {
      return { allowed: false };
    }

    const rateLimit = keyResult.rows[0].rate_limit;
    
    // Count requests in the last hour
    const usageResult = await this.pool.query(
      `SELECT COUNT(*) as count 
       FROM api_usage 
       WHERE api_key_id = $1 
       AND timestamp > NOW() - INTERVAL '1 hour'`,
      [apiKeyId]
    );

    const count = parseInt(usageResult.rows[0].count);
    const remaining = Math.max(0, rateLimit - count);

    return {
      allowed: count < rateLimit,
      remaining
    };
  }

  /**
   * Record API usage for billing and analytics
   */
  async recordUsage(params: {
    apiKeyId: string;
    tenantId: string;
    endpoint: string;
    method?: string;
    tokensUsed?: number;
    cost?: number;
    status?: 'success' | 'error' | 'rate_limited';
    responseTimeMs?: number;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const {
      apiKeyId,
      tenantId,
      endpoint,
      method = 'POST',
      tokensUsed = 0,
      cost = 0,
      status = 'success',
      responseTimeMs,
      ipAddress,
      userAgent,
      metadata = {}
    } = params;

    await this.pool.query(
      `INSERT INTO api_usage 
       (api_key_id, tenant_id, endpoint, method, tokens_used, cost, status, 
        response_time_ms, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        apiKeyId,
        tenantId,
        endpoint,
        method,
        tokensUsed,
        cost,
        status,
        responseTimeMs,
        ipAddress || null,
        userAgent || null,
        JSON.stringify(metadata)
      ]
    );
  }

  /**
   * Get usage statistics for a tenant
   */
  async getUsageStats(tenantId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<any> {
    let interval: string;
    switch (period) {
      case 'day':
        interval = '24 hours';
        break;
      case 'week':
        interval = '7 days';
        break;
      case 'month':
      default:
        interval = '30 days';
        break;
    }

    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as total_requests,
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COALESCE(SUM(cost), 0) as total_cost,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_requests,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_requests,
        COUNT(CASE WHEN status = 'rate_limited' THEN 1 END) as rate_limited_requests,
        COALESCE(AVG(response_time_ms), 0) as avg_response_time
       FROM api_usage
       WHERE tenant_id = $1
       AND timestamp > NOW() - INTERVAL '${interval}'`,
      [tenantId]
    );

    return result.rows[0];
  }

  /**
   * Update last_used_at timestamp
   */
  private async updateLastUsed(apiKeyId: string): Promise<void> {
    await this.pool.query(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [apiKeyId]
    );
  }

  /**
   * Format database row to ApiKey object
   */
  private formatApiKey(row: any): ApiKey {
    return {
      id: row.id,
      key_prefix: row.key_prefix,
      user_id: row.user_id,
      tenant_id: row.tenant_id,
      name: row.name,
      permissions: Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]'),
      rate_limit: row.rate_limit,
      expires_at: row.expires_at ? new Date(row.expires_at) : undefined,
      last_used_at: row.last_used_at ? new Date(row.last_used_at) : undefined,
      is_active: row.is_active,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

export const apiKeyService = new ApiKeyService();
