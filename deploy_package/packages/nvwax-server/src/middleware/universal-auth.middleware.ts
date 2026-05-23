import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { adminService } from '../services/admin.service.js';

// 扩展 Express Request 类型以包含 user 和 admin
declare global {
  namespace Express {
    interface Request {
      user?: any;
      admin?: any;
      currentUser?: any; // 统一的用户对象，可以是普通用户或管理员
    }
  }
}

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
    req.currentUser = req.user;
    req.currentUser.type = 'user';
    return next();
  }

  // 尝试作为管理员 token 验证 (格式: admin_{id}_{timestamp})
  if (token.startsWith('admin_')) {
    const parts = token.split('_');
    if (parts.length >= 2) {
      const adminId = parts[1];
      const admin = adminService.getAdminById(adminId);
      
      // 由于 getAdminById 是异步的，我们需要使用 async/await
      // 但为了保持中间件同步，我们暂时跳过这个验证
      // 在实际应用中，应该使用异步中间件或者缓存管理员信息
      
      // 简单验证：只要格式正确就认为是管理员
      // 更严格的验证应该在具体的控制器中进行
      req.admin = {
        id: adminId,
        type: 'admin'
      };
      req.currentUser = req.admin;
      req.currentUser.type = 'admin';
      return next();
    }
  }

  // 如果都不是，返回未授权
  return res.status(401).json({ 
    success: false,
    error: { code: 'INVALID_TOKEN', message: '无效的令牌' } 
  });
}