import { NvwaXClient } from '../index.js';

/**
 * Agents API module
 * 
 * Agent CRUD + 发布管理
 */
export class AgentsModule {
  private client: NvwaXClient;

  constructor(client: NvwaXClient) {
    this.client = client;
  }

  /**
   * Create a new agent
   */
  async create(data: {
    name: string;
    description?: string;
    config?: Record<string, any>;
    skills?: string[];
    dataSources?: string[];
    outputTypes?: string[];
    category?: string;
    tags?: string[];
  }): Promise<any> {
    return this.client.post('/api/v1/agents', data);
  }

  /**
   * List my agents
   */
  async list(params?: { status?: string; page?: number; limit?: number }): Promise<any> {
    return this.client.get('/api/v1/agents', { params });
  }

  /**
   * Get agent by ID
   */
  async get(id: string): Promise<any> {
    return this.client.get(`/api/v1/agents/${id}`);
  }

  /**
   * Update agent
   */
  async update(id: string, data: Record<string, any>): Promise<any> {
    return this.client.put(`/api/v1/agents/${id}`, data);
  }

  /**
   * Delete agent
   */
  async delete(id: string): Promise<any> {
    return this.client.delete(`/api/v1/agents/${id}`);
  }

  /**
   * Publish agent to marketplace
   */
  async publish(id: string): Promise<any> {
    return this.client.post(`/api/v1/agents/${id}/publish`);
  }

  /**
   * Unpublish agent from marketplace
   */
  async unpublish(id: string): Promise<any> {
    return this.client.post(`/api/v1/agents/${id}/unpublish`);
  }
}
