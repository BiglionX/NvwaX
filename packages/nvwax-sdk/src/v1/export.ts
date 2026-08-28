import { NvwaXClient } from '../index.js';

/**
 * 支持的导出格式
 *
 * - json：通用 JSON
 * - yaml：通用 YAML
 * - proclaw：ProClaw 桌面端专用（.proclaw-team.json）
 * - crewai：CrewAI 多 Agent 框架 YAML（pip install crewai && crewai run team.yaml）
 * - langgraph：LangGraph StateGraph JSON 定义（用户自行写 driver）
 */
export type ExportFormat = 'json' | 'yaml' | 'proclaw' | 'crewai' | 'langgraph';

export const SUPPORTED_EXPORT_FORMATS: ExportFormat[] = [
  'json',
  'yaml',
  'proclaw',
  'crewai',
  'langgraph'
];

/**
 * Export API module
 *
 * Agent/AiTeam 导出与下载
 * Sprint 多壳落地改造：新增 crewai / langgraph 两个开源格式
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
    format?: ExportFormat;
    includeMetadata?: boolean;
    includeImplementation?: boolean;
  }): Promise<any> {
    return this.client.post(`/api/v1/agents/${id}/export`, options || {});
  }

  /**
   * Export an AiTeam
   */
  async aiteam(id: string, options?: {
    format?: ExportFormat;
    includeMetadata?: boolean;
  }): Promise<any> {
    return this.client.post(`/api/v1/aiteams/${id}/export`, options || {});
  }

  /**
   * Batch export multiple items
   */
  async batch(data: {
    items: Array<{ type: 'agent' | 'aiteam'; id: string }>;
    format?: ExportFormat;
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