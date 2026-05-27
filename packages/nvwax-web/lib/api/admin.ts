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
  const token = localStorage.getItem('admin_token');
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
      // 管理员 401，清除管理员 token 并跳转到管理员登录页
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_info');
      // 只有在不在登录页时才跳转，避免循环
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface Admin {
  id: string;
  username: string;
  email: string;
  name?: string;
  role: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  bio?: string;
  isBanned?: boolean;
  banReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status?: string;
  reviewNotes?: string;
  userEmail?: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  message: string;
  data: {
    admin: Admin;
    token: string;
  };
}

export const adminApi = {
  // 登录
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/admin/login', { username, password });
    return response.data;
  },

  // 获取当前管理员信息
  getProfile: async (): Promise<Admin> => {
    const response = await api.get('/admin/profile');
    return response.data.data;
  },

  // 更新管理员信息
  updateProfile: async (data: Partial<Pick<Admin, 'name' | 'email' | 'avatar'>>): Promise<Admin> => {
    const response = await api.put('/admin/profile', data);
    return response.data.data;
  },

  // 修改密码
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await api.post('/admin/change-password', { oldPassword, newPassword });
  },

  // 获取所有管理员
  getAllAdmins: async (): Promise<Admin[]> => {
    const response = await api.get('/admin/admins');
    return response.data.data;
  },

  // 创建管理员
  createAdmin: async (data: { username: string; password: string; email: string; name?: string; role?: string }): Promise<Admin> => {
    const response = await api.post('/admin/admins', data);
    return response.data.data;
  },

  // 删除管理员
  deleteAdmin: async (id: string): Promise<void> => {
    await api.delete(`/admin/admins/${id}`);
  },

  // 获取系统统计
  getSystemStats: async () => {
    const response = await api.get('/admin/system/stats');
    return response.data.data;
  },

  // 获取系统日志
  getSystemLogs: async (page: number = 1, limit: number = 20) => {
    const response = await api.get('/admin/system/logs', { params: { page, limit } });
    return response.data;
  },

  // ========== 爬虫管理 ==========

  // 获取爬虫状态和统计
  getCrawlerStatus: async () => {
    const response = await api.get('/admin/crawler/status');
    return response.data.data;
  },

  // 手动触发爬虫
  triggerCrawler: async () => {
    const response = await api.post('/admin/crawler/trigger');
    return response.data;
  },

  // 更新爬虫配置
  updateCrawlerConfig: async (intervalHours: number) => {
    const response = await api.put('/admin/crawler/config', { intervalHours });
    return response.data;
  },

  // 获取爬取历史
  getCrawlerHistory: async (limit: number = 20) => {
    const response = await api.get('/admin/crawler/history', { params: { limit } });
    return response.data;
  },

  // 清理旧数据
  cleanOldAgents: async (days: number) => {
    const response = await api.post('/admin/crawler/clean', { days });
    return response.data;
  },

  // ========== 用户管理 ==========

  // 获取用户列表（分页）
  getUserList: async (page: number = 1, limit: number = 20, search?: string) => {
    const params: Record<string, string | number> = { page, limit };
    if (search) params.search = search;
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  // 获取用户统计信息
  getUserStats: async () => {
    const response = await api.get('/admin/users/stats');
    return response.data.data;
  },

  // 封禁用户
  banUser: async (userId: string, reason?: string) => {
    const response = await api.post(`/admin/users/${userId}/ban`, { reason });
    return response.data;
  },

  // 解封用户
  unbanUser: async (userId: string) => {
    const response = await api.post(`/admin/users/${userId}/unban`);
    return response.data;
  },

  // ========== 项目管理 ==========

  // 获取项目列表（分页）
  getProjectList: async (page: number = 1, limit: number = 20, search?: string, status?: string) => {
    const params: Record<string, string | number> = { page, limit };
    if (search) params.search = search;
    if (status) params.status = status;
    const response = await api.get('/admin/projects', { params });
    return response.data;
  },

  // 获取项目统计信息
  getProjectStats: async () => {
    const response = await api.get('/admin/projects/stats');
    return response.data.data;
  },

  // 审核项目
  reviewProject: async (projectId: string, approved: boolean, notes?: string) => {
    const response = await api.post(`/admin/projects/${projectId}/review`, { approved, notes });
    return response.data;
  },

  // 下架项目
  suspendProject: async (projectId: string, reason?: string) => {
    const response = await api.post(`/admin/projects/${projectId}/suspend`, { reason });
    return response.data;
  },

  // 恢复项目
  restoreProject: async (projectId: string) => {
    const response = await api.post(`/admin/projects/${projectId}/restore`);
    return response.data;
  },

  // ========== 系统管理 ==========

  // 获取系统健康状态
  getSystemHealth: async () => {
    const response = await api.get('/admin/system/health');
    return response.data.data;
  },

  // 清理系统缓存
  clearCache: async () => {
    const response = await api.post('/admin/system/clear-cache');
    return response.data;
  },

  // 数据库备份
  backupDatabase: async () => {
    const response = await api.post('/admin/system/backup');
    return response.data;
  },

  // ========== AI 业务管理 ==========

  // 获取 Agent 列表（分页）
  getAgentList: async (page: number = 1, limit: number = 20, search?: string) => {
    const params: Record<string, string | number> = { page, limit };
    if (search) params.search = search;
    const response = await api.get('/admin/agents', { params });
    return response.data;
  },

  // 获取虚拟公司打包任务列表
  getVirtualCompanyBuilds: async () => {
    const response = await api.get('/admin/virtual-companies/builds');
    return response.data;
  },

  // 发送系统公告
  sendAnnouncement: async (data: { title: string; message: string; priority?: string }) => {
    const response = await api.post('/admin/notifications/announce', data);
    return response.data;
  },

  // ========== Token 配额管理 ==========

  // 获取Token总览统计
  getTokenOverview: async () => {
    const response = await api.get('/admin/tokens/overview');
    return response.data.data;
  },

  // 获取用户Token统计列表（分页）
  getTokenUsersList: async (page: number = 1, limit: number = 20, search?: string) => {
    const params: Record<string, string | number> = { page, limit };
    if (search) params.search = search;
    const response = await api.get('/admin/tokens/users', { params });
    return response.data;
  },

  // 获取单个用户的Token消耗明细
  getTokenUserDetail: async (userId: string, page: number = 1, limit: number = 20, sourceType?: string) => {
    const params: Record<string, string | number> = { page, limit };
    if (sourceType) params.sourceType = sourceType;
    const response = await api.get(`/admin/tokens/users/${userId}`, { params });
    return response.data.data;
  },

  // 获取Token消耗来源分类统计
  getTokenConsumptionBreakdown: async (period: 'day' | 'week' | 'month' = 'month') => {
    const response = await api.get('/admin/tokens/consumption-breakdown', { params: { period } });
    return response.data.data;
  },

  // 手动重置月度配额
  resetMonthlyQuotas: async () => {
    const response = await api.post('/admin/tokens/reset-monthly');
    return response.data;
  },

  // ========== 支付配置管理 ==========

  // 获取支付配置列表
  getPaymentConfigs: async () => {
    const response = await api.get('/admin/payment-configs');
    return response.data.data;
  },

  // 保存/更新支付配置
  savePaymentConfig: async (data: {
    provider: string;
    provider_label: string;
    qr_code_url?: string;
    account_name?: string;
    account_info?: string;
    sort_order?: number;
  }) => {
    const response = await api.post('/admin/payment-configs', data);
    return response.data.data;
  },

  // 启用/禁用支付配置
  togglePaymentConfig: async (provider: string, enabled: boolean) => {
    const response = await api.post(`/admin/payment-configs/${provider}/toggle`, { enabled });
    return response.data.data;
  },

  // 获取Token订单列表
  getTokenOrders: async (page: number = 1, limit: number = 20, status?: string) => {
    const params: Record<string, string | number> = { page, limit };
    if (status) params.status = status;
    const response = await api.get('/admin/token-orders', { params });
    return response.data;
  },

  // 确认Token订单付款
  confirmTokenOrder: async (orderId: string) => {
    const response = await api.post(`/admin/token-orders/${orderId}/confirm`);
    return response.data.data;
  },

  // 取消Token订单
  cancelTokenOrder: async (orderId: string) => {
    const response = await api.post(`/admin/token-orders/${orderId}/cancel`);
    return response.data.data;
  }
};
