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
  }
};
