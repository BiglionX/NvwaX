import { Pool } from 'pg';
import { databaseService } from './database.service.js';

export interface Tenant {
  id: string;
  name: string;
  owner_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTenantInput {
  name: string;
  ownerId: string;
  plan?: 'free' | 'pro' | 'enterprise';
  settings?: Record<string, any>;
}

export class TenantService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Create a new tenant for a user
   */
  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    const { name, ownerId, plan = 'free', settings = {} } = input;

    // Verify user exists
    const userCheck = await this.pool.query(
      'SELECT id FROM users WHERE id = $1',
      [ownerId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('User not found');
    }

    // Check if user already has a tenant (free tier allows only 1)
    if (plan === 'free') {
      const existingTenant = await this.pool.query(
        'SELECT id FROM tenants WHERE owner_id = $1 AND plan = $2',
        [ownerId, 'free']
      );

      if (existingTenant.rows.length > 0) {
        throw new Error('Free tier users can only have one tenant. Upgrade to Pro or Enterprise for multiple tenants.');
      }
    }

    // Create tenant
    const result = await this.pool.query(
      `INSERT INTO tenants (name, owner_id, plan, settings)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, ownerId, plan, JSON.stringify(settings)]
    );

    // Create default roles for the tenant
    await this.createDefaultRoles(result.rows[0].id);

    // Assign owner as admin
    await this.assignOwnerAsAdmin(result.rows[0].id, ownerId);

    return this.formatTenant(result.rows[0]);
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string): Promise<Tenant | null> {
    const result = await this.pool.query(
      'SELECT * FROM tenants WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatTenant(result.rows[0]);
  }

  /**
   * Get tenant by owner ID
   */
  async getTenantByOwnerId(ownerId: string): Promise<Tenant | null> {
    const result = await this.pool.query(
      'SELECT * FROM tenants WHERE owner_id = $1',
      [ownerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatTenant(result.rows[0]);
  }

  /**
   * List all tenants for a user (as owner or member)
   */
  async listUserTenants(userId: string): Promise<Tenant[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT t.* 
       FROM tenants t
       LEFT JOIN user_roles ur ON t.id = ur.role_id
       WHERE t.owner_id = $1 OR ur.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    return result.rows.map(row => this.formatTenant(row));
  }

  /**
   * Update tenant information
   */
  async updateTenant(
    id: string, 
    ownerId: string,
    updates: Partial<Pick<Tenant, 'name' | 'settings'>>
  ): Promise<Tenant | null> {
    // Verify ownership
    const ownerCheck = await this.pool.query(
      'SELECT id FROM tenants WHERE id = $1 AND owner_id = $2',
      [id, ownerId]
    );

    if (ownerCheck.rows.length === 0) {
      return null;
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.settings !== undefined) {
      fields.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(updates.settings));
    }

    if (fields.length === 0) {
      return this.getTenantById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.pool.query(
      `UPDATE tenants 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return this.formatTenant(result.rows[0]);
  }

  /**
   * Upgrade tenant plan
   */
  async upgradePlan(tenantId: string, newPlan: 'pro' | 'enterprise'): Promise<Tenant> {
    const result = await this.pool.query(
      `UPDATE tenants 
       SET plan = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [newPlan, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    return this.formatTenant(result.rows[0]);
  }

  /**
   * Delete tenant (cascades to all related data)
   */
  async deleteTenant(id: string, ownerId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM tenants WHERE id = $1 AND owner_id = $2 RETURNING id',
      [id, ownerId]
    );

    return result.rows.length > 0;
  }

  /**
   * Check if user has access to tenant
   */
  async hasTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM tenants 
       WHERE id = $1 AND (owner_id = $2 OR EXISTS (
         SELECT 1 FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = $2 AND r.tenant_id = $1
       ))`,
      [tenantId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get tenant quota usage
   */
  async getQuotaUsage(tenantId: string): Promise<{
    current: number;
    limit: number;
    percentage: number;
  }> {
    // Get tenant plan
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get plan limits
    const planResult = await this.pool.query(
      'SELECT monthly_quota FROM billing_plans WHERE name = $1',
      [tenant.plan]
    );

    const monthlyQuota = planResult.rows[0]?.monthly_quota || 1000;

    // Count current month usage
    const usageResult = await this.pool.query(
      `SELECT COUNT(*) as count 
       FROM api_usage 
       WHERE tenant_id = $1 
       AND timestamp >= date_trunc('month', CURRENT_DATE)`,
      [tenantId]
    );

    const currentUsage = parseInt(usageResult.rows[0].count);
    const percentage = monthlyQuota > 0 ? (currentUsage / monthlyQuota) * 100 : 0;

    return {
      current: currentUsage,
      limit: monthlyQuota === -1 ? Infinity : monthlyQuota,
      percentage: Math.min(percentage, 100)
    };
  }

  /**
   * Create default roles for a new tenant
   */
  private async createDefaultRoles(tenantId: string): Promise<void> {
    const defaultRoles = [
      {
        name: 'admin',
        description: 'Full access to all resources',
        permissions: ['*'],
        is_system: true
      },
      {
        name: 'developer',
        description: 'Can manage API keys and view usage',
        permissions: ['sdk:*', 'agents:*', 'marketplace:view'],
        is_system: true
      },
      {
        name: 'viewer',
        description: 'Read-only access',
        permissions: ['marketplace:view'],
        is_system: true
      }
    ];

    for (const role of defaultRoles) {
      await this.pool.query(
        `INSERT INTO roles (tenant_id, name, description, permissions, is_system)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, name) DO NOTHING`,
        [tenantId, role.name, role.description, JSON.stringify(role.permissions), role.is_system]
      );
    }
  }

  /**
   * Assign tenant owner as admin
   */
  private async assignOwnerAsAdmin(tenantId: string, ownerId: string): Promise<void> {
    // Get admin role
    const roleResult = await this.pool.query(
      'SELECT id FROM roles WHERE tenant_id = $1 AND name = $2',
      [tenantId, 'admin']
    );

    if (roleResult.rows.length > 0) {
      await this.pool.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $1)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [ownerId, roleResult.rows[0].id]
      );
    }
  }

  /**
   * Format database row to Tenant object
   */
  private formatTenant(row: any): Tenant {
    return {
      id: row.id,
      name: row.name,
      owner_id: row.owner_id,
      plan: row.plan,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

export const tenantService = new TenantService();
