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
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      error: { code: 'UNAUTHORIZED', message: '需要登录' } 
    });
  }

  const token = authHeader.slice(7);
  
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
