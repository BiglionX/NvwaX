import { databaseService } from './database.service.js';
import { v4 as uuidv4 } from 'uuid';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiTeam {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
}

export interface AgentTeam {
  id: string;
  teamId: string;
  name: string;
  agents?: any[];
  createdAt: string;
}

export class ProjectService {
  private pool = databaseService.getPool();

  // User methods
  async createUser(email: string): Promise<string> {
    const id = uuidv4();
    await this.pool.query(
      'INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
      [id, email]
    );
    return id;
  }

  async getUserByEmail(email: string): Promise<any> {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  // Project methods
  async createProject(userId: string, name: string, description?: string): Promise<Project> {
    const id = uuidv4();
    await this.pool.query(
      'INSERT INTO projects (id, user_id, name, description) VALUES ($1, $2, $3, $4)',
      [id, userId, name, description || null]
    );
    
    return (await this.getProjectById(id))!;
  }

  async getProjects(userId: string, page: number = 1, limit: number = 20): Promise<{ data: Project[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const totalResult = await this.pool.query(
      'SELECT COUNT(*) as count FROM projects WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(totalResult.rows[0].count);
    
    const projectsResult = await this.pool.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    return {
      data: projectsResult.rows,
      total
    };
  }

  async getProjectById(id: string): Promise<Project | null> {
    const result = await this.pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async updateProject(id: string, name?: string, description?: string): Promise<Project | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await this.pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return this.getProjectById(id);
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM projects WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  // AiTeam methods
  async createAiTeam(projectId: string, name: string): Promise<AiTeam> {
    const id = uuidv4();
    await this.pool.query(
      'INSERT INTO ai_teams (id, project_id, name) VALUES ($1, $2, $3)',
      [id, projectId, name]
    );
    
    return (await this.getAiTeamById(id))!;
  }

  async getAiTeams(projectId: string): Promise<AiTeam[]> {
    const result = await this.pool.query(
      'SELECT * FROM ai_teams WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    return result.rows;
  }

  async getAiTeamById(id: string): Promise<AiTeam | null> {
    const result = await this.pool.query('SELECT * FROM ai_teams WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async updateAiTeam(id: string, name: string): Promise<AiTeam | null> {
    await this.pool.query('UPDATE ai_teams SET name = $1 WHERE id = $2', [name, id]);
    return this.getAiTeamById(id);
  }

  async deleteAiTeam(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM ai_teams WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  // Agent Team methods
  async createAgentTeam(teamId: string, name: string, agents?: any[]): Promise<AgentTeam> {
    const id = uuidv4();
    await this.pool.query(
      'INSERT INTO agent_teams (id, team_id, name, agents) VALUES ($1, $2, $3, $4)',
      [id, teamId, name, agents ? JSON.stringify(agents) : null]
    );
    
    return (await this.getAgentTeamById(id))!;
  }

  async getAgentTeams(teamId: string): Promise<AgentTeam[]> {
    const result = await this.pool.query(
      'SELECT * FROM agent_teams WHERE team_id = $1 ORDER BY created_at DESC',
      [teamId]
    );

    // Parse agents JSON
    return result.rows.map((team: any) => ({
      ...team,
      agents: team.agents ? JSON.parse(team.agents) : []
    }));
  }

  async getAgentTeamById(id: string): Promise<AgentTeam | null> {
    const result = await this.pool.query('SELECT * FROM agent_teams WHERE id = $1', [id]);
    const team = result.rows[0];
    if (team && team.agents) {
      team.agents = JSON.parse(team.agents);
    }
    return team || null;
  }

  async updateAgentTeam(id: string, name?: string, agents?: any[]): Promise<AgentTeam | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (agents !== undefined) {
      updates.push(`agents = $${paramIndex++}`);
      values.push(JSON.stringify(agents));
    }
    
    values.push(id);

    await this.pool.query(
      `UPDATE agent_teams SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return this.getAgentTeamById(id);
  }

  async deleteAgentTeam(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM agent_teams WHERE id = $1', [id]);
    return result.rowCount! > 0;
  }

  // ========== Admin 项目管理方法 ==========

  // 获取所有项目列表（分页，支持搜索和状态筛选）
  async getAllProjects(
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: string
  ): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.*, u.email as user_email, u.name as user_name
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
    `;
    let countQuery = 'SELECT COUNT(*) as count FROM projects p';
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      values.push('%' + search + '%');
      paramIndex++;
    }
    
    if (status) {
      conditions.push(`p.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      const whereClause = 'WHERE ' + conditions.join(' AND ');
      query += ' ' + whereClause;
      countQuery += ' ' + whereClause.replace(/\$\d+/g, (match) => {
        const idx = parseInt(match.substring(1));
        return '$' + (idx <= conditions.length ? idx : idx);
      });
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);
    
    const totalResult = await this.pool.query(countQuery, values.slice(0, paramIndex - 1));
    const total = parseInt(totalResult.rows[0].count);
    
    const projectsResult = await this.pool.query(query, values);
    
    return {
      data: projectsResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description,
        status: row.status,
        reviewNotes: row.review_notes,
        userEmail: row.user_email,
        userName: row.user_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      total
    };
  }

  // 审核项目（通过/拒绝）
  async reviewProject(projectId: string, approved: boolean, notes?: string): Promise<boolean> {
    const newStatus = approved ? 'active' : 'suspended';
    const result = await this.pool.query(
      'UPDATE projects SET status = $1, review_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [newStatus, notes || null, projectId]
    );
    return (result.rowCount || 0) > 0;
  }

  // 下架项目
  async suspendProject(projectId: string, reason?: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE projects SET status = $1, review_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['suspended', reason || null, projectId]
    );
    return (result.rowCount || 0) > 0;
  }

  // 恢复项目
  async restoreProject(projectId: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE projects SET status = $1, review_notes = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['active', projectId]
    );
    return (result.rowCount || 0) > 0;
  }

  // 获取项目统计信息
  async getProjectStats(): Promise<{ total: number; active: number; suspended: number; underReview: number }> {
    const totalResult = await this.pool.query('SELECT COUNT(*) as count FROM projects');
    const activeResult = await this.pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'active'");
    const suspendedResult = await this.pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'suspended'");
    const underReviewResult = await this.pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'under_review'");
    
    return {
      total: parseInt(totalResult.rows[0].count),
      active: parseInt(activeResult.rows[0].count),
      suspended: parseInt(suspendedResult.rows[0].count),
      underReview: parseInt(underReviewResult.rows[0].count)
    };
  }
}

export const projectService = new ProjectService();
