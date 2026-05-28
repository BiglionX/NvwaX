import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 添加请求拦截器，自动添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 添加响应拦截器，处理 401 错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 普通用户 401，清除用户 token 并跳转到用户登录页
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
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
  // 注册
  register: async (email: string, password: string, name?: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },

  // 登录
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

  // 登出
  logout: () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_info');
  }
};
