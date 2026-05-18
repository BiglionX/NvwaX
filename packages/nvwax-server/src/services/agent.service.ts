/**
 * Agent 服务
 * 
 * 管理 Nvwa 智能体的 CRUD 操作
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface Agent {
  id: string;
  userId: string;
  name: string;
  description?: string;
  config: Record<string, unknown>;
  skills: string[];
  dataSources: string[];
  outputTypes: string[];
  implementation?: string;
  status: 'draft' | 'active' | 'archived' | 'deleted';
  templateId?: string;
  version: string;
  
  // 新增字段（Agent 仓库重构）
  type: 'single' | 'team_member';
  publishStatus: 'draft' | 'published' | 'private';
  downloadCount: number;
  exportFormat: string[];
  tags: string[];
  category?: string;
  thumbnailUrl?: string;
  rating: number;
  reviewCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentInput {
  name: string;
  description?: string;
  config?: Record<string, unknown>;
  skills?: string[];
  dataSources?: string[];
  outputTypes?: string[];
  implementation?: string;
  templateId?: string;
  userId: string;
  
  // 新增字段
  type?: 'single' | 'team_member';
  publishStatus?: 'draft' | 'published' | 'private';
  tags?: string[];
  category?: string;
  thumbnailUrl?: string;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  skills?: string[];
  dataSources?: string[];
  outputTypes?: string[];
  implementation?: string;
  status?: 'draft' | 'active' | 'archived' | 'deleted';
  version?: string;
  
  // 新增字段
  type?: 'single' | 'team_member';
  publishStatus?: 'draft' | 'published' | 'private';
  tags?: string[];
  category?: string;
  thumbnailUrl?: string;
}

export class AgentService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 创建智能体
   */
  async createAgent(input: CreateAgentInput): Promise<Agent> {
    const agentId = uuidv4();
    
    const result = await this.pool.query(
      `INSERT INTO agents (
        id, user_id, name, description, config, skills, 
        data_sources, output_types, implementation, template_id, 
        status, version, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        agentId,
        input.userId,
        input.name,
        input.description || null,
        JSON.stringify(input.config || {}),
        JSON.stringify(input.skills || []),
        input.dataSources || [],
        input.outputTypes || [],
        input.implementation || null,
        input.templateId || null,
        'draft',
        '1.0.0'
      ]
    );

    return this.mapRowToAgent(result.rows[0]);
  }

  /**
   * 获取智能体列表（按用户）
   */
  async getAgentsByUserId(userId: string, options?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ agents: Agent[]; total: number }> {
    const { status, page = 1, limit = 20 } = options || {};
    
    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // 查询总数
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM agents WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 查询数据
    const offset = (page - 1) * limit;
    const dataResult = await this.pool.query(
      `SELECT * FROM agents WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const agents = dataResult.rows.map(row => this.mapRowToAgent(row));

    return { agents, total };
  }

  /**
   * 获取单个智能体详情
   */
  async getAgentById(id: string, userId?: string): Promise<Agent | null> {
    const conditions: string[] = ['id = $1'];
    const params: any[] = [id];

    if (userId) {
      conditions.push('user_id = $2');
      params.push(userId);
    }

    const result = await this.pool.query(
      `SELECT * FROM agents WHERE ${conditions.join(' AND ')}`,
      params
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAgent(result.rows[0]);
  }

  /**
   * 更新智能体
   */
  async updateAgent(id: string, userId: string, input: UpdateAgentInput): Promise<Agent> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(input.name);
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(input.description);
    }

    if (input.config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      params.push(JSON.stringify(input.config));
    }

    if (input.skills !== undefined) {
      updates.push(`skills = $${paramIndex++}`);
      params.push(JSON.stringify(input.skills));
    }

    if (input.dataSources !== undefined) {
      updates.push(`data_sources = $${paramIndex++}`);
      params.push(input.dataSources);
    }

    if (input.outputTypes !== undefined) {
      updates.push(`output_types = $${paramIndex++}`);
      params.push(input.outputTypes);
    }

    if (input.implementation !== undefined) {
      updates.push(`implementation = $${paramIndex++}`);
      params.push(input.implementation);
    }

    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(input.status);
    }

    if (input.version !== undefined) {
      updates.push(`version = $${paramIndex++}`);
      params.push(input.version);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(id);
    params.push(userId);

    const result = await this.pool.query(
      `UPDATE agents SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new Error('AGENT_NOT_FOUND: 智能体不存在或无权访问');
    }

    return this.mapRowToAgent(result.rows[0]);
  }

  /**
   * 删除智能体（软删除）
   */
  async deleteAgent(id: string, userId: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE agents SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('AGENT_NOT_FOUND: 智能体不存在或无权访问');
    }
  }

  /**
   * 发布智能体到市场
   */
  async publishAgent(id: string, userId: string): Promise<Agent> {
    const result = await this.pool.query(
      `UPDATE agents 
       SET publish_status = 'published', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('AGENT_NOT_FOUND: 智能体不存在或无权访问');
    }

    return this.mapRowToAgent(result.rows[0]);
  }

  /**
   * 取消发布（设为私有）
   */
  async unpublishAgent(id: string, userId: string): Promise<Agent> {
    const result = await this.pool.query(
      `UPDATE agents 
       SET publish_status = 'private', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('AGENT_NOT_FOUND: 智能体不存在或无权访问');
    }

    return this.mapRowToAgent(result.rows[0]);
  }

  /**
   * 搜索已发布的智能体（公开市场）
   */
  async searchPublishedAgents(options?: {
    query?: string;
    category?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ agents: Agent[]; total: number }> {
    const { query, category, tags, page = 1, limit = 20 } = options || {};
    
    const conditions: string[] = ['publish_status = $1'];
    const params: any[] = ['published'];
    let paramIndex = 2;

    if (query) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push('%' + query + '%');
      paramIndex++;
    }

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (tags && tags.length > 0) {
      conditions.push(`tags && $${paramIndex++}`);
      params.push(tags);
    }

    const whereClause = conditions.join(' AND ');

    // 查询总数
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM agents WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 查询数据
    const offset = (page - 1) * limit;
    const dataResult = await this.pool.query(
      `SELECT * FROM agents WHERE ${whereClause} ORDER BY rating DESC, download_count DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const agents = dataResult.rows.map(row => this.mapRowToAgent(row));

    return { agents, total };
  }

  /**
   * 增加下载次数
   */
  async incrementDownloadCount(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE agents SET download_count = download_count + 1 WHERE id = $1`,
      [id]
    );
  }

  /**
   * 获取用户的 Agent 统计信息
   */
  async getUserStats(userId: string): Promise<{
    total: number;
    draft: number;
    published: number;
    private: number;
    totalDownloads: number;
  }> {
    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN publish_status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN publish_status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN publish_status = 'private' THEN 1 END) as private,
        COALESCE(SUM(download_count), 0) as total_downloads
      FROM agents WHERE user_id = $1 AND status != 'deleted'`,
      [userId]
    );

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total),
      draft: parseInt(stats.draft),
      published: parseInt(stats.published),
      private: parseInt(stats.private),
      totalDownloads: parseInt(stats.total_downloads)
    };
  }

  /**
   * 将数据库行映射为 Agent 对象
   */
  private mapRowToAgent(row: any): Agent {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      config: JSON.parse(row.config || '{}'),
      skills: JSON.parse(row.skills || '[]'),
      dataSources: row.data_sources || [],
      outputTypes: row.output_types || [],
      implementation: row.implementation,
      status: row.status,
      templateId: row.template_id,
      version: row.version,
      
      // 新增字段
      type: row.type || 'single',
      publishStatus: row.publish_status || 'private',
      downloadCount: row.download_count || 0,
      exportFormat: row.export_format || [],
      tags: row.tags || [],
      category: row.category,
      thumbnailUrl: row.thumbnail_url,
      rating: parseFloat(row.rating) || 0.00,
      reviewCount: row.review_count || 0,
      
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
