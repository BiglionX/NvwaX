import apiClient from './client';

/**
 * AiTeam 成员定义
 */
export interface AiTeamMember {
  agentId: string;
  role: string;
  responsibilities?: string;
  config?: Record<string, unknown>;
  sortOrder?: number;
}

/**
 * AiTeam 定义
 */
export interface AiTeam {
  id: string;
  userId: string;
  name: string;
  description?: string;
  members: AiTeamMember[];
  workflow: Record<string, unknown>;
  triggers: Record<string, unknown>;
  version: string;
  publishStatus: 'draft' | 'published' | 'private';
  downloadCount: number;
  executionCount: number;
  successRate: number;
  category?: string;
  tags: string[];
  thumbnailUrl?: string;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * AiTeam 搜索结果
 */
export interface AiTeamSearchResult {
  aiteams: AiTeam[];
  total: number;
}

/**
 * AiTeam API 客户端
 */
export const aiteamApi = {
  /**
   * 创建 AiTeam
   */
  createAiTeam: async (data: {
    name: string;
    description?: string;
    members?: AiTeamMember[];
    workflow?: Record<string, unknown>;
    triggers?: Record<string, unknown>;
    category?: string;
    tags?: string[];
    thumbnailUrl?: string;
  }) => {
    const response = await apiClient.post('/aiteams', data);
    return response.data.data as AiTeam;
  },

  /**
   * 获取用户的 AiTeam 列表
   */
  getUserAiTeams: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: AiTeamSearchResult }> => {
    const response = await apiClient.get('/aiteams', { params });
    return response.data;
  },

  /**
   * 获取 AiTeam 详情
   */
  getAiTeamById: async (id: string): Promise<{ success: boolean; data: AiTeam }> => {
    const response = await apiClient.get(`/aiteams/${id}`);
    return response.data;
  },

  /**
   * 更新 AiTeam
   */
  updateAiTeam: async (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      members: AiTeamMember[];
      workflow: Record<string, unknown>;
      triggers: Record<string, unknown>;
      version: string;
      publishStatus: 'draft' | 'published' | 'private';
      category: string;
      tags: string[];
      thumbnailUrl: string;
    }>
  ) => {
    const response = await apiClient.put(`/aiteams/${id}`, data);
    return response.data.data as AiTeam;
  },

  /**
   * 删除 AiTeam
   */
  deleteAiTeam: async (id: string) => {
    const response = await apiClient.delete(`/aiteams/${id}`);
    return response.data;
  },

  /**
   * 添加成员到 AiTeam
   */
  addMember: async (
    aiteamId: string,
    member: Omit<AiTeamMember, 'sortOrder'>
  ) => {
    const response = await apiClient.post(`/aiteams/${aiteamId}/members`, member);
    return response.data.data as AiTeam;
  },

  /**
   * 从 AiTeam 移除成员
   */
  removeMember: async (aiteamId: string, agentId: string) => {
    const response = await apiClient.delete(`/aiteams/${aiteamId}/members/${agentId}`);
    return response.data.data as AiTeam;
  },

  /**
   * 更新成员角色
   */
  updateMemberRole: async (
    aiteamId: string,
    agentId: string,
    updates: { role?: string; responsibilities?: string; config?: Record<string, unknown> }
  ) => {
    const response = await apiClient.put(`/aiteams/${aiteamId}/members/${agentId}`, updates);
    return response.data.data as AiTeam;
  },

  /**
   * 发布 AiTeam 到市场
   */
  publishAiTeam: async (id: string) => {
    const response = await apiClient.post(`/aiteams/${id}/publish`);
    return response.data.data as AiTeam;
  },

  /**
   * 取消发布 AiTeam
   */
  unpublishAiTeam: async (id: string) => {
    const response = await apiClient.post(`/aiteams/${id}/unpublish`);
    return response.data.data as AiTeam;
  },

  /**
   * 搜索公开市场的 AiTeam
   */
  searchPublishedAiTeams: async (params?: {
    q?: string;
    category?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: AiTeamSearchResult }> => {
    const response = await apiClient.get('/aiteams/search', { 
      params: {
        ...params,
        tags: params?.tags?.join(',')
      }
    });
    return response.data;
  },

  /**
   * 获取用户统计信息
   */
  getUserStats: async (): Promise<{ 
    success: boolean; 
    data: {
      total: number;
      draft: number;
      published: number;
      private: number;
      totalDownloads: number;
      totalExecutions: number;
      avgSuccessRate: number;
    }
  }> => {
    const response = await apiClient.get('/aiteams/stats');
    return response.data;
  },

  /**
   * 导出 AiTeam
   */
  exportAiTeam: async (
    id: string,
    format: 'json' | 'yaml' | 'proclaw' = 'json',
    includeMetadata: boolean = true
  ) => {
    const response = await apiClient.post(`/aiteams/${id}/export`, {
      format,
      includeMetadata
    });
    return response.data.data;
  }
};
