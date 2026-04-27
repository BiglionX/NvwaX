/**
 * 悬赏系统 API 客户端
 */

import apiClient from './client';

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
   * 创建悬赏
   */
  async createBounty(data: CreateBountyInput): Promise<Bounty> {
    const response = await apiClient.post('/bounties', data);
    return response.data.data;
  },

  /**
   * 领取悬赏
   */
  async claimBounty(id: string): Promise<Bounty> {
    const response = await apiClient.post(`/bounties/${id}/claim`);
    return response.data.data;
  },

  /**
   * 提交成果
   */
  async submitBounty(id: string, submissionUrl: string): Promise<Bounty> {
    const response = await apiClient.post(`/bounties/${id}/submit`, { submissionUrl });
    return response.data.data;
  },

  /**
   * 验证悬赏
   */
  async verifyBounty(id: string, approved: boolean, notes?: string): Promise<Bounty> {
    const response = await apiClient.post(`/bounties/${id}/verify`, { approved, notes });
    return response.data.data;
  },

  /**
   * 取消悬赏
   */
  async cancelBounty(id: string): Promise<Bounty> {
    const response = await apiClient.delete(`/bounties/${id}`);
    return response.data.data;
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
