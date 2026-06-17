/**
 * OIDC RP Admin Routes（Sprint 2.9）
 *
 * 挂载在 /api/admin/oidc/clients（Sprint 2.9 决策：沿用现有 admin 命名空间）。
 * 所有路由必须经 authMiddleware（双策略：OIDC RS256 access_token / admin HS256 JWT）。
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { oidcAdminController } from '../controllers/oidc-admin.controller.js';

const router = Router();

// 所有端点必须 admin 鉴权
router.use(authMiddleware);

// POST /api/admin/oidc/clients               — 注册 RP（一次性返回明文 secret）
router.post('/', oidcAdminController.register);

// GET  /api/admin/oidc/clients               — 列表
router.get('/', oidcAdminController.list);

// DELETE /api/admin/oidc/clients/:id         — 撤销（软删）
router.delete('/:id', oidcAdminController.revoke);

// POST /api/admin/oidc/clients/:id/rotate-secret — 轮换 secret
router.post('/:id/rotate-secret', oidcAdminController.rotateSecret);

export default router;