import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';

// 扩展 Express Request 类型以包含 user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export function userAuthMiddleware(req: Request, res: Response, next: NextFunction) {
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

  // 验证 JWT token
  const decoded = userService.verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ 
      success: false,
      error: { code: 'INVALID_TOKEN', message: '无效的令牌' } 
    });
  }

  // 将用户信息附加到 request 对象
  req.user = {
    id: decoded.userId,
    email: decoded.email
  };
  
  next();
}
