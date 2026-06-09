import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import '../types/express.d.js';

/**
 * Admin 认证中间件
 * 使用 JWT 验证管理员身份
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      success: false,
      error: { code: 'MISSING_AUTH', message: 'Authorization header is required' }
    });
  }

  // 支持 "Bearer <token>" 格式
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;
  
  // 验证 JWT token
  const decoded = adminService.verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ 
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired admin token' }
    });
  }

  // 验证管理员是否存在（可选：可以注释掉以提高性能）
  const admin = await adminService.getAdminById(decoded.adminId);
  if (!admin) {
    return res.status(401).json({ 
      success: false,
      error: { code: 'ADMIN_NOT_FOUND', message: 'Admin account not found' }
    });
  }

  // 将管理员信息附加到 request 对象
  req.admin = {
    id: decoded.adminId,
    username: decoded.username,
    role: decoded.role
  };
  
  next();
}
