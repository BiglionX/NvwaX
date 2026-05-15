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
  }
};
