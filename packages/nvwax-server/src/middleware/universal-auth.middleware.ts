import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { adminService } from '../services/admin.service.js';

/**
 * 通用认证中间件
 * 支持用户 JWT token 和管理员 JWT token
 */
export function universalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
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
    return res.status(401).json({ 
      success: false,
      error: { code: 'UNAUTHORIZED', message: '需要登录' } 
    });
  }

  // 尝试作为普通用户 JWT token 验证
  const decodedUser = userService.verifyToken(token);
  
  if (decodedUser) {
    // 是普通用户
    req.user = {
      id: decodedUser.userId,
      email: decodedUser.email
    };
    req.currentUser = {
      id: decodedUser.userId,
      type: 'user'
    };
    return next();
  }

  // 尝试作为管理员 JWT token 验证
  const decodedAdmin = adminService.verifyToken(token);
  
  if (decodedAdmin) {
    // 是管理员
    req.admin = {
      id: decodedAdmin.adminId,
      username: decodedAdmin.username,
      role: decodedAdmin.role
    };
    req.currentUser = {
      id: decodedAdmin.adminId,
      type: 'admin'
    };
    return next();
  }

  // 如果都不是，返回未授权
  return res.status(401).json({ 
    success: false,
    error: { code: 'INVALID_TOKEN', message: '无效的令牌' } 
  });
}
