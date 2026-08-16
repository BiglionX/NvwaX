import axios from 'axios';

/**
 * Auth API client（Sprint 2.2 改造后）
 *
 * 鉴权模式从 localStorage JWT 切换为 OIDC httpOnly cookie：
 *   - 业务请求由前端组件用 `authedFetch('/api/auth/proxy?path=...')` 转发，
 *     API Route 读 nvwax_oidc_session cookie 注入 Authorization 头
 *   - 此 axios 实例仍保留以兼容旧调用点，但：
 *     · request 拦截器不再注入 Authorization（走 proxy 才带 token）
 *     · response 401 不再清 localStorage（cookie 由 /api/auth/session DELETE 清理）
 *   - register / social-login 旧 JWT 注册 API 保留，登录后跳 /login 走 OIDC
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器：不再注入 Authorization（走 /api/auth/proxy 才带 token）
api.interceptors.request.use((config) => {
  return config;
});

// 响应拦截器：401 不再清 localStorage（cookie 由 /api/auth/session DELETE 清理）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 只有在不在登录页时才跳转，避免循环
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface SocialAccountInfo {
  id: string;
  provider: 'facebook' | 'wechat' | 'github' | 'google';
  providerUserId: string;
  providerEmail?: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface SocialLoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: User;
    isNewUser: boolean;
  };
  error?: { code: string; message: string };
}

export const authApi = {
  /**
   * @deprecated Sprint 2.12 — 站内注册已下线（统一走 account-portal /portal/register/）。
   * 后端 /api/auth/register 已返回 410 Gone。保留定义仅为避免遗留调用点编译错误。
   */
  register: async (email: string, password: string, name?: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },

  /**
   * @deprecated Sprint 2.12 — 站内密码登录已下线（统一走 OIDC）。
   * 后端 /api/auth/login 已返回 410 Gone。
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // Facebook 登录
  facebookLogin: async (accessToken: string): Promise<SocialLoginResponse> => {
    const response = await api.post('/auth/facebook/login', { accessToken });
    return response.data;
  },

  // Google 登录
  googleLogin: async (credential: string): Promise<SocialLoginResponse> => {
    const response = await api.post('/auth/google/login', { credential });
    return response.data;
  },

  // GitHub 登录
  githubLogin: async (code: string, redirectUri?: string): Promise<SocialLoginResponse> => {
    const response = await api.post('/auth/github/login', { code, redirectUri });
    return response.data;
  },

  // GitHub 获取授权 URL
  githubAuthorize: async (redirectUri: string, state?: string): Promise<{ success: boolean; data: { authorizeUrl: string; state: string } }> => {
    const params = new URLSearchParams({ redirectUri });
    if (state) params.set('state', state);
    const response = await api.get(`/auth/github/authorize?${params.toString()}`);
    return response.data;
  },

  // 获取当前用户信息
  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // 获取当前用户绑定的社交账号
  getSocialAccounts: async (): Promise<{ success: boolean; data: SocialAccountInfo[] }> => {
    const response = await api.get('/auth/social/accounts');
    return response.data;
  },

  // 绑定社交账号
  bindSocialAccount: async (provider: string, accessToken: string): Promise<{ success: boolean; message?: string }> => {
    const response = await api.post('/auth/social/bind', { provider, accessToken });
    return response.data;
  },

  // 解绑社交账号
  unbindSocialAccount: async (provider: string, providerUserId: string): Promise<{ success: boolean; message?: string }> => {
    const response = await api.post('/auth/social/unbind', { provider, providerUserId });
    return response.data;
  },

  // 登出（Sprint 2.2 改造后：由 useAuth().logout() → DELETE /api/auth/session 处理）
  // 此方法保留仅为向后兼容，不再操作 localStorage
  logout: () => {
    // no-op: OIDC cookie 清理由 /api/auth/session DELETE 负责
  },
};
