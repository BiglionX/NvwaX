/**
 * 通用认证中间件 (Sprint 2.2.2 — OIDC RP 接入)
 *
 * 支持三种令牌（按优先级）：
 *   1. OIDC RS256 access_token（OIDC IdP 颁发）→ req.user（用户身份）
 *   2. 业务 HS256 JWT token（userService 颁发）    → req.user（用户身份）
 *   3. 管理员 HS256 JWT token（adminService 颁发）→ req.admin（管理员身份）
 *
 * 三者都不合法：401
 */
import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { adminService } from '../services/admin.service.js';
import { oidcTokenService } from '../services/oidc/oidc-token.service.js';

export async function universalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  let token: string | undefined;

  // 优先从 Authorization header 获取 token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.query.token) {
    // 支持从 URL 参数获取 token（用于 SSE EventSource）
    token = req.query.token as string;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '需要登录' },
    });
    return;
  }

  // 1. OIDC RS256 access_token
  try {
    const payload = await oidcTokenService.verifyAccessToken(token);
    const sub = typeof payload?.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
    if (sub) {
      req.user = {
        id: sub,
        email: typeof payload.email === 'string' ? payload.email : '',
      };
      req.currentUser = { id: sub, type: 'user' };
      next();
      return;
    }
  } catch {
    // 不是 OIDC token，fallback
  }

  // 2. 业务 HS256 JWT token
  const decodedUser = userService.verifyToken(token);

  if (decodedUser) {
    req.user = {
      id: decodedUser.userId,
      email: decodedUser.email,
    };
    req.currentUser = { id: decodedUser.userId, type: 'user' };
    next();
    return;
  }

  // 3. 管理员 HS256 JWT token
  const decodedAdmin = adminService.verifyToken(token);

  if (decodedAdmin) {
    req.admin = {
      id: decodedAdmin.adminId,
      username: decodedAdmin.username,
      role: decodedAdmin.role,
    };
    req.currentUser = { id: decodedAdmin.adminId, type: 'admin' };
    next();
    return;
  }

  // 都不是
  res.status(401).json({
    success: false,
    error: { code: 'INVALID_TOKEN', message: '无效的令牌' },
  });
}
