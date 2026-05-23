import { Request, Response } from 'express';
import { rbacService } from '../services/rbac.service.js';
import { tenantService } from '../services/tenant.service.js';

export class RBACController {
  /**
   * Create a new role
   * POST /api/sdk/roles
   */
  async createRole(req: Request, res: Response): Promise<void> {
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

      const { name, description, permissions } = req.body;

      // Validation
      if (!name || !permissions || !Array.isArray(permissions)) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Name and permissions (array) are required' 
          }
        });
        return;
      }

      // Verify user has permission to create roles
      const hasPermission = await rbacService.hasPermission(userId, tenantId, 'sdk:roles:create');
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: { 
            code: 'FORBIDDEN', 
            message: 'Insufficient permissions to create roles' 
          }
        });
        return;
      }

      const role = await rbacService.createRole({
        tenantId,
        name,
        description,
        permissions
      });

      res.status(201).json({
        success: true,
        data: role
      });
    } catch (error: any) {
      console.error('Create role error:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: error.message }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to create role' 
        }
      });
    }
  }

  /**
   * List all roles in tenant
   * GET /api/sdk/roles
   */
  async listRoles(req: Request, res: Response): Promise<void> {
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

      const roles = await rbacService.listRoles(tenantId);

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('List roles error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to list roles' 
        }
      });
    }
  }

  /**
   * Get role by ID
   * GET /api/sdk/roles/:id
   */
  async getRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      const tenantId = req.apiKey?.tenant_id;
      const { id } = req.params;

      if (!userId || !tenantId || Array.isArray(id)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const role = await rbacService.getRoleById(id, tenantId);

      if (!role) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Role not found' }
        });
        return;
      }

      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      console.error('Get role error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to get role' 
        }
      });
    }
  }

  /**
   * Update role
   * PUT /api/sdk/roles/:id
   */
  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      const tenantId = req.apiKey?.tenant_id;
      const { id } = req.params;
      const { name, description, permissions } = req.body;

      if (!userId || !tenantId || Array.isArray(id)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      // Verify user has permission to update roles
      const hasPermission = await rbacService.hasPermission(userId, tenantId, 'sdk:roles:update');
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: { 
            code: 'FORBIDDEN', 
            message: 'Insufficient permissions to update roles' 
          }
        });
        return;
      }

      const role = await rbacService.updateRole(id, tenantId, {
        name,
        description,
        permissions
      });

      if (!role) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Role not found' }
        });
        return;
      }

      res.json({
        success: true,
        data: role
      });
    } catch (error: any) {
      console.error('Update role error:', error);
      
      if (error.message.includes('Cannot modify system roles')) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: error.message }
        });
        return;
      }

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: error.message }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to update role' 
        }
      });
    }
  }

  /**
   * Delete role
   * DELETE /api/sdk/roles/:id
   */
  async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      const tenantId = req.apiKey?.tenant_id;
      const { id } = req.params;

      if (!userId || !tenantId || Array.isArray(id)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      // Verify user has permission to delete roles
      const hasPermission = await rbacService.hasPermission(userId, tenantId, 'sdk:roles:delete');
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: { 
            code: 'FORBIDDEN', 
            message: 'Insufficient permissions to delete roles' 
          }
        });
        return;
      }

      const deleted = await rbacService.deleteRole(id, tenantId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Role not found' }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete role error:', error);
      
      if (error.message.includes('Cannot delete system roles')) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: error.message }
        });
        return;
      }

      if (error.message.includes('assigned to users')) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: error.message }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to delete role' 
        }
      });
    }
  }

  /**
   * Assign role to user
   * POST /api/sdk/roles/:roleId/assign
   */
  async assignRole(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      const tenantId = req.apiKey?.tenant_id;
      const { roleId } = req.params;
      const { userId: targetUserId, expiresAt } = req.body;

      if (!userId || !tenantId || Array.isArray(roleId)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      if (!targetUserId) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'userId is required in request body' 
          }
        });
        return;
      }

      // Verify user has permission to assign roles
      const hasPermission = await rbacService.hasPermission(userId, tenantId, 'sdk:roles:assign');
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: { 
            code: 'FORBIDDEN', 
            message: 'Insufficient permissions to assign roles' 
          }
        });
        return;
      }

      const assignment = await rbacService.assignRole({
        userId: targetUserId,
        roleId,
        assignedBy: userId,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      res.status(201).json({
        success: true,
        data: assignment
      });
    } catch (error: any) {
      console.error('Assign role error:', error);
      
      if (error.message.includes('already has this role')) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: error.message }
        });
        return;
      }

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: error.message }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to assign role' 
        }
      });
    }
  }

  /**
   * Remove role assignment
   * DELETE /api/sdk/roles/:roleId/unassign/:userId
   */
  async removeRoleAssignment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      const tenantId = req.apiKey?.tenant_id;
      const { roleId, userId: targetUserId } = req.params;

      if (!userId || !tenantId || Array.isArray(roleId) || Array.isArray(targetUserId)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      // Verify user has permission to unassign roles
      const hasPermission = await rbacService.hasPermission(userId, tenantId, 'sdk:roles:assign');
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: { 
            code: 'FORBIDDEN', 
            message: 'Insufficient permissions to unassign roles' 
          }
        });
        return;
      }

      const removed = await rbacService.removeRoleAssignment(targetUserId, roleId);

      if (!removed) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Role assignment not found' }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Role assignment removed successfully'
      });
    } catch (error) {
      console.error('Remove role assignment error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to remove role assignment' 
        }
      });
    }
  }

  /**
   * Get user's roles
   * GET /api/sdk/users/:userId/roles
   */
  async getUserRoles(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.apiKey?.user_id;
      const tenantId = req.apiKey?.tenant_id;
      const { userId: targetUserId } = req.params;

      if (!userId || !tenantId || Array.isArray(targetUserId)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const roles = await rbacService.getUserRoles(targetUserId, tenantId);

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('Get user roles error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to get user roles' 
        }
      });
    }
  }

  /**
   * Check user permission
   * POST /api/sdk/permissions/check
   */
  async checkPermission(req: Request, res: Response): Promise<void> {
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

      const { userId: targetUserId, permission } = req.body;

      if (!targetUserId || !permission) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'userId and permission are required' 
          }
        });
        return;
      }

      const hasPermission = await rbacService.hasPermission(targetUserId, tenantId, permission);

      res.json({
        success: true,
        data: {
          userId: targetUserId,
          permission,
          hasPermission
        }
      });
    } catch (error) {
      console.error('Check permission error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to check permission' 
        }
      });
    }
  }
}

export const rbacController = new RBACController();
