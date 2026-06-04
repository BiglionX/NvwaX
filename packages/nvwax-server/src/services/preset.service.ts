/**
 * PresetService
 * 
 * Agent 预设提示词生成服务
 * 根据 Agent ID 和插件能力生成预设提示词
 * 对应 PRD v2.0 章节 2.5 (GET /v2/agents/:id/presets)
 */

import { Pool } from 'pg';
import { databaseService } from './database.service.js';
import { pluginCapabilitiesService } from './plugin-capabilities.service.js';
import { pluginContextService } from './plugin-context.service.js';
import { PluginCapability } from '../types/plugin-capabilities.types.js';

export class PresetService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * 根据 Agent ID 和插件能力生成预设提示词
   * 
   * @param agentId - Agent ID（对应 agent_metadata 表中的 id）
   * @param pluginIds - 插件 ID 列表（可选，用于指定要注入的插件）
   * @returns 预设提示词对象
   */
  async generatePreset(agentId: string, pluginIds?: string[]): Promise<{
    base_prompt: string;
    plugin_context: string;
    combined_prompt: string;
    available_actions: any[];
    plugins: { plugin_id: string; plugin_name: string; action_count: number }[];
  }> {
    // 1. 获取 Agent 基础信息
    const baseInfo = await this.getAgentBaseInfo(agentId);
    const basePrompt = this.buildBasePrompt(baseInfo);

    // 2. 获取插件能力
    let capabilities: PluginCapability[] = [];
    if (pluginIds && pluginIds.length > 0) {
      // 按指定插件 ID 获取
      for (const pid of pluginIds) {
        const record = await pluginCapabilitiesService.getCapability(pid);
        if (record) {
          capabilities.push(pluginCapabilitiesService.toCapabilityResponse(record));
        }
      }
    } else {
      // 获取所有已注册的插件能力
      const allRecords = await pluginCapabilitiesService.getAllCapabilities();
      capabilities = allRecords.map(r => pluginCapabilitiesService.toCapabilityResponse(r));
    }

    // 3. 生成插件上下文提示词
    const pluginContext = capabilities.length > 0
      ? pluginContextService.generateSystemPrompt(capabilities)
      : '';

    // 4. 生成 function calling 工具列表
    const availableActions = capabilities.length > 0
      ? pluginContextService.generateActionList(capabilities)
      : [];

    // 5. 合并提示词
    const combinedPrompt = pluginContext
      ? `${basePrompt}\n\n${pluginContext}\n\n${pluginContextService.buildOutputConstraints()}`
      : basePrompt;

    return {
      base_prompt: basePrompt,
      plugin_context: pluginContext,
      combined_prompt: combinedPrompt,
      available_actions: availableActions,
      plugins: capabilities.map(cap => ({
        plugin_id: cap.plugin_id,
        plugin_name: cap.plugin_name,
        action_count: cap.actions.length
      }))
    };
  }

  /**
   * 从数据库获取 Agent 基础信息
   */
  private async getAgentBaseInfo(agentId: string): Promise<{
    name: string;
    description: string;
    tags: string[];
    category: string;
    author: string;
  }> {
    const result = await this.pool.query(
      'SELECT * FROM agent_metadata WHERE id = $1',
      [agentId]
    );

    if (result.rows.length === 0) {
      // 如果未找到，返回默认值
      return {
        name: `Agent ${agentId}`,
        description: '',
        tags: [],
        category: '',
        author: ''
      };
    }

    const row = result.rows[0];
    return {
      name: row.name,
      description: row.description || '',
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
      category: row.category || '',
      author: row.author || ''
    };
  }

  /**
   * 构建基础提示词
   */
  private buildBasePrompt(info: { name: string; description: string; tags: string[]; category: string; author: string }): string {
    const lines: string[] = [
      `你是 "${info.name}"，一个专业的 AI 助手。`,
      '',
      info.description ? `${info.description}\n` : '',
      '## 能力范围',
      '',
      `- 分类: ${info.category || '通用'}`,
      info.tags.length > 0 ? `- 标签: ${info.tags.join(', ')}` : '',
      info.author ? `- 作者: ${info.author}` : '',
      '',
      '## 核心职责',
      '',
      `1. 理解用户的需求并提供准确的帮助`,
      `2. 在能力范围内给出专业建议`,
      `3. 如需执行插件操作，按照标准格式输出 Action`,
    ].filter(Boolean);

    return lines.join('\n');
  }

  /**
   * 获取 Agent 的基础提示词（不含插件上下文）
   */
  async getBasePrompt(agentId: string): Promise<string> {
    const baseInfo = await this.getAgentBaseInfo(agentId);
    return this.buildBasePrompt(baseInfo);
  }

  /**
   * 合并基础提示词和插件上下文
   */
  mergeWithPluginContext(basePrompt: string, capabilities: PluginCapability[]): string {
    if (!capabilities || capabilities.length === 0) {
      return basePrompt;
    }

    const pluginContext = pluginContextService.generateSystemPrompt(capabilities);
    const outputConstraints = pluginContextService.buildOutputConstraints();

    return `${basePrompt}\n\n${pluginContext}\n\n${outputConstraints}`;
  }
}

export const presetService = new PresetService();
