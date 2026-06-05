import { NvwaXClient } from '../index.js';

/**
 * AiTeams API module
 * 
 * AiTeam CRUD + 发布管理
 */
export class AiTeamsModule {
  private client: NvwaXClient;

  constructor(client: NvwaXClient) {
    this.client = client;
  }

  /**
   * Create a new AiTeam
   */
  async create(data: {
    name: string;
    description?: string;
    members?: Array<{ agent_id: string; role: string; responsibilities?: string }>;
    workflow?: Record<string, any>;
    triggers?: Record<string, any>;
    category?: string;
    tags?: string[];
  }): Promise<any> {
    return this.client.post('/api/v1/aiteams', data);
  }

  /**
   * List my AiTeams
   */
  async list(params?: { status?: string; page?: number; limit?: number }): Promise<any> {
    return this.client.get('/api/v1/aiteams', { params });
  }

  /**
   * Get AiTeam by ID
   */
  async get(id: string): Promise<any> {
    return this.client.get(`/api/v1/aiteams/${id}`);
  }

  /**
   * Update AiTeam
   */
  async update(id: string, data: Record<string, any>): Promise<any> {
    return this.client.put(`/api/v1/aiteams/${id}`, data);
  }

  /**
   * Delete AiTeam
   */
  async delete(id: string): Promise<any> {
    return this.client.delete(`/api/v1/aiteams/${id}`);
  }

  /**
   * Publish AiTeam to marketplace
   */
  async publish(id: string): Promise<any> {
    return this.client.post(`/api/v1/aiteams/${id}/publish`);
  }

  /**
   * Unpublish AiTeam from marketplace
   */
  async unpublish(id: string): Promise<any> {
    return this.client.post(`/api/v1/aiteams/${id}/unpublish`);
  }
}
