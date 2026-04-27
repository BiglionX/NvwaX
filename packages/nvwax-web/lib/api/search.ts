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
