import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  projectCount: number;
  teamCount: number;
  agentTeamCount: number;
}

export const userApi = {
  // 获取用户信息
  getProfile: async (userId: string): Promise<User> => {
    const response = await api.get('/user/profile', { params: { userId } });
    return response.data;
  },

  // 更新用户信息
  updateProfile: async (userId: string, data: Partial<Pick<User, 'name' | 'avatar' | 'bio'>>): Promise<User> => {
    const response = await api.put(`/user/${userId}`, data);
    return response.data;
  },

  // 获取用户统计
  getStats: async (userId: string): Promise<UserStats> => {
    const response = await api.get('/user/stats', { params: { userId } });
    return response.data;
  },

  // ========== Token相关 ==========

  // 获取Token配额和消耗
  getTokenQuota: async (userId: string) => {
    const response = await api.get('/user/token/quota', { params: { userId } });
    return response.data.data;
  },

  // 获取Token消费记录
  getTokenTransactions: async (userId: string, page: number = 1, limit: number = 20) => {
    const response = await api.get('/user/token/transactions', { params: { userId, page, limit } });
    return response.data;
  },

  // 获取Token购买订单
  getTokenOrders: async (userId: string, page: number = 1, limit: number = 20) => {
    const response = await api.get('/user/token/orders', { params: { userId, page, limit } });
    return response.data;
  },

  // 创建Token购买订单
  createTokenOrder: async (userId: string, amount: number, paymentMethod: string) => {
    const response = await api.post('/user/token/create-order', { userId, amount, paymentMethod });
    return response.data.data;
  },

  // 获取可用的支付方式
  getPaymentConfigs: async () => {
    const response = await api.get('/user/token/payment-configs');
    return response.data.data;
  }
};
