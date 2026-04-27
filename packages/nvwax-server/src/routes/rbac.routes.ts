import { Router } from 'express';
import { rbacController } from '../controllers/rbac.controller.js';
import { apiKeyAuthMiddleware, requirePermission } from '../middleware/api-key-auth.middleware.js';

const router = Router();

// All RBAC routes require API key authentication
router.use(apiKeyAuthMiddleware);

// Role management routes
router.post('/roles', requirePermission('sdk:roles:create'), rbacController.createRole.bind(rbacController));
router.get('/roles', requirePermission('sdk:roles:read'), rbacController.listRoles.bind(rbacController));
router.get('/roles/:id', requirePermission('sdk:roles:read'), rbacController.getRole.bind(rbacController));
router.put('/roles/:id', requirePermission('sdk:roles:update'), rbacController.updateRole.bind(rbacController));
router.delete('/roles/:id', requirePermission('sdk:roles:delete'), rbacController.deleteRole.bind(rbacController));

// Role assignment routes
router.post('/roles/:roleId/assign', requirePermission('sdk:roles:assign'), rbacController.assignRole.bind(rbacController));
router.delete('/roles/:roleId/unassign/:userId', requirePermission('sdk:roles:assign'), rbacController.removeRoleAssignment.bind(rbacController));

// User roles query
router.get('/users/:userId/roles', requirePermission('sdk:roles:read'), rbacController.getUserRoles.bind(rbacController));

// Permission check
router.post('/permissions/check', requirePermission('sdk:permissions:check'), rbacController.checkPermission.bind(rbacController));

export default router;
