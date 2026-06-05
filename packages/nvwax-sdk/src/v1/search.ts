import { NvwaXClient } from '../index.js';

/**
 * Search API module
 * 
 * Agent 搜索、技能搜索、统一搜索
 */
export class SearchModule {
  private client: NvwaXClient;

  constructor(client: NvwaXClient) {
    this.client = client;
  }

  /**
   * Search agents across multiple sources
   */
  async searchAgents(params: {
    q: string;
    source?: 'github' | 'huggingface' | 'all';
    page?: number;
    limit?: number;
  }): Promise<any> {
    return this.client.get('/api/v1/search/agents', { params });
  }

  /**
   * Search skills from SkillHub
   */
  async searchSkills(params: {
    q: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    return this.client.get('/api/v1/search/skills', { params });
  }

  /**
   * Unified search (agents + skills)
   */
  async unifiedSearch(data: {
    q: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    return this.client.post('/api/v1/search/unified', data);
  }
}
