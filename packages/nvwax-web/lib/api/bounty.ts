/**
 * 悬赏系统 API 客户端
 */

import apiClient from './client';
import { authedJson } from '@/lib/oidc/authed-fetch';

export interface Bounty {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  rewardAmount: number;
  currency: string;
  status: 'open' | 'claimed' | 'submitted' | 'verified' | 'completed' | 'cancelled';
  creatorId: string;
  claimerId?: string;
  submissionUrl?: string;
  verificationNotes?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  claimedAt?: string;
  submittedAt?: string;
  verifiedAt?: string;
  completedAt?: string;
}

export interface CreateBountyInput {
  title: string;
  description: string;
  requiredSkills: string[];
  rewardAmount: number;
  currency?: string;
  deadline?: string;
}

export interface BountyListResponse {
  bounties: Bounty[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const bountyApi = {
  /**
   * 获取悬赏列表
   */
  async getBounties(params?: {
    status?: string;
    creatorId?: string;
    claimerId?: string;
    skill?: string;
    searchQuery?: string;
    minReward?: number;
    page?: number;
    limit?: number;
  }): Promise<BountyListResponse> {
    const response = await apiClient.get('/bounties', { params });
    return response.data.data;
  },

  /**
   * 获取我发布的悬赏
   */
  async getMyPublishedBounties(userId: string, params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<BountyListResponse> {
    const response = await apiClient.get('/bounties', { 
      params: { 
        creatorId: userId,
        ...params 
      } 
    });
    return response.data.data;
  },

  /**
   * 获取我领取的悬赏
   */
  async getMyClaimedBounties(userId: string, params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<BountyListResponse> {
    const response = await apiClient.get('/bounties', { 
      params: { 
        claimerId: userId,
        ...params 
      } 
    });
    return response.data.data;
  },

  /**
   * 获取悬赏详情
   */
  async getBountyById(id: string): Promise<Bounty> {
    const response = await apiClient.get(`/bounties/${id}`);
    return response.data.data;
  },

  /**
   * 创建悬赏（受保护：userAuthMiddleware）
   */
  async createBounty(data: CreateBountyInput): Promise<Bounty> {
    const response = await authedJson<{ success: boolean; data: Bounty }>('/bounties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * 领取悬赏（受保护：userAuthMiddleware）
   */
  async claimBounty(id: string): Promise<Bounty> {
    const response = await authedJson<{ success: boolean; data: Bounty }>(`/bounties/${id}/claim`, {
      method: 'POST',
    });
    return response.data;
  },

  /**
   * 提交成果（受保护：userAuthMiddleware）
   */
  async submitBounty(id: string, submissionUrl: string): Promise<Bounty> {
    const response = await authedJson<{ success: boolean; data: Bounty }>(`/bounties/${id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionUrl }),
    });
    return response.data;
  },

  /**
   * 验证悬赏（受保护：userAuthMiddleware）
   */
  async verifyBounty(id: string, approved: boolean, notes?: string): Promise<Bounty> {
    const response = await authedJson<{ success: boolean; data: Bounty }>(`/bounties/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved, notes }),
    });
    return response.data;
  },

  /**
   * 取消悬赏（受保护：userAuthMiddleware）
   */
  async cancelBounty(id: string): Promise<Bounty> {
    const response = await authedJson<{ success: boolean; data: Bounty }>(`/bounties/${id}`, {
      method: 'DELETE',
    });
    return response.data;
  },

  /**
   * 获取热门搜索词
   */
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    const response = await apiClient.get('/bounties/popular-searches', {
      params: { limit }
    });
    return response.data.data;
  },

  /**
   * 获取搜索建议
   */
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.trim().length < 1) {
      return [];
    }
    const response = await apiClient.get('/bounties/suggestions', {
      params: { q: query, limit }
    });
    return response.data.data;
  },
};
