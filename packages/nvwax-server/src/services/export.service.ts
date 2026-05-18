/**
 * Export Service
 * 
 * 负责 Agent 和 AiTeam 的导出功能
 * 支持格式：JSON, YAML, ProClaw
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, mkdirSync, existsSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
const yaml = require('js-yaml');

export interface ExportConfig {
  format: 'json' | 'yaml' | 'proclaw';
  includeMetadata?: boolean;
  includeImplementation?: boolean;
  compress?: boolean;
}

export interface ExportResult {
  id: string;
  resourceId: string;
  resourceType: 'agent' | 'aiteam';
  format: string;
  filePath: string;
  fileSize: number;
  downloadUrl: string;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export class ExportService {
  private pool: Pool;
  private exportDir: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.exportDir = join(process.cwd(), 'exports');
    
    // 确保导出目录存在
    if (!existsSync(this.exportDir)) {
      mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * 导出 Agent
   */
  async exportAgent(
    agentId: string,
    userId: string,
    config: ExportConfig
  ): Promise<ExportResult> {
    const exportId = uuidv4();
    
    // 创建导出记录
    await this.pool.query(
      `INSERT INTO agent_exports (id, user_id, resource_type, resource_id, format, status, created_at)
       VALUES ($1, $2, 'agent', $3, $4, 'pending', CURRENT_TIMESTAMP)`,
      [exportId, userId, agentId, config.format]
    );

    try {
      // 获取 Agent 数据
      const agentResult = await this.pool.query(
        'SELECT * FROM agents WHERE id = $1 AND user_id = $2',
        [agentId, userId]
      );

      if (agentResult.rows.length === 0) {
        throw new Error('AGENT_NOT_FOUND: Agent 不存在或无权访问');
      }

      const agent = agentResult.rows[0];

      // 构建导出数据
      const exportData = this.buildAgentExportData(agent, config);

      // 生成文件
      const filePath = await this.generateFile(exportId, exportData, config.format);
      const fileSize = this.getFileSize(filePath);

      // 更新导出记录
      await this.pool.query(
        `UPDATE agent_exports 
         SET status = 'completed', file_path = $1, file_size = $2, completed_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [filePath, fileSize, exportId]
      );

      // 增加下载次数
      await this.pool.query(
        'UPDATE agents SET download_count = download_count + 1 WHERE id = $1',
        [agentId]
      );

      return {
        id: exportId,
        resourceId: agentId,
        resourceType: 'agent',
        format: config.format,
        filePath,
        fileSize,
        downloadUrl: `/api/exports/${exportId}/download`,
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date()
      };
    } catch (error) {
      // 更新导出记录为失败
      await this.pool.query(
        `UPDATE agent_exports 
         SET status = 'failed', error_message = $1
         WHERE id = $2`,
        [error instanceof Error ? error.message : 'Unknown error', exportId]
      );

      throw error;
    }
  }

  /**
   * 导出 AiTeam
   */
  async exportAiTeam(
    aiteamId: string,
    userId: string,
    config: ExportConfig
  ): Promise<ExportResult> {
    const exportId = uuidv4();
    
    // 创建导出记录
    await this.pool.query(
      `INSERT INTO agent_exports (id, user_id, resource_type, resource_id, format, status, created_at)
       VALUES ($1, $2, 'aiteam', $3, $4, 'pending', CURRENT_TIMESTAMP)`,
      [exportId, userId, aiteamId, config.format]
    );

    try {
      // 获取 AiTeam 数据
      const aiteamResult = await this.pool.query(
        'SELECT * FROM aiteams WHERE id = $1 AND user_id = $2',
        [aiteamId, userId]
      );

      if (aiteamResult.rows.length === 0) {
        throw new Error('AITEAM_NOT_FOUND: AiTeam 不存在或无权访问');
      }

      const aiteam = aiteamResult.rows[0];

      // 获取成员列表
      const membersResult = await this.pool.query(
        `SELECT am.*, a.name as agent_name, a.type as agent_type
         FROM aiteam_members am
         JOIN agents a ON am.agent_id = a.id
         WHERE am.aiteam_id = $1
         ORDER BY am.sort_order`,
        [aiteamId]
      );

      // 构建导出数据
      const exportData = this.buildAiTeamExportData(aiteam, membersResult.rows, config);

      // 生成文件
      const filePath = await this.generateFile(exportId, exportData, config.format);
      const fileSize = this.getFileSize(filePath);

      // 更新导出记录
      await this.pool.query(
        `UPDATE agent_exports 
         SET status = 'completed', file_path = $1, file_size = $2, completed_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [filePath, fileSize, exportId]
      );

      // 增加下载次数
      await this.pool.query(
        'UPDATE aiteams SET download_count = download_count + 1 WHERE id = $1',
        [aiteamId]
      );

      return {
        id: exportId,
        resourceId: aiteamId,
        resourceType: 'aiteam',
        format: config.format,
        filePath,
        fileSize,
        downloadUrl: `/api/exports/${exportId}/download`,
        status: 'completed',
        createdAt: new Date(),
        completedAt: new Date()
      };
    } catch (error) {
      // 更新导出记录为失败
      await this.pool.query(
        `UPDATE agent_exports 
         SET status = 'failed', error_message = $1
         WHERE id = $2`,
        [error instanceof Error ? error.message : 'Unknown error', exportId]
      );

      throw error;
    }
  }

  /**
   * 获取导出历史
   */
  async getExportHistory(userId: string, limit: number = 20): Promise<ExportResult[]> {
    const result = await this.pool.query(
      `SELECT * FROM agent_exports 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      resourceId: row.resource_id,
      resourceType: row.resource_type,
      format: row.format,
      filePath: row.file_path,
      fileSize: row.file_size,
      downloadUrl: `/api/exports/${row.id}/download`,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      completedAt: row.completed_at
    }));
  }

  /**
   * 构建 Agent 导出数据
   */
  private buildAgentExportData(agent: any, config: ExportConfig): any {
    const data: any = {
      name: agent.name,
      description: agent.description,
      type: agent.type,
      version: agent.version,
      tags: agent.tags || [],
      category: agent.category,
      config: JSON.parse(agent.config || '{}'),
      skills: JSON.parse(agent.skills || '[]'),
      dataSources: agent.data_sources || [],
      outputTypes: agent.output_types || []
    };

    // 可选字段
    if (config.includeMetadata !== false) {
      data.metadata = {
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
        rating: agent.rating,
        reviewCount: agent.review_count,
        downloadCount: agent.download_count
      };
    }

    if (config.includeImplementation && agent.implementation) {
      data.implementation = agent.implementation;
    }

    // ProClaw 格式特殊处理
    if (config.format === 'proclaw') {
      return this.convertToProClawFormat(data, 'agent');
    }

    return data;
  }

  /**
   * 构建 AiTeam 导出数据
   */
  private buildAiTeamExportData(aiteam: any, members: any[], config: ExportConfig): any {
    const data: any = {
      name: aiteam.name,
      description: aiteam.description,
      version: aiteam.version,
      tags: aiteam.tags || [],
      category: aiteam.category,
      workflow: JSON.parse(aiteam.workflow || '{}'),
      triggers: JSON.parse(aiteam.triggers || '{}'),
      members: members.map(member => ({
        agentId: member.agent_id,
        agentName: member.agent_name,
        role: member.role,
        responsibilities: member.responsibilities,
        config: JSON.parse(member.config || '{}')
      }))
    };

    // 可选字段
    if (config.includeMetadata !== false) {
      data.metadata = {
        createdAt: aiteam.created_at,
        updatedAt: aiteam.updated_at,
        executionCount: aiteam.execution_count,
        successRate: aiteam.success_rate,
        rating: aiteam.rating,
        reviewCount: aiteam.review_count,
        downloadCount: aiteam.download_count
      };
    }

    // ProClaw 格式特殊处理
    if (config.format === 'proclaw') {
      return this.convertToProClawFormat(data, 'aiteam');
    }

    return data;
  }

  /**
   * 转换为 ProClaw 格式
   */
  private convertToProClawFormat(data: any, type: 'agent' | 'aiteam'): any {
    return {
      proclaw_version: '1.0.0',
      type,
      ...data,
      compatibility: {
        min_proclaw_version: '1.0.0',
        required_modules: this.extractRequiredModules(data)
      }
    };
  }

  /**
   * 提取所需的模块依赖
   */
  private extractRequiredModules(data: any): string[] {
    const modules = new Set<string>();
    
    // 从 config 中提取
    if (data.config?.modules) {
      data.config.modules.forEach((m: string) => modules.add(m));
    }
    
    // 从 skills 中提取
    if (data.skills) {
      data.skills.forEach((skill: string) => {
        if (skill.includes('/')) {
          modules.add(skill.split('/')[0]);
        }
      });
    }

    return Array.from(modules);
  }

  /**
   * 生成导出文件
   */
  private async generateFile(
    exportId: string,
    data: any,
    format: 'json' | 'yaml' | 'proclaw'
  ): Promise<string> {
    const timestamp = Date.now();
    let content: string;
    let extension: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        extension = 'json';
        break;
      
      case 'yaml':
        content = yaml.dump(data, { indent: 2 });
        extension = 'yaml';
        break;
      
      case 'proclaw':
        content = JSON.stringify(data, null, 2);
        extension = 'proclaw.json';
        break;
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const fileName = `${exportId}_${timestamp}.${extension}`;
    const filePath = join(this.exportDir, fileName);

    writeFileSync(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * 获取文件大小
   */
  private getFileSize(filePath: string): number {
    return statSync(filePath).size;
  }

  /**
   * 删除过期导出文件（清理任务）
   */
  async cleanupOldExports(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // 获取过期的导出记录
    const result = await this.pool.query(
      'SELECT id, file_path FROM agent_exports WHERE created_at < $1',
      [cutoffDate]
    );

    let deletedCount = 0;

    for (const row of result.rows) {
      try {
        // 删除文件
        if (row.file_path && existsSync(row.file_path)) {
          unlinkSync(row.file_path);
        }

        // 删除数据库记录
        await this.pool.query('DELETE FROM agent_exports WHERE id = $1', [row.id]);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete export ${row.id}:`, error);
      }
    }

    return deletedCount;
  }
}
