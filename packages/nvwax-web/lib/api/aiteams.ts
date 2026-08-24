import apiClient from './client';
import { authedJson, buildQuery } from '@/lib/oidc/authed-fetch';

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
 *
 * 鉴权说明：后端 /aiteams 除 /search、/recommend、/generate-from-query 外全部挂载
 * userAuthMiddleware（仅认 Bearer / ?token=）。受保护方法统一走 authedJson
 * （/api/auth/proxy 注入 OIDC token）；公开的 /search 保持直连（未登录可访问市场）。
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
    const response = await authedJson<{ success: boolean; data: AiTeam }>('/aiteams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.data as AiTeam;
  },

  /**
   * 获取用户的 AiTeam 列表
   */
  getUserAiTeams: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: AiTeamSearchResult }> => {
    return authedJson<{ success: boolean; data: AiTeamSearchResult }>(
      `/aiteams${buildQuery(params as Record<string, unknown>)}`,
    );
  },

  /**
   * 获取 AiTeam 详情
   */
  getAiTeamById: async (id: string): Promise<{ success: boolean; data: AiTeam }> => {
    return authedJson<{ success: boolean; data: AiTeam }>(`/aiteams/${id}`);
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
    const response = await authedJson<{ success: boolean; data: AiTeam }>(`/aiteams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.data as AiTeam;
  },

  /**
   * 删除 AiTeam
   */
  deleteAiTeam: async (id: string) => {
    return authedJson(`/aiteams/${id}`, { method: 'DELETE' });
  },

  /**
   * 添加成员到 AiTeam
   */
  addMember: async (
    aiteamId: string,
    member: Omit<AiTeamMember, 'sortOrder'>
  ) => {
    const response = await authedJson<{ success: boolean; data: AiTeam }>(
      `/aiteams/${aiteamId}/members`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      }
    );
    return response.data as AiTeam;
  },

  /**
   * 从 AiTeam 移除成员
   */
  removeMember: async (aiteamId: string, agentId: string) => {
    const response = await authedJson<{ success: boolean; data: AiTeam }>(
      `/aiteams/${aiteamId}/members/${agentId}`,
      { method: 'DELETE' }
    );
    return response.data as AiTeam;
  },

  /**
   * 更新成员角色
   */
  updateMemberRole: async (
    aiteamId: string,
    agentId: string,
    updates: { role?: string; responsibilities?: string; config?: Record<string, unknown> }
  ) => {
    const response = await authedJson<{ success: boolean; data: AiTeam }>(
      `/aiteams/${aiteamId}/members/${agentId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }
    );
    return response.data as AiTeam;
  },

  /**
   * 发布 AiTeam 到市场
   */
  publishAiTeam: async (id: string) => {
    const response = await authedJson<{ success: boolean; data: AiTeam }>(`/aiteams/${id}/publish`, {
      method: 'POST',
    });
    return response.data as AiTeam;
  },

  /**
   * 取消发布 AiTeam
   */
  unpublishAiTeam: async (id: string) => {
    const response = await authedJson<{ success: boolean; data: AiTeam }>(`/aiteams/${id}/unpublish`, {
      method: 'POST',
    });
    return response.data as AiTeam;
  },

  /**
   * 搜索公开市场的 AiTeam（公开路由，未登录可访问，保持直连）
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
        tags: params?.tags?.join(','),
      },
    });
    return response.data;
  },

  /**
   * 获取用户统计信息
   *
   * ⚠️ 后端 aiteam.routes.ts 未定义 /aiteams/stats 路由（会命中 /:id），
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
      totalExecutions: number;
      avgSuccessRate: number;
    };
  }> => {
    return authedJson(`/aiteams/stats`);
  },

  /**
   * 导出 AiTeam
   *
   * 支持格式：json | yaml | proclaw | crewai | langgraph
   */
  exportAiTeam: async (
    id: string,
    format: 'json' | 'yaml' | 'proclaw' | 'crewai' | 'langgraph' = 'json',
    includeMetadata: boolean = true
  ) => {
    const response = await authedJson<{ success: boolean; data: unknown }>(`/aiteams/${id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, includeMetadata }),
    });
    return response.data;
  },
};
