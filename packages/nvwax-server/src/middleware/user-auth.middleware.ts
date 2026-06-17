/**
 * User Auth Middleware (Sprint 2.2.2 — OIDC RP 接入)
 *
 * 验证顺序：
 *   1. 优先尝试 OIDC RS256 access_token（OIDC IdP 颁发）
 *      - 成功：req.user = { id: payload.sub, email: payload.email }
 *      - OIDC sub = nvwax-server users.id（同一 user 表）
 *   2. fallback 到旧 HS256 token（业务 API 旧 token，jsonwebtoken + JWT_SECRET）
 *      - 成功：req.user = { id: decoded.userId, email: decoded.email }
 *   3. 都失败：401
 *
 * 业务 API 路由只需要导入这一个中间件即可，OIDC 用户与老用户透明兼容。
 */

import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { oidcTokenService } from '../services/oidc/oidc-token.service.js';

export async function userAuthMiddleware(
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

  // ── 1. 优先 OIDC RS256 access_token ──
  try {
    const payload = await oidcTokenService.verifyAccessToken(token);
    const sub = typeof payload?.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
    if (sub) {
      // OIDC access_token 不含 email claim；call site 需要时需走 /oauth/userinfo 拿
      req.user = {
        id: sub, // OIDC sub = nvwax-server users.id（同一表）
        email: typeof payload.email === 'string' ? payload.email : '',
      };
      next();
      return;
    }
  } catch {
    // 不是 OIDC token（HS256 格式 / 过期 / 签名错）→ fallback 旧验证
  }

  // ── 2. fallback HS256 业务 token ──
  const decoded = userService.verifyToken(token);

  if (!decoded) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: '无效的令牌' },
    });
    return;
  }

  // 将用户信息附加到 request 对象
  req.user = {
    id: decoded.userId,
    email: decoded.email,
  };

  next();
}
