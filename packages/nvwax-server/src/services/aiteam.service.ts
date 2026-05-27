/**
 * AiTeam 服务
 * 
 * 管理 AI 团队的 CRUD 操作
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { agentSearchService, Agent } from './agent-search.service.js';

export interface AiTeamMember {
  agentId: string;
  role: string;
  responsibilities?: string;
  config?: Record<string, unknown>;
  sortOrder?: number;
}

export interface AiTeam {
  id: string;
  userId: string;
  name: string;
  description?: string;
  members: AiTeamMember[];
  workflow: Record<string, unknown>;
  triggers: Record<string, unknown>;
  version: string;
  publishStatus: 'draft' | 'published' | 'private';
  downloadCount: number;
  executionCount: number;
  successRate: number;
  category?: string;
  tags: string[];
  thumbnailUrl?: string;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAiTeamInput {
  name: string;
  description?: string;
  members?: AiTeamMember[];
  workflow?: Record<string, unknown>;
  triggers?: Record<string, unknown>;
  userId: string;
  category?: string;
  tags?: string[];
  thumbnailUrl?: string;
}

export interface UpdateAiTeamInput {
  name?: string;
  description?: string;
  members?: AiTeamMember[];
  workflow?: Record<string, unknown>;
  triggers?: Record<string, unknown>;
  version?: string;
  publishStatus?: 'draft' | 'published' | 'private';
  category?: string;
  tags?: string[];
  thumbnailUrl?: string;
}

export class AiTeamService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 创建 AiTeam
   */
  async createAiTeam(input: CreateAiTeamInput): Promise<AiTeam> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const aiteamId = uuidv4();

      // 插入 AiTeam 主记录
      const result = await client.query(
        `INSERT INTO aiteams (
          id, user_id, name, description, members, workflow, triggers,
          version, publish_status, category, tags, thumbnail_url,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::text[], $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          aiteamId,
          input.userId,
          input.name,
          input.description || null,
          JSON.stringify(input.members || []),
          JSON.stringify(input.workflow || {}),
          JSON.stringify(input.triggers || {}),
          '1.0.0',
          'private',
          input.category || null,
          input.tags && input.tags.length > 0 ? input.tags : '{}',
          input.thumbnailUrl || null
        ]
      );

      // 插入成员关联记录
      if (input.members && input.members.length > 0) {
        for (let i = 0; i < input.members.length; i++) {
          const member = input.members[i];
          await client.query(
            `INSERT INTO aiteam_members (aiteam_id, agent_id, role, responsibilities, config, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              aiteamId,
              member.agentId,
              member.role,
              member.responsibilities || null,
              JSON.stringify(member.config || {}),
              member.sortOrder || i
            ]
          );
        }
      }

      await client.query('COMMIT');

      return this.mapRowToAiTeam(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取用户的 AiTeam 列表
   */
  async getAiTeamsByUserId(userId: string, options?: {
    publishStatus?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ aiteams: AiTeam[]; total: number }> {
    const { publishStatus, category, page = 1, limit = 20 } = options || {};
    
    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    if (publishStatus) {
      conditions.push(`publish_status = $${paramIndex++}`);
      params.push(publishStatus);
    }

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    const whereClause = conditions.join(' AND ');

    // 查询总数
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM aiteams WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 查询数据
    const offset = (page - 1) * limit;
    const dataResult = await this.pool.query(
      `SELECT * FROM aiteams WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const aiteams = await Promise.all(
      dataResult.rows.map(row => this.getAiTeamWithMembers(row.id))
    );

    return { aiteams, total };
  }

  /**
   * 获取单个 AiTeam 详情（包含成员）
   */
  async getAiTeamById(id: string, userId?: string): Promise<AiTeam | null> {
    const conditions: string[] = ['id = $1'];
    const params: any[] = [id];

    if (userId) {
      conditions.push('user_id = $2');
      params.push(userId);
    }

    const result = await this.pool.query(
      `SELECT * FROM aiteams WHERE ${conditions.join(' AND ')}`,
      params
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.getAiTeamWithMembers(id);
  }

  /**
   * 获取 AiTeam 及其成员
   */
  private async getAiTeamWithMembers(id: string): Promise<AiTeam> {
    // 获取主记录
    const aiteamResult = await this.pool.query(
      'SELECT * FROM aiteams WHERE id = $1',
      [id]
    );

    if (aiteamResult.rows.length === 0) {
      throw new Error('AITEAM_NOT_FOUND');
    }

    // 获取成员列表
    const membersResult = await this.pool.query(
      `SELECT am.*, a.name as agent_name
       FROM aiteam_members am
       LEFT JOIN agents a ON am.agent_id = a.id
       WHERE am.aiteam_id = $1
       ORDER BY am.sort_order ASC`,
      [id]
    );

    const aiteam = this.mapRowToAiTeam(aiteamResult.rows[0]);
    
    // 映射成员
    aiteam.members = membersResult.rows.map(row => ({
      agentId: row.agent_id,
      agentName: row.agent_name,
      role: row.role,
      responsibilities: row.responsibilities,
      config: JSON.parse(row.config || '{}'),
      sortOrder: row.sort_order
    }));

    return aiteam;
  }

  /**
   * 更新 AiTeam
   */
  async updateAiTeam(id: string, userId: string, input: UpdateAiTeamInput): Promise<AiTeam> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

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

      if (input.members !== undefined) {
        updates.push(`members = $${paramIndex++}`);
        params.push(JSON.stringify(input.members));
        
        // 更新成员关联表
        await client.query('DELETE FROM aiteam_members WHERE aiteam_id = $1', [id]);
        
        for (let i = 0; i < input.members.length; i++) {
          const member = input.members[i];
          await client.query(
            `INSERT INTO aiteam_members (aiteam_id, agent_id, role, responsibilities, config, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              id,
              member.agentId,
              member.role,
              member.responsibilities || null,
              JSON.stringify(member.config || {}),
              member.sortOrder || i
            ]
          );
        }
      }

      if (input.workflow !== undefined) {
        updates.push(`workflow = $${paramIndex++}`);
        params.push(JSON.stringify(input.workflow));
      }

      if (input.triggers !== undefined) {
        updates.push(`triggers = $${paramIndex++}`);
        params.push(JSON.stringify(input.triggers));
      }

      if (input.version !== undefined) {
        updates.push(`version = $${paramIndex++}`);
        params.push(input.version);
      }

      if (input.publishStatus !== undefined) {
        updates.push(`publish_status = $${paramIndex++}`);
        params.push(input.publishStatus);
      }

      if (input.category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        params.push(input.category);
      }

      if (input.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        params.push(input.tags);
      }

      if (input.thumbnailUrl !== undefined) {
        updates.push(`thumbnail_url = $${paramIndex++}`);
        params.push(input.thumbnailUrl);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(id);
      params.push(userId);

      const result = await client.query(
        `UPDATE aiteams SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('AITEAM_NOT_FOUND: AI团队不存在或无权访问');
      }

      await client.query('COMMIT');

      return this.getAiTeamWithMembers(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 删除 AiTeam
   */
  async deleteAiTeam(id: string, userId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM aiteams WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('AITEAM_NOT_FOUND: AI团队不存在或无权访问');
    }
  }

  /**
   * 发布 AiTeam 到市场
   */
  async publishAiTeam(id: string, userId: string): Promise<AiTeam> {
    const result = await this.pool.query(
      `UPDATE aiteams 
       SET publish_status = 'published', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('AITEAM_NOT_FOUND: AI团队不存在或无权访问');
    }

    return this.getAiTeamWithMembers(id);
  }

  /**
   * 取消发布（设为私有）
   */
  async unpublishAiTeam(id: string, userId: string): Promise<AiTeam> {
    const result = await this.pool.query(
      `UPDATE aiteams 
       SET publish_status = 'private', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('AITEAM_NOT_FOUND: AI团队不存在或无权访问');
    }

    return this.getAiTeamWithMembers(id);
  }

  /**
   * 搜索已发布的 AiTeam（公开市场）
   */
  async searchPublishedAiTeams(options?: {
    query?: string;
    category?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  }): Promise<{ aiteams: AiTeam[]; total: number }> {
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

    // ===== 尝试本地数据库查询 =====
    let aiteams: AiTeam[] = [];
    let total = 0;
    let dbAvailable = true;

    try {
      const whereClause = conditions.join(' AND ');

      // 查询总数
      const countResult = await this.pool.query(
        `SELECT COUNT(*) FROM aiteams WHERE ${whereClause}`,
        params
      );
      total = parseInt(countResult.rows[0].count);

      // 查询数据
      const offset = (page - 1) * limit;
      const dataResult = await this.pool.query(
        `SELECT * FROM aiteams WHERE ${whereClause} ORDER BY rating DESC, download_count DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, limit, offset]
      );

      aiteams = await Promise.all(
        dataResult.rows.map(row => this.getAiTeamWithMembers(row.id))
      );
    } catch (dbError) {
      console.warn(`Database query failed for AiTeam search, falling back to external sources:`, (dbError as Error).message);
      dbAvailable = false;
    }

    // 本地有结果，直接返回
    if (aiteams.length > 0) {
      return { aiteams, total };
    }

    // 本地无结果 / DB不可用时，搜索 GitHub/Gitee/ModelScope
    if (query) {
      console.log(`Searching external sources for "${query}" (dbAvailable=${dbAvailable})...`);
      try {
        const externalResult = await agentSearchService.searchAgents(query, page, limit);
        if (externalResult.data.length > 0) {
          // 将外部 Agent 结果映射为 AiTeam 预览
          const externalAiteams = externalResult.data.map((agent: Agent) => ({
            id: `external-${agent.id}`,
            userId: '',
            name: agent.name,
            description: agent.description || `来自 ${agent.source} 的智能体`,
            members: [],
            workflow: {},
            triggers: {},
            version: '1.0.0',
            publishStatus: 'published' as const,
            downloadCount: agent.downloads || 0,
            executionCount: 0,
            successRate: 100.00,
            category: agent.category || 'external',
            tags: agent.tags || [],
            thumbnailUrl: undefined,
            rating: (agent.stars || 0) / 1000,
            reviewCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }));
          console.log(`Found ${externalAiteams.length} external agents matching "${query}"`);
          return { aiteams: externalAiteams, total: externalAiteams.length };
        }
      } catch (extError) {
        console.error('Error searching external sources for AiTeams:', extError);
      }
    }

    return { aiteams, total };
  }

  /**
   * 推荐相似的 AiTeam
   * 基于分类和标签进行语义匹配
   */
  async recommendAiTeams(options: {
    query: string;
    limit?: number;
  }): Promise<{ aiteams: AiTeam[]; total: number }> {
    const { query, limit = 5 } = options;
    
    try {
      // 第一步：精确搜索匹配的 AiTeam
      const exactResult = await this.searchPublishedAiTeams({ query, limit });
      
      if (exactResult.aiteams.length >= limit) {
        return { aiteams: exactResult.aiteams.slice(0, limit), total: exactResult.aiteams.length };
      }
      
      // 第二步：基于分类和标签扩展推荐
      // 从精确搜索结果的分类和标签中提取关键词
      const categories = new Set<string>();
      const allTags = new Set<string>();
      
      for (const aiteam of exactResult.aiteams) {
        if (aiteam.category) categories.add(aiteam.category);
        if (aiteam.tags) aiteam.tags.forEach(t => allTags.add(t));
      }
      
      // 如果没有精确结果，从查询词中猜测分类
      if (categories.size === 0 && allTags.size === 0) {
        // 尝试搜索同一分类下的其他 AiTeam
        const categoryResult = await this.searchPublishedAiTeams({ 
          query, 
          limit: limit * 2 
        });
        
        // 对结果按评分降序排序，取 top N
        const sorted = categoryResult.aiteams
          .sort((a, b) => b.rating - a.rating);
        
        return { 
          aiteams: sorted.slice(0, limit), 
          total: Math.min(categoryResult.total, limit) 
        };
      }
      
      // 第三步：基于分类扩展搜索
      const categoryArray = Array.from(categories);
      const tagArray = Array.from(allTags);
      
      const conditions: string[] = ['publish_status = $1'];
      const params: any[] = ['published'];
      let paramIndex = 2;
      const excludeIds: string[] = [];
      
      // 排除已精确匹配的结果
      for (const aiteam of exactResult.aiteams) {
        excludeIds.push(aiteam.id);
      }
      
      // 按分类筛选
      if (categoryArray.length > 0) {
        const categoryConditions = categoryArray.map((_, i) => `$${paramIndex + i}`).join(', ');
        conditions.push(`category IN (${categoryConditions})`);
        params.push(...categoryArray);
        paramIndex += categoryArray.length;
      }
      
      // 按标签重叠筛选
      if (tagArray.length > 0) {
        conditions.push(`tags && $${paramIndex++}`);
        params.push(tagArray);
      }
      
      // 排除已精确匹配
      if (excludeIds.length > 0) {
        const excludeConditions = excludeIds.map((_, i) => `$${paramIndex + i}`).join(', ');
        conditions.push(`id NOT IN (${excludeConditions})`);
        params.push(...excludeIds);
        paramIndex += excludeIds.length;
      }
      
      const whereClause = conditions.join(' AND ');
      
      const dataResult = await this.pool.query(
        `SELECT * FROM aiteams WHERE ${whereClause} ORDER BY rating DESC, download_count DESC LIMIT $${paramIndex}`,
        [...params, limit - exactResult.aiteams.length]
      );
      
      const recommendedAiteams = await Promise.all(
        dataResult.rows.map(row => this.getAiTeamWithMembers(row.id))
      );
      
      // 合并精确匹配 + 推荐结果
      const merged = [...exactResult.aiteams, ...recommendedAiteams];
      
      return { 
        aiteams: merged.slice(0, limit), 
        total: merged.length 
      };
    } catch (error) {
      console.error('Error recommending aiteams:', error);
      return { aiteams: [], total: 0 };
    }
  }

  /**
   * 增加下载次数
   */
  async incrementDownloadCount(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE aiteams SET download_count = download_count + 1 WHERE id = $1`,
      [id]
    );
  }

  /**
   * 记录执行结果
   */
  async recordExecution(id: string, success: boolean): Promise<void> {
    await this.pool.query(
      `UPDATE aiteams 
       SET execution_count = execution_count + 1,
           success_rate = CASE 
             WHEN execution_count = 0 THEN CASE WHEN $2 THEN 100 ELSE 0 END
             ELSE ((success_rate * execution_count + CASE WHEN $2 THEN 100 ELSE 0 END) / (execution_count + 1))
           END
       WHERE id = $1`,
      [id, success]
    );
  }

  /**
   * 获取用户的 AiTeam 统计信息
   */
  async getUserStats(userId: string): Promise<{
    total: number;
    draft: number;
    published: number;
    private: number;
    totalDownloads: number;
    totalExecutions: number;
    avgSuccessRate: number;
  }> {
    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN publish_status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN publish_status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN publish_status = 'private' THEN 1 END) as private,
        COALESCE(SUM(download_count), 0) as total_downloads,
        COALESCE(SUM(execution_count), 0) as total_executions,
        COALESCE(AVG(success_rate), 0) as avg_success_rate
      FROM aiteams WHERE user_id = $1`,
      [userId]
    );

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total),
      draft: parseInt(stats.draft),
      published: parseInt(stats.published),
      private: parseInt(stats.private),
      totalDownloads: parseInt(stats.total_downloads),
      totalExecutions: parseInt(stats.total_executions),
      avgSuccessRate: parseFloat(stats.avg_success_rate) || 0
    };
  }

  /**
   * 添加成员到 AiTeam
   */
  async addMember(
    aiteamId: string,
    userId: string,
    member: Omit<AiTeamMember, 'sortOrder'>
  ): Promise<AiTeam> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 验证 AiTeam 存在且属于用户
      const aiteamCheck = await client.query(
        'SELECT id FROM aiteams WHERE id = $1 AND user_id = $2',
        [aiteamId, userId]
      );

      if (aiteamCheck.rows.length === 0) {
        throw new Error('AITEAM_NOT_FOUND: AiTeam 不存在或无权访问');
      }

      // 验证 Agent 存在
      const agentCheck = await client.query(
        'SELECT id FROM agents WHERE id = $1',
        [member.agentId]
      );

      if (agentCheck.rows.length === 0) {
        throw new Error('AGENT_NOT_FOUND: Agent 不存在');
      }

      // 检查是否已存在
      const existingCheck = await client.query(
        'SELECT 1 FROM aiteam_members WHERE aiteam_id = $1 AND agent_id = $2',
        [aiteamId, member.agentId]
      );

      if (existingCheck.rows.length > 0) {
        throw new Error('MEMBER_ALREADY_EXISTS: 该 Agent 已经是团队成员');
      }

      // 获取当前最大排序号
      const maxSortResult = await client.query(
        'SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM aiteam_members WHERE aiteam_id = $1',
        [aiteamId]
      );

      const sortOrder = maxSortResult.rows[0].max_sort + 1;

      // 插入成员
      await client.query(
        `INSERT INTO aiteam_members (aiteam_id, agent_id, role, responsibilities, config, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          aiteamId,
          member.agentId,
          member.role,
          member.responsibilities || null,
          JSON.stringify(member.config || {}),
          sortOrder
        ]
      );

      // 更新 aiteams 表的 members JSON（保持向后兼容）
      const membersResult = await client.query(
        `SELECT am.*, a.name as agent_name, a.type as agent_type
         FROM aiteam_members am
         JOIN agents a ON am.agent_id = a.id
         WHERE am.aiteam_id = $1
         ORDER BY am.sort_order`,
        [aiteamId]
      );

      const membersJson = JSON.stringify(membersResult.rows.map(row => ({
        agentId: row.agent_id,
        agentName: row.agent_name,
        role: row.role,
        responsibilities: row.responsibilities,
        config: JSON.parse(row.config || '{}')
      })));

      await client.query(
        'UPDATE aiteams SET members = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [membersJson, aiteamId]
      );

      await client.query('COMMIT');

      // 返回更新后的 AiTeam
      const updated = await this.getAiTeamById(aiteamId, userId);
      if (!updated) {
        throw new Error('AITEAM_NOT_FOUND: 获取更新后的 AiTeam 失败');
      }
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 从 AiTeam 移除成员
   */
  async removeMember(aiteamId: string, userId: string, agentId: string): Promise<AiTeam> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 验证 AiTeam 存在且属于用户
      const aiteamCheck = await client.query(
        'SELECT id FROM aiteams WHERE id = $1 AND user_id = $2',
        [aiteamId, userId]
      );

      if (aiteamCheck.rows.length === 0) {
        throw new Error('AITEAM_NOT_FOUND: AiTeam 不存在或无权访问');
      }

      // 删除成员
      const deleteResult = await client.query(
        'DELETE FROM aiteam_members WHERE aiteam_id = $1 AND agent_id = $2 RETURNING *',
        [aiteamId, agentId]
      );

      if (deleteResult.rows.length === 0) {
        throw new Error('MEMBER_NOT_FOUND: 成员不存在');
      }

      // 重新排序
      await client.query(
        `WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) - 1 as new_order
          FROM aiteam_members
          WHERE aiteam_id = $1
        )
        UPDATE aiteam_members am
        SET sort_order = r.new_order
        FROM ranked r
        WHERE am.id = r.id`,
        [aiteamId]
      );

      // 更新 aiteams 表的 members JSON
      const membersResult = await client.query(
        `SELECT am.*, a.name as agent_name, a.type as agent_type
         FROM aiteam_members am
         JOIN agents a ON am.agent_id = a.id
         WHERE am.aiteam_id = $1
         ORDER BY am.sort_order`,
        [aiteamId]
      );

      const membersJson = JSON.stringify(membersResult.rows.map(row => ({
        agentId: row.agent_id,
        agentName: row.agent_name,
        role: row.role,
        responsibilities: row.responsibilities,
        config: JSON.parse(row.config || '{}')
      })));

      await client.query(
        'UPDATE aiteams SET members = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [membersJson, aiteamId]
      );

      await client.query('COMMIT');

      // 返回更新后的 AiTeam
      const updated = await this.getAiTeamById(aiteamId, userId);
      if (!updated) {
        throw new Error('AITEAM_NOT_FOUND: 获取更新后的 AiTeam 失败');
      }
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 更新成员角色
   */
  async updateMemberRole(
    aiteamId: string,
    userId: string,
    agentId: string,
    updates: { role?: string; responsibilities?: string; config?: Record<string, unknown> }
  ): Promise<AiTeam> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 验证 AiTeam 存在且属于用户
      const aiteamCheck = await client.query(
        'SELECT id FROM aiteams WHERE id = $1 AND user_id = $2',
        [aiteamId, userId]
      );

      if (aiteamCheck.rows.length === 0) {
        throw new Error('AITEAM_NOT_FOUND: AiTeam 不存在或无权访问');
      }

      // 构建更新字段
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 3;

      if (updates.role !== undefined) {
        updateFields.push(`role = $${paramIndex}`);
        values.push(updates.role);
        paramIndex++;
      }

      if (updates.responsibilities !== undefined) {
        updateFields.push(`responsibilities = $${paramIndex}`);
        values.push(updates.responsibilities);
        paramIndex++;
      }

      if (updates.config !== undefined) {
        updateFields.push(`config = $${paramIndex}`);
        values.push(JSON.stringify(updates.config));
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('NO_UPDATES: 没有提供任何更新字段');
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      values.unshift(agentId, aiteamId);

      // 执行更新
      const updateResult = await client.query(
        `UPDATE aiteam_members SET ${updateFields.join(', ')}
         WHERE aiteam_id = $1 AND agent_id = $2
         RETURNING *`,
        values
      );

      if (updateResult.rows.length === 0) {
        throw new Error('MEMBER_NOT_FOUND: 成员不存在');
      }

      // 更新 aiteams 表的 members JSON
      const membersResult = await client.query(
        `SELECT am.*, a.name as agent_name, a.type as agent_type
         FROM aiteam_members am
         JOIN agents a ON am.agent_id = a.id
         WHERE am.aiteam_id = $1
         ORDER BY am.sort_order`,
        [aiteamId]
      );

      const membersJson = JSON.stringify(membersResult.rows.map(row => ({
        agentId: row.agent_id,
        agentName: row.agent_name,
        role: row.role,
        responsibilities: row.responsibilities,
        config: JSON.parse(row.config || '{}')
      })));

      await client.query(
        'UPDATE aiteams SET members = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [membersJson, aiteamId]
      );

      await client.query('COMMIT');

      // 返回更新后的 AiTeam
      const updated = await this.getAiTeamById(aiteamId, userId);
      if (!updated) {
        throw new Error('AITEAM_NOT_FOUND: 获取更新后的 AiTeam 失败');
      }
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 将数据库行映射为 AiTeam 对象（不含成员）
   */
  private mapRowToAiTeam(row: any): AiTeam {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      members: row.members ? JSON.parse(row.members) : [],
      workflow: row.workflow ? JSON.parse(row.workflow) : {},
      triggers: row.triggers ? JSON.parse(row.triggers) : {},
      version: row.version,
      publishStatus: row.publish_status,
      downloadCount: row.download_count || 0,
      executionCount: row.execution_count || 0,
      successRate: parseFloat(row.success_rate) || 100.00,
      category: row.category,
      tags: Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags) : []),
      thumbnailUrl: row.thumbnail_url,
      rating: parseFloat(row.rating) || 0.00,
      reviewCount: row.review_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
