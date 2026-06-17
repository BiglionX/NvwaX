import axios from 'axios';

/**
 * 通用 API client（Sprint 2.2 改造后）
 *
 * 鉴权模式从 localStorage JWT 切换为 OIDC httpOnly cookie：
 *   - request 拦截器不再注入 Authorization（走 /api/auth/proxy 才带 token）
 *   - 401 不再清 localStorage（cookie 由 /api/auth/session DELETE 清理）
 *   - 仅保留跳转 /login 的兜底（避免在登录页上 loop）
 */

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor：不再读 localStorage token（走 proxy 才带 token）
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 未授权：不重定向（业务调用点可能能处理 401 优雅降级）
      // 跳 /login 由 useAuth / 中间件负责
    }
    return Promise.reject(error);
  }
);

export default apiClient;
