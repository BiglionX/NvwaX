import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import { oidcTokenService } from '../services/oidc/oidc-token.service.js';
import { userService } from '../services/user.service.js';

/**
 * Admin 认证中间件（Sprint 2.4 重构）
 *
 * 策略 1（优先）：OIDC access_token（jose RS256）
 *   - 解析 sub → userService.getUserById → 查 admins 表（isAdminByEmail）
 *   - 是 admin 才放行
 *
 * 策略 2（fallback）：admin_token（jsonwebtoken HS256，JWT_SECRET）
 *   - 兼容老 admins 表独立登录
 *   - 标 @deprecated，Sprint 2.4 起新流程走 OIDC
 *
 * 任一策略通过即设置 req.admin 并 next；都失败则 401。
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: { code: 'MISSING_AUTH', message: 'Authorization header is required' },
    });
  }

  // 支持 "Bearer <token>" 格式
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  // ──────────── 策略 1: OIDC access_token（jose RS256）────────────
  try {
    const payload = await oidcTokenService.verifyAccessToken(token);
    const sub = payload.sub;
    if (sub && typeof sub === 'string') {
      const user = await userService.getUserById(sub);
      if (user) {
        // 用 DB admins 表判定管理员身份（fail-secure：异常 → 落 fallback，由 fallback 再判一次）
        let isAdmin = false;
        try {
          isAdmin = await adminService.isAdminByEmail(user.email);
        } catch {
          isAdmin = false;
        }
        if (isAdmin) {
          req.admin = {
            id: user.id,
            email: user.email,
            username: user.email,
            role: 'admin',
          };
          return next();
        }
      }
    }
  } catch {
    // OIDC 验证失败（签名错/过期/alg 不匹配等）→ 落 fallback
  }

  // ──────────── 策略 2: admin_token（HS256 JWT_SECRET，兼容老流程）────────────
  const decoded = adminService.verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
    });
  }

  const admin = await adminService.getAdminById(decoded.adminId);
  if (!admin) {
    return res.status(401).json({
      success: false,
      error: { code: 'ADMIN_NOT_FOUND', message: 'Admin account not found' },
    });
  }

  req.admin = {
    id: decoded.adminId,
    email: admin.email,
    username: decoded.username,
    role: decoded.role,
  };

  return next();
}
