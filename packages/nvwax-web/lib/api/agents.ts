import { authedJson, buildQuery } from '@/lib/oidc/authed-fetch';

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
 *
 * 鉴权说明：后端 /agents 全部路由挂载 userAuthMiddleware（仅认 Bearer / ?token=），
 * 统一走 authedJson（/api/auth/proxy 注入 OIDC token）。
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
    const response = await authedJson<{ success: boolean; data: Agent }>('/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.data as Agent;
  },

  /**
   * 获取用户的智能体列表
   */
  getUserAgents: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: AgentSearchResult }> => {
    return authedJson<{ success: boolean; data: AgentSearchResult }>(
      `/agents${buildQuery(params as Record<string, unknown>)}`,
    );
  },

  /**
   * 获取智能体详情
   */
  getAgentById: async (id: string): Promise<{ success: boolean; data: Agent }> => {
    return authedJson<{ success: boolean; data: Agent }>(`/agents/${id}`);
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
    const response = await authedJson<{ success: boolean; data: Agent }>(`/agents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.data as Agent;
  },

  /**
   * 删除智能体
   */
  deleteAgent: async (id: string) => {
    return authedJson(`/agents/${id}`, { method: 'DELETE' });
  },

  /**
   * 发布智能体到市场
   */
  publishAgent: async (id: string) => {
    const response = await authedJson<{ success: boolean; data: Agent }>(`/agents/${id}/publish`, {
      method: 'POST',
    });
    return response.data as Agent;
  },

  /**
   * 取消发布智能体
   */
  unpublishAgent: async (id: string) => {
    const response = await authedJson<{ success: boolean; data: Agent }>(`/agents/${id}/unpublish`, {
      method: 'POST',
    });
    return response.data as Agent;
  },

  /**
   * 搜索公开市场的智能体
   *
   * ⚠️ 后端 agent.routes.ts 未定义 /agents/search 路由（会命中 /:id），
   * 该调用为历史遗留，保留鉴权写法；如不再使用建议后续清理。
   */
  searchPublishedAgents: async (params?: {
    q?: string;
    category?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: AgentSearchResult }> => {
    return authedJson<{ success: boolean; data: AgentSearchResult }>(
      `/agents/search${buildQuery({
        ...params,
        tags: params?.tags?.join(','),
      })}`,
    );
  },

  /**
   * 获取用户统计信息
   *
   * ⚠️ 后端 agent.routes.ts 未定义 /agents/stats 路由（会命中 /:id），
   * 为历史遗留调用，保留鉴权写法。
   */
  getUserStats: async (): Promise<{
    success: boolean;
    data: {
      total: number;
      draft: number;
      published: number;
      private: number;
      totalDownloads: number;
    };
  }> => {
    return authedJson(`/agents/stats`);
  },

  /**
   * 导出智能体
   *
   * 支持格式：json | yaml | proclaw | crewai | langgraph
   */
  exportAgent: async (
    id: string,
    format: 'json' | 'yaml' | 'proclaw' | 'crewai' | 'langgraph' = 'json',
    includeMetadata: boolean = true,
    includeImplementation: boolean = false
  ) => {
    const response = await authedJson<{ success: boolean; data: unknown }>(`/agents/${id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, includeMetadata, includeImplementation }),
    });
    return response.data;
  },

  /**
   * 获取导出历史
   *
   * ⚠️ 后端 agent.routes.ts 未定义 /agents/exports 路由，为历史遗留调用，保留鉴权写法。
   */
  getExportHistory: async (limit: number = 20) => {
    const response = await authedJson<{ success: boolean; data: unknown }>(
      `/agents/exports${buildQuery({ limit })}`,
    );
    return response.data;
  },
};
