/**
 * PluginCapabilitiesService
 * 
 * 管理 ProClaw 插件的能力注册、注销和查询
 * 对应 PRD v2.0 章节 2.2.3
 */

import { Pool } from 'pg';
import { databaseService } from './database.service.js';
import {
  PluginCapability,
  PluginCapabilityRecord,
  RegisterCapabilityRequest
} from '../types/plugin-capabilities.types.js';

export class PluginCapabilitiesService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * 注册/更新插件能力
   * 如果 plugin_id 已存在则更新，否则创建新记录
   */
  async registerCapability(data: RegisterCapabilityRequest): Promise<PluginCapabilityRecord> {
    const { plugin_id, plugin_name, actions, data_queries, skill_ids } = data;

    const result = await this.pool.query(
      `INSERT INTO plugin_capabilities (plugin_id, plugin_name, actions, data_queries, skill_ids)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb)
       ON CONFLICT (plugin_id) 
       DO UPDATE SET 
         plugin_name = EXCLUDED.plugin_name,
         actions = EXCLUDED.actions,
         data_queries = EXCLUDED.data_queries,
         skill_ids = EXCLUDED.skill_ids,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        plugin_id,
        plugin_name,
        JSON.stringify(actions || []),
        JSON.stringify(data_queries || []),
        JSON.stringify(skill_ids || [])
      ]
    );

    console.log(`✅ Plugin capability registered: ${plugin_id} (${plugin_name})`);
    return this.mapRecord(result.rows[0]);
  }

  /**
   * 注销插件能力
   */
  async unregisterCapability(pluginId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM plugin_capabilities WHERE plugin_id = $1 RETURNING id',
      [pluginId]
    );

    if (result.rowCount && result.rowCount > 0) {
      console.log(`✅ Plugin capability unregistered: ${pluginId}`);
      return true;
    }
    
    console.warn(`⚠️ Plugin capability not found for unregister: ${pluginId}`);
    return false;
  }

  /**
   * 查询单个插件能力
   */
  async getCapability(pluginId: string): Promise<PluginCapabilityRecord | null> {
    const result = await this.pool.query(
      'SELECT * FROM plugin_capabilities WHERE plugin_id = $1',
      [pluginId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRecord(result.rows[0]);
  }

  /**
   * 查询所有已注册的插件能力
   */
  async getAllCapabilities(): Promise<PluginCapabilityRecord[]> {
    const result = await this.pool.query(
      'SELECT * FROM plugin_capabilities ORDER BY plugin_name ASC'
    );

    return result.rows.map(row => this.mapRecord(row));
  }

  /**
   * 按行业标签查询插件能力
   * 通过 skill_ids 中的标签进行匹配
   */
  async getCapabilitiesByIndustry(industryTags: string[]): Promise<PluginCapabilityRecord[]> {
    if (industryTags.length === 0) {
      return [];
    }

    // 在 skill_ids JSONB 数组中搜索匹配的行业标签
    const conditions = industryTags.map((_, i) => `skill_ids::jsonb ? $${i + 1}`).join(' OR ');
    const query = `SELECT * FROM plugin_capabilities WHERE ${conditions} ORDER BY plugin_name ASC`;

    const result = await this.pool.query(query, industryTags);
    return result.rows.map(row => this.mapRecord(row));
  }

  /**
   * 将数据库行映射为 PluginCapabilityRecord
   */
  private mapRecord(row: any): PluginCapabilityRecord {
    return {
      id: row.id,
      plugin_id: row.plugin_id,
      plugin_name: row.plugin_name,
      actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions,
      data_queries: typeof row.data_queries === 'string' ? JSON.parse(row.data_queries) : row.data_queries,
      skill_ids: typeof row.skill_ids === 'string' ? JSON.parse(row.skill_ids) : row.skill_ids,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * 将数据库记录转换为 PluginCapability（API 响应格式）
   */
  toCapabilityResponse(record: PluginCapabilityRecord): PluginCapability {
    return {
      plugin_id: record.plugin_id,
      plugin_name: record.plugin_name,
      actions: record.actions,
      data_queries: record.data_queries,
      skill_ids: record.skill_ids
    };
  }
}

export const pluginCapabilitiesService = new PluginCapabilitiesService();
