import { NvwaXClient } from '../index.js';

/**
 * Export API module
 * 
 * Agent/AiTeam 导出与下载
 */
export class ExportModule {
  private client: NvwaXClient;

  constructor(client: NvwaXClient) {
    this.client = client;
  }

  /**
   * Export an agent
   */
  async agent(id: string, options?: {
    format?: 'json' | 'yaml' | 'proclaw';
    includeMetadata?: boolean;
    includeImplementation?: boolean;
  }): Promise<any> {
    return this.client.post(`/api/v1/agents/${id}/export`, options || {});
  }

  /**
   * Export an AiTeam
   */
  async aiteam(id: string, options?: {
    format?: 'json' | 'yaml' | 'proclaw';
    includeMetadata?: boolean;
  }): Promise<any> {
    return this.client.post(`/api/v1/aiteams/${id}/export`, options || {});
  }

  /**
   * Batch export multiple items
   */
  async batch(data: {
    items: Array<{ type: 'agent' | 'aiteam'; id: string }>;
    format?: 'json' | 'yaml' | 'proclaw';
  }): Promise<any> {
    return this.client.post('/api/v1/export/batch', data);
  }

  /**
   * Get export history
   */
  async history(params?: { limit?: number }): Promise<any> {
    return this.client.get('/api/v1/export/history', { params });
  }
}
