import { NvwaXClient } from '../index.js';

/**
 * Marketplace API module
 * 
 * Agent / AiTeam 市场浏览与搜索
 */
export class MarketplaceModule {
  private client: NvwaXClient;

  constructor(client: NvwaXClient) {
    this.client = client;
  }

  /**
   * Search published agents
   */
  async searchAgents(params?: {
    q?: string;
    category?: string;
    tags?: string;
    page?: number;
    limit?: number;
    sort_by?: 'popular' | 'newest' | 'rating';
  }): Promise<any> {
    return this.client.get('/api/v1/marketplace/agents', { params });
  }

  /**
   * Get agent detail
   */
  async getAgent(id: string): Promise<any> {
    return this.client.get(`/api/v1/marketplace/agents/${id}`);
  }

  /**
   * Get agent categories
   */
  async getCategories(): Promise<any> {
    return this.client.get('/api/v1/marketplace/categories');
  }

  /**
   * Search published AiTeams
   */
  async searchAiTeams(params?: {
    q?: string;
    industry?: string;
    category?: string;
    tags?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    return this.client.get('/api/v1/marketplace/aiteams', { params });
  }

  /**
   * Get AiTeam detail
   */
  async getAiTeam(id: string): Promise<any> {
    return this.client.get(`/api/v1/marketplace/aiteams/${id}`);
  }

  /**
   * Get industry categories
   */
  async getIndustries(): Promise<any> {
    return this.client.get('/api/v1/marketplace/industries');
  }

  /**
   * Get industry plugin detail
   */
  async getPluginDetail(id: string): Promise<any> {
    return this.client.get(`/api/v1/marketplace/plugins/${id}`);
  }
}
