import 'express';

// 用户认证信息
export interface UserAuthInfo {
  id: string;
  email: string;
}

// 管理员认证信息
export interface AdminAuthInfo {
  id: string;
  username: string;
  role: string;
}

// 统一用户对象
export interface CurrentUserInfo {
  id: string;
  type: 'user' | 'admin';
}

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: UserAuthInfo;
      admin?: AdminAuthInfo;
      currentUser?: CurrentUserInfo;
    }
  }
}
