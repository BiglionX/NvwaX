import { Pool } from 'pg';
import { databaseService } from './database.service.js';

export interface Role {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  permissions: string[];
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by?: string;
  assigned_at: Date;
  expires_at?: Date;
}

export interface CreateRoleInput {
  tenantId: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface AssignRoleInput {
  userId: string;
  roleId: string;
  assignedBy: string;
  expiresAt?: Date;
}

export class RBACService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Create a new role in a tenant
   */
  async createRole(input: CreateRoleInput): Promise<Role> {
    const { tenantId, name, description, permissions } = input;

    // Check if role name already exists in this tenant
    const existing = await this.pool.query(
      'SELECT id FROM roles WHERE tenant_id = $1 AND name = $2',
      [tenantId, name]
    );

    if (existing.rows.length > 0) {
      throw new Error(`Role '${name}' already exists in this tenant`);
    }

    const result = await this.pool.query(
      `INSERT INTO roles (tenant_id, name, description, permissions)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tenantId, name, description || null, JSON.stringify(permissions)]
    );

    return this.formatRole(result.rows[0]);
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: string, tenantId?: string): Promise<Role | null> {
    let query = 'SELECT * FROM roles WHERE id = $1';
    const values: any[] = [id];

    if (tenantId) {
      query += ' AND tenant_id = $2';
      values.push(tenantId);
    }

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatRole(result.rows[0]);
  }

  /**
   * List all roles in a tenant
   */
  async listRoles(tenantId: string): Promise<Role[]> {
    const result = await this.pool.query(
      'SELECT * FROM roles WHERE tenant_id = $1 ORDER BY is_system DESC, name ASC',
      [tenantId]
    );

    return result.rows.map(row => this.formatRole(row));
  }

  /**
   * Update role (only non-system roles)
   */
  async updateRole(
    id: string,
    tenantId: string,
    updates: Partial<Pick<Role, 'name' | 'description' | 'permissions'>>
  ): Promise<Role | null> {
    // Check if role is system role
    const role = await this.getRoleById(id, tenantId);
    
    if (!role) {
      return null;
    }

    if (role.is_system) {
      throw new Error('Cannot modify system roles');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      // Check for name conflicts
      const nameCheck = await this.pool.query(
        'SELECT id FROM roles WHERE tenant_id = $1 AND name = $2 AND id != $3',
        [tenantId, updates.name, id]
      );

      if (nameCheck.rows.length > 0) {
        throw new Error(`Role name '${updates.name}' already exists`);
      }

      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.permissions !== undefined) {
      fields.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(updates.permissions));
    }

    if (fields.length === 0) {
      return role;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.pool.query(
      `UPDATE roles 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    return this.formatRole(result.rows[0]);
  }

  /**
   * Delete role (only non-system roles)
   */
  async deleteRole(id: string, tenantId: string): Promise<boolean> {
    // Check if role is system role
    const role = await this.getRoleById(id, tenantId);
    
    if (!role) {
      return false;
    }

    if (role.is_system) {
      throw new Error('Cannot delete system roles');
    }

    // Check if role is assigned to any users
    const assignments = await this.pool.query(
      'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
      [id]
    );

    if (parseInt(assignments.rows[0].count) > 0) {
      throw new Error('Cannot delete role that is assigned to users. Remove assignments first.');
    }

    const result = await this.pool.query(
      'DELETE FROM roles WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    return result.rows.length > 0;
  }

  /**
   * Assign a role to a user
   */
  async assignRole(input: AssignRoleInput): Promise<UserRole> {
    const { userId, roleId, assignedBy, expiresAt } = input;

    // Verify role exists
    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    // Verify user exists
    const userCheck = await this.pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('User not found');
    }

    // Check if assignment already exists
    const existing = await this.pool.query(
      'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );

    if (existing.rows.length > 0) {
      throw new Error('User already has this role');
    }

    const result = await this.pool.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, roleId, assignedBy, expiresAt || null]
    );

    return this.formatUserRole(result.rows[0]);
  }

  /**
   * Remove role assignment from user
   */
  async removeRoleAssignment(userId: string, roleId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING id',
      [userId, roleId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get all roles assigned to a user in a tenant
   */
  async getUserRoles(userId: string, tenantId: string): Promise<Role[]> {
    const result = await this.pool.query(
      `SELECT r.* 
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND r.tenant_id = $2
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
       ORDER BY r.name`,
      [userId, tenantId]
    );

    return result.rows.map(row => this.formatRole(row));
  }

  /**
   * Get all users with a specific role
   */
  async getUsersWithRole(roleId: string, tenantId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT u.id, u.email, u.name, ur.assigned_at, ur.expires_at
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE r.id = $1 AND r.tenant_id = $2
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
       ORDER BY ur.assigned_at DESC`,
      [roleId, tenantId]
    );

    return result.rows;
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, tenantId: string, permission: string): Promise<boolean> {
    // Get all roles for the user
    const roles = await this.getUserRoles(userId, tenantId);

    // Check each role's permissions
    for (const role of roles) {
      if (this.checkPermission(role.permissions, permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, tenantId: string, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, tenantId, permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all permissions for a user in a tenant
   */
  async getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
    const roles = await this.getUserRoles(userId, tenantId);
    
    const allPermissions = new Set<string>();
    
    for (const role of roles) {
      role.permissions.forEach(p => allPermissions.add(p));
    }

    return Array.from(allPermissions);
  }

  /**
   * Check if a permission string matches (supports wildcards)
   */
  private checkPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.some(p => {
      // Exact match
      if (p === requiredPermission) return true;
      
      // Wildcard match (e.g., 'sdk:*' matches 'sdk:chat:create')
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -2); // Remove ':*'
        return requiredPermission.startsWith(prefix + ':');
      }
      
      // Super admin wildcard
      if (p === '*') return true;
      
      return false;
    });
  }

  /**
   * Clean up expired role assignments
   */
  async cleanupExpiredAssignments(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM user_roles 
       WHERE expires_at IS NOT NULL AND expires_at < NOW()
       RETURNING id`
    );

    return result.rows.length;
  }

  /**
   * Format database row to Role object
   */
  private formatRole(row: any): Role {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      description: row.description,
      permissions: Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]'),
      is_system: row.is_system,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Format database row to UserRole object
   */
  private formatUserRole(row: any): UserRole {
    return {
      id: row.id,
      user_id: row.user_id,
      role_id: row.role_id,
      assigned_by: row.assigned_by,
      assigned_at: new Date(row.assigned_at),
      expires_at: row.expires_at ? new Date(row.expires_at) : undefined
    };
  }
}

export const rbacService = new RBACService();
