import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // 优先使用普通用户 token，如果没有则使用管理员 token
    let token = localStorage.getItem('user_token') || localStorage.getItem('token');
    
    // 如果都没有，尝试使用管理员 token
    if (!token) {
      token = localStorage.getItem('admin_token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
      // Handle unauthorized access
      // 检查是否是管理员账号
      const adminInfo = localStorage.getItem('admin_info');
      
      // 如果是管理员访问普通用户 API 返回 401，不要重定向（这是正常的）
      // 例如：管理员调用 /api/notifications/unread-count 会返回 401
      if (adminInfo) {
        console.log('[API Client] Admin got 401 from user API, ignoring...');
        // 不重定向，只是拒绝 promise
        return Promise.reject(error);
      }
      
      // 普通用户 401，清除用户 token 并跳转到用户登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
