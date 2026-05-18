import apiClient from './client';

/**
 * Agent 定义
 */
export interface Agent {
  id: string;
  userId: string;
  name: string;
  description?: string;
  config: Record<string, unknown>;
  skills: string[];
  dataSources: string[];
  outputTypes: string[];
  implementation?: string;
  status: 'draft' | 'active' | 'archived' | 'deleted';
  templateId?: string;
  version: string;
  
  // 新增字段（Agent 仓库重构）
  type: 'single' | 'team_member';
  publishStatus: 'draft' | 'published' | 'private';
  downloadCount: number;
  exportFormat: string[];
  tags: string[];
  category?: string;
  thumbnailUrl?: string;
  rating: number;
  reviewCount: number;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Agent 搜索结果
 */
export interface AgentSearchResult {
  agents: Agent[];
  total: number;
}

/**
 * Agent API 客户端
 */
export const agentApi = {
  /**
   * 创建智能体
   */
  createAgent: async (data: {
    name: string;
    description?: string;
    config?: Record<string, unknown>;
    skills?: string[];
    dataSources?: string[];
    outputTypes?: string[];
    implementation?: string;
    templateId?: string;
  }) => {
    const response = await apiClient.post('/agents', data);
    return response.data.data as Agent;
  },

  /**
   * 获取用户的智能体列表
   */
  getUserAgents: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: AgentSearchResult }> => {
    const response = await apiClient.get('/agents', { params });
    return response.data;
  },

  /**
   * 获取智能体详情
   */
  getAgentById: async (id: string): Promise<{ success: boolean; data: Agent }> => {
    const response = await apiClient.get(`/agents/${id}`);
    return response.data;
  },

  /**
   * 更新智能体
   */
  updateAgent: async (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      config: Record<string, unknown>;
      skills: string[];
      dataSources: string[];
      outputTypes: string[];
      implementation: string;
      status: 'draft' | 'active' | 'archived' | 'deleted';
      version: string;
    }>
  ) => {
    const response = await apiClient.put(`/agents/${id}`, data);
    return response.data.data as Agent;
  },

  /**
   * 删除智能体
   */
  deleteAgent: async (id: string) => {
    const response = await apiClient.delete(`/agents/${id}`);
    return response.data;
  },

  /**
   * 发布智能体到市场
   */
  publishAgent: async (id: string) => {
    const response = await apiClient.post(`/agents/${id}/publish`);
    return response.data.data as Agent;
  },

  /**
   * 取消发布智能体
   */
  unpublishAgent: async (id: string) => {
    const response = await apiClient.post(`/agents/${id}/unpublish`);
    return response.data.data as Agent;
  },

  /**
   * 搜索公开市场的智能体
   */
  searchPublishedAgents: async (params?: {
    q?: string;
    category?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: AgentSearchResult }> => {
    const response = await apiClient.get('/agents/search', { 
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
    }
  }> => {
    const response = await apiClient.get('/agents/stats');
    return response.data;
  },

  /**
   * 导出智能体
   */
  exportAgent: async (
    id: string,
    format: 'json' | 'yaml' | 'proclaw' = 'json',
    includeMetadata: boolean = true,
    includeImplementation: boolean = false
  ) => {
    const response = await apiClient.post(`/agents/${id}/export`, {
      format,
      includeMetadata,
      includeImplementation
    });
    return response.data.data;
  },

  /**
   * 获取导出历史
   */
  getExportHistory: async (limit: number = 20) => {
    const response = await apiClient.get('/agents/exports', { params: { limit } });
    return response.data.data;
  }
};
