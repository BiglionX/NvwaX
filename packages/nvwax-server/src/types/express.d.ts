/// <reference types="express" />

// 用户认证信息
export interface UserAuthInfo {
  id: string;
  email: string;
}

// 管理员认证信息
// Sprint 2.4 扩展：AdminAuthInfo 加 email 字段；username 改 optional（OIDC 流程用 email 当 username）
export interface AdminAuthInfo {
  id: string;
  email?: string;
  username?: string;
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
      // Sprint 2 — pc-session middleware 写入；类型增强集中于此，
      // 避免依赖 pc-session.middleware.ts 内部的 declare module 生效时机。
      sessionUser?: {
        id: string;
        csrf: string;
      };
    }
  }
}
