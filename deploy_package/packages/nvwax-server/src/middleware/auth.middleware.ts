import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      admin?: any;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  
  // 简单的 token 验证（实际应用中应该验证 JWT）
  if (!token.startsWith('admin_')) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // 从 token 中提取 admin ID
  const adminId = token.split('_')[1];
  const admin = await adminService.getAdminById(adminId);

  if (!admin) {
    return res.status(401).json({ error: 'Admin not found' });
  }

  // 将管理员信息附加到 request 对象
  req.admin = { ...admin, password: undefined };
  next();
}
