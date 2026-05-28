import apiClient from './client';

export interface Agent {
  id: string;
  name: string;
  description: string;
  source: 'github' | 'huggingface' | 'custom';
  url: string;
  download_url?: string;
  stars?: number;
  downloads?: number;
  tags?: string[];
  category?: string;
  author?: string;
  license?: string;
}

/**
 * AiTeam 搜索结果类型
 */
export interface SearchAiTeam {
  id: string;
  name: string;
  description?: string;
  members: { agentId: string; role: string }[];
  category?: string;
  tags: string[];
  rating: number;
  publishStatus: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category?: string;
  usageCount?: number;
}

export interface SkillRecommendation {
  id: string;
  name: string;
  description: string;
  category?: string;
  relevanceScore: number;
}

export const searchApi = {
  searchAgents: async (query: string, page = 1, limit = 20) => {
    const response = await apiClient.get('/search/agents', {
      params: { q: query, page, limit }
    });
    return response.data;
  },

  searchSkills: async (query: string, page = 1, limit = 20) => {
    const response = await apiClient.get('/search/skills', {
      params: { q: query, page, limit }
    });
    return response.data;
  },

  unifiedSearch: async (query: string, page = 1, limit = 20) => {
    const response = await apiClient.post('/search/unified', {
      q: query,
      page,
      limit
    });
    return response.data;
  },

  recommendSkills: async (query: string, limit = 5) => {
    const response = await apiClient.get('/search/recommend-skills', {
      params: { q: query, limit }
    });
    return response.data;
  },

  getPopularSkills: async (limit = 10) => {
    const response = await apiClient.get('/search/popular-skills', {
      params: { limit }
    });
    return response.data;
  },

  triggerCrawl: async () => {
    const response = await apiClient.post('/search/crawl');
    return response.data;
  },

  getCrawlerStatus: async () => {
    const response = await apiClient.get('/search/crawler-status');
    return response.data;
  }
};

/**
 * AI Search Agent API
 * 对话式 Agent 智能搜索
 */
export const aiSearchApi = {
  /**
   * 创建新的搜索会话
   */
  createSession: async () => {
    const response = await apiClient.post('/ai-search/sessions');
    return response.data;
  },

  /**
   * 发送消息进行对话式搜索
   */
  chat: async (sessionId: string, message: string) => {
    const response = await apiClient.post('/ai-search/chat', { sessionId, message });
    return response.data;
  },

  /**
   * 获取会话详情
   */
  getSession: async (sessionId: string) => {
    const response = await apiClient.get(`/ai-search/sessions/${sessionId}`);
    return response.data;
  }
};
