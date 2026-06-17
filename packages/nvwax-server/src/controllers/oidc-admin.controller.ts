/**
 * OIDC RP Admin Controller（Sprint 2.9）
 *
 * 4 个端点（挂 authMiddleware）：
 * - POST   /api/admin/oidc/clients             注册 RP（一次性返回明文 client_secret）
 * - GET    /api/admin/oidc/clients             列表（分页 + 搜索 + includeRevoked）
 * - DELETE /api/admin/oidc/clients/:id         撤销（软删 is_active=false）
 * - POST   /api/admin/oidc/clients/:id/rotate-secret  轮换 client_secret（一次性返回）
 *
 * 鉴权：req.admin 由 auth.middleware.ts 写入；controller 直接信任。
 * 审计：每次写操作调 adminService.logAction 记录 system_logs。
 */

import { Request, Response } from 'express';
import { oidcClientService, RPValidationError } from '../services/oidc/oidc-client.service.js';
import { adminService } from '../services/admin.service.js';

export class OidcAdminController {
  /**
   * POST /api/admin/oidc/clients
   * 注册 RP 客户端。
   * Body: { name, redirect_uris: string[], allowed_scopes: string[], ...可选 }
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, redirect_uris, allowed_scopes, allowed_grant_types, require_pkce, token_endpoint_auth_method } =
        req.body || {};

      const rp = await oidcClientService.registerRP({
        name,
        redirect_uris,
        allowed_scopes,
        allowed_grant_types,
        require_pkce,
        token_endpoint_auth_method,
      });

      // 审计
      await adminService.logAction(
        'info',
        'REGISTER_RP',
        req.admin?.id,
        `Registered OIDC RP "${rp.name}" with client_id=${rp.client_id}`,
        req.ip,
      );

      res.status(201).json({
        success: true,
        data: {
          client_id: rp.client_id,
          client_secret: rp.client_secret, // ⚠ 明文，仅此一次返回
          name: rp.name,
          redirect_uris: rp.redirect_uris,
          allowed_scopes: rp.allowed_scopes,
          allowed_grant_types: rp.allowed_grant_types,
          require_pkce: rp.require_pkce,
          token_endpoint_auth_method: rp.token_endpoint_auth_method,
          is_active: rp.is_active,
          created_at: rp.created_at,
        },
        warning: '请立即保存 client_secret，生成后不再显示',
      });
    } catch (err) {
      if (err instanceof RPValidationError) {
        res.status(400).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error('[oidc-admin] register failed:', message);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '注册 RP 失败' },
      });
    }
  };

  /**
   * GET /api/admin/oidc/clients?page=1&limit=20&search=&includeRevoked=false
   * 列表（不含 client_secret_hash）。
   */
  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const search = req.query.search as string | undefined;
      const includeRevokedRaw = req.query.includeRevoked as string | undefined;
      const includeRevoked = includeRevokedRaw === 'true' || includeRevokedRaw === '1';

      const result = await oidcClientService.listRPs({
        page: Number.isFinite(page) ? page : 1,
        limit: Number.isFinite(limit) ? limit : 20,
        search,
        includeRevoked,
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[oidc-admin] list failed:', message);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '获取 RP 列表失败' },
      });
    }
  };

  /**
   * DELETE /api/admin/oidc/clients/:id
   * 撤销 RP（软删）。
   */
  revoke = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const clientId = Array.isArray(id) ? id[0] : id;
      if (!clientId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'client_id 不能为空' },
        });
        return;
      }

      // 撤销前查一下，方便审计记录 name
      const existing = await oidcClientService.getRP(clientId);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'RP 不存在' },
        });
        return;
      }
      if (!existing.is_active) {
        res.status(409).json({
          success: false,
          error: { code: 'ALREADY_REVOKED', message: 'RP 已被撤销' },
        });
        return;
      }

      const ok = await oidcClientService.revokeRP(clientId);
      if (!ok) {
        // 极小概率竞争：刚查完 active、撤销时已被另一进程撤销
        res.status(409).json({
          success: false,
          error: { code: 'ALREADY_REVOKED', message: 'RP 已被撤销' },
        });
        return;
      }

      await adminService.logAction(
        'warning',
        'REVOKE_RP',
        req.admin?.id,
        `Revoked OIDC RP "${existing.name}" (client_id=${clientId})`,
        req.ip,
      );

      res.json({
        success: true,
        message: 'RP 已撤销（软删）',
        data: { client_id: clientId, is_active: false },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[oidc-admin] revoke failed:', message);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '撤销 RP 失败' },
      });
    }
  };

  /**
   * POST /api/admin/oidc/clients/:id/rotate-secret
   * 轮换 client_secret，返回新明文。
   */
  rotateSecret = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const clientId = Array.isArray(id) ? id[0] : id;
      if (!clientId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'client_id 不能为空' },
        });
        return;
      }

      const existing = await oidcClientService.getRP(clientId);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'RP 不存在' },
        });
        return;
      }

      let rotated;
      try {
        rotated = await oidcClientService.rotateSecret(clientId);
      } catch (err) {
        // service.rotateSecret 在 clientId 不存在时 throw 'RP not found'
        if (err instanceof Error && err.message === 'RP not found') {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'RP 不存在' },
          });
          return;
        }
        throw err;
      }

      await adminService.logAction(
        'info',
        'ROTATE_RP_SECRET',
        req.admin?.id,
        `Rotated client_secret for RP "${existing.name}" (client_id=${clientId})`,
        req.ip,
      );

      res.json({
        success: true,
        data: {
          client_id: rotated.client_id,
          client_secret: rotated.client_secret, // ⚠ 明文，仅此一次返回
          rotated_at: rotated.rotated_at,
        },
        warning: '请立即保存新 client_secret，旧 secret 即刻失效',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[oidc-admin] rotateSecret failed:', message);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '轮换 client_secret 失败' },
      });
    }
  };
}

export const oidcAdminController = new OidcAdminController();