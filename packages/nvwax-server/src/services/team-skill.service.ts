import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface TeamSkillRole {
  role: string;
  specialty: string;
  responsibilities?: string[];
  agent_type?: string;
}

export interface TeamSkillWorkflowStep {
  step: number;
  action: string;
  performed_by: string;
  output: string;
}

export interface TeamSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  leaderConfig: any;
  roles: TeamSkillRole[];
  workflow: {
    steps: TeamSkillWorkflowStep[];
  };
  bindingRules: any;
  authorId?: string;
  tenantId?: string; // Added for tenant isolation
  version: string;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamSkillSearchResult {
  data: TeamSkill[];
  total: number;
  page: number;
  limit: number;
}

export class TeamSkillService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 创建 Team Skill
   */
  async createTeamSkill(data: Omit<TeamSkill, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamSkill> {
    const id = uuidv4();
    
    const query = `
      INSERT INTO team_skills 
        (id, name, description, category, leader_config, roles, workflow, binding_rules, author_id, tenant_id, version, is_public)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      id,
      data.name,
      data.description || null,
      data.category || null,
      JSON.stringify(data.leaderConfig),
      JSON.stringify(data.roles),
      JSON.stringify(data.workflow),
      JSON.stringify(data.bindingRules),
      data.authorId || null,
      data.tenantId || null, // Tenant ID for isolation
      data.version || '1.0.0',
      data.isPublic !== undefined ? data.isPublic : false
    ];

    const result = await this.pool.query(query, values);
    return this.formatTeamSkill(result.rows[0]);
  }

  /**
   * 获取 Team Skill by ID
   */
  async getTeamSkillById(id: string, tenantId?: string): Promise<TeamSkill | null> {
    let query = 'SELECT * FROM team_skills WHERE id = $1';
    const values: any[] = [id];
    
    // If tenantId provided, ensure data isolation
    if (tenantId) {
      query += ' AND tenant_id = $2';
      values.push(tenantId);
    }
    
    const result = await this.pool.query(query, values);
    
    if (!result.rows[0]) return null;
    
    return this.formatTeamSkill(result.rows[0]);
  }

  /**
   * 搜索 Team Skills (with tenant isolation)
   */
  async searchTeamSkills(params: {
    query?: string;
    category?: string;
    isPublic?: boolean;
    authorId?: string;
    tenantId?: string; // Added for tenant isolation
    page?: number;
    limit?: number;
  }): Promise<TeamSkillSearchResult> {
    const {
      query,
      category,
      isPublic,
      authorId,
      tenantId, // Tenant ID for filtering
      page = 1,
      limit = 20
    } = params;

    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    // Tenant isolation - mandatory for security
    if (tenantId) {
      whereClause += ` AND tenant_id = $${paramIndex}`;
      values.push(tenantId);
      paramIndex++;
    }

    // 关键词搜索
    if (query) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      values.push(`%${query}%`);
      paramIndex++;
    }

    // 类别过滤
    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      values.push(category);
      paramIndex++;
    }

    // 公开状态过滤
    if (isPublic !== undefined) {
      whereClause += ` AND is_public = $${paramIndex}`;
      values.push(isPublic);
      paramIndex++;
    }

    // 作者过滤
    if (authorId) {
      whereClause += ` AND author_id = $${paramIndex}`;
      values.push(authorId);
      paramIndex++;
    }

    // 计算总数
    const countQuery = `SELECT COUNT(*) as total FROM team_skills ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // 分页查询
    const offset = (page - 1) * limit;
    values.push(limit, offset);
    
    const dataQuery = `
      SELECT * FROM team_skills 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await this.pool.query(dataQuery, values);
    
    const data = result.rows.map(row => this.formatTeamSkill(row));

    return {
      data,
      total,
      page,
      limit
    };
  }

  /**
   * 更新 Team Skill
   */
  async updateTeamSkill(
    id: string,
    data: Partial<Omit<TeamSkill, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<TeamSkill | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.leaderConfig !== undefined) {
      updates.push(`leader_config = $${paramIndex++}`);
      values.push(JSON.stringify(data.leaderConfig));
    }
    if (data.roles !== undefined) {
      updates.push(`roles = $${paramIndex++}`);
      values.push(JSON.stringify(data.roles));
    }
    if (data.workflow !== undefined) {
      updates.push(`workflow = $${paramIndex++}`);
      values.push(JSON.stringify(data.workflow));
    }
    if (data.bindingRules !== undefined) {
      updates.push(`binding_rules = $${paramIndex++}`);
      values.push(JSON.stringify(data.bindingRules));
    }
    if (data.version !== undefined) {
      updates.push(`version = $${paramIndex++}`);
      values.push(data.version);
    }
    if (data.isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(data.isPublic);
    }

    if (updates.length === 0) {
      return this.getTeamSkillById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE team_skills 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    
    if (!result.rows[0]) return null;
    
    return this.formatTeamSkill(result.rows[0]);
  }

  /**
   * 删除 Team Skill
   */
  async deleteTeamSkill(id: string): Promise<boolean> {
    const query = 'DELETE FROM team_skills WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 获取公开的 Team Skills（用于市场展示）
   */
  async getPublicTeamSkills(page = 1, limit = 20): Promise<TeamSkillSearchResult> {
    return this.searchTeamSkills({
      isPublic: true,
      page,
      limit
    });
  }

  /**
   * 按类别获取 Team Skills
   */
  async getTeamSkillsByCategory(category: string, page = 1, limit = 20): Promise<TeamSkillSearchResult> {
    return this.searchTeamSkills({
      category,
      isPublic: true,
      page,
      limit
    });
  }

  /**
   * 获取用户的 Team Skills
   */
  async getUserTeamSkills(authorId: string, page = 1, limit = 20): Promise<TeamSkillSearchResult> {
    return this.searchTeamSkills({
      authorId,
      page,
      limit
    });
  }

  /**
   * 获取行业插件的 Agent 明细
   */
  async getIndustryAgents(teamSkillId: string): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM industry_agents WHERE team_skill_id = $1 ORDER BY sort_order ASC',
      [teamSkillId]
    );
    return result.rows.map(row => ({
      id: row.id,
      teamSkillId: row.team_skill_id,
      name: row.name,
      description: row.description,
      proclawAgentId: row.proclaw_agent_id,
      role: row.role,
      capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
      inputSchema: typeof row.input_schema === 'string' ? JSON.parse(row.input_schema) : row.input_schema,
      outputSchema: typeof row.output_schema === 'string' ? JSON.parse(row.output_schema) : row.output_schema,
      apiBindings: typeof row.api_bindings === 'string' ? JSON.parse(row.api_bindings) : row.api_bindings,
      modelConfig: typeof row.model_config === 'string' ? JSON.parse(row.model_config) : row.model_config,
      systemPrompt: row.system_prompt,
      sortOrder: row.sort_order
    }));
  }

  /**
   * 获取行业插件的所有类别
   */
  async getIndustryPluginCategories(): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT DISTINCT binding_rules->>'industry_type' AS industry_type 
       FROM team_skills 
       WHERE category = 'industry-plugin' AND is_public = true
       ORDER BY industry_type`
    );
    return result.rows.map(row => row.industry_type).filter(Boolean);
  }

  /**
   * 格式化数据库行为 TeamSkill 对象
   */
  private formatTeamSkill(row: any): TeamSkill {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      leaderConfig: typeof row.leader_config === 'string' 
        ? JSON.parse(row.leader_config) 
        : row.leader_config,
      roles: typeof row.roles === 'string' 
        ? JSON.parse(row.roles) 
        : row.roles,
      workflow: typeof row.workflow === 'string' 
        ? JSON.parse(row.workflow) 
        : row.workflow,
      bindingRules: typeof row.binding_rules === 'string' 
        ? JSON.parse(row.binding_rules) 
        : row.binding_rules,
      authorId: row.author_id,
      version: row.version,
      isPublic: row.is_public,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    };
  }
}
