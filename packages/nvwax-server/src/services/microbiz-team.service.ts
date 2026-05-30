/**
 * MicroBiz Team Service
 * 
 * 小商家经营 AI Team 套件的 CRUD 管理服务
 * 管理3个预定义团队（新媒体运营、本地团购、小程序商城）及其11个Agent
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './database.service.js';

export interface MicroBizTeam {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string | null;
  color: string;
  leaderConfig: any;
  workflow: any;
  accountBindingsTemplate: any[];
  notificationConfig: any;
  dataSources: any[];
  version: string;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  agents?: MicroBizAgent[];
}

export interface MicroBizAgent {
  id: string;
  teamId: string;
  name: string;
  description: string;
  role: string;
  capabilities: string[];
  inputSchema: any;
  outputSchema: any;
  apiBindings: any[];
  modelConfig: any;
  systemPrompt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MicroBizInstallation {
  id: string;
  userId: string;
  status: 'installing' | 'active' | 'paused' | 'uninstalled';
  selectedTeams: string[];
  accountBindings: Record<string, any>;
  preferences: Record<string, any>;
  agentStatus: Record<string, any>;
  installedFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstallTeamInput {
  selectedTeams: string[];
  accountBindings?: Record<string, any>;
  preferences?: Record<string, any>;
}

export class MicroBizTeamService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || databaseService.getPool();
  }

  /**
   * 获取所有公开的 MicroBiz 团队
   */
  async getTeams(category?: string): Promise<MicroBizTeam[]> {
    let query = `SELECT * FROM microbiz_teams WHERE is_public = true`;
    const params: any[] = [];
    
    if (category) {
      query += ` AND category = $1`;
      params.push(category);
    }
    
    query += ` ORDER BY sort_order ASC`;
    
    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.formatTeam(row));
  }

  /**
   * 根据 ID 获取团队详情（包含 Agents）
   */
  async getTeamById(id: string): Promise<MicroBizTeam | null> {
    const result = await this.pool.query(
      'SELECT * FROM microbiz_teams WHERE id = $1',
      [id]
    );

    if (!result.rows[0]) return null;

    const team = this.formatTeam(result.rows[0]);
    team.agents = await this.getAgentsByTeamId(id);
    return team;
  }

  /**
   * 根据团队 ID 获取所有 Agent
   */
  async getAgentsByTeamId(teamId: string): Promise<MicroBizAgent[]> {
    const result = await this.pool.query(
      `SELECT * FROM microbiz_agents WHERE team_id = $1 ORDER BY sort_order ASC`,
      [teamId]
    );
    return result.rows.map(row => this.formatAgent(row));
  }

  /**
   * 获取所有 Agent（按分类筛选）
   */
  async getAllAgents(category?: string): Promise<MicroBizAgent[]> {
    let query = `
      SELECT a.* FROM microbiz_agents a
      JOIN microbiz_teams t ON a.team_id = t.id
      WHERE t.is_public = true
    `;
    const params: any[] = [];

    if (category) {
      query += ` AND t.category = $1`;
      params.push(category);
    }

    query += ` ORDER BY t.sort_order, a.sort_order`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.formatAgent(row));
  }

  /**
   * 安装 MicroBiz 套件
   */
  async installTeam(userId: string, input: InstallTeamInput): Promise<MicroBizInstallation> {
    const id = uuidv4();

    // 验证选择的团队是否存在
    if (input.selectedTeams && input.selectedTeams.length > 0) {
      const teamResult = await this.pool.query(
        'SELECT id FROM microbiz_teams WHERE id = ANY($1)',
        [input.selectedTeams]
      );
      if (teamResult.rows.length !== input.selectedTeams.length) {
        throw new Error('INVALID_TEAMS: 选择的团队中有不存在的团队');
      }
    }

    const result = await this.pool.query(
      `INSERT INTO microbiz_installations 
        (id, user_id, status, selected_teams, account_bindings, preferences, agent_status, installed_from)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) 
       DO UPDATE SET
         status = $3,
         selected_teams = $4,
         account_bindings = CASE WHEN $5::jsonb = '{}'::jsonb THEN microbiz_installations.account_bindings ELSE $5::jsonb END,
         preferences = CASE WHEN $6::jsonb = '{}'::jsonb THEN microbiz_installations.preferences ELSE $6::jsonb END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        id,
        userId,
        'active',
        JSON.stringify(input.selectedTeams || []),
        JSON.stringify(input.accountBindings || {}),
        JSON.stringify(input.preferences || {}),
        JSON.stringify({}),
        'marketplace'
      ]
    );

    return this.formatInstallation(result.rows[0]);
  }

  /**
   * 获取用户的安装记录
   */
  async getInstallation(userId: string): Promise<MicroBizInstallation | null> {
    const result = await this.pool.query(
      'SELECT * FROM microbiz_installations WHERE user_id = $1',
      [userId]
    );

    if (!result.rows[0]) return null;
    return this.formatInstallation(result.rows[0]);
  }

  /**
   * 更新账号绑定信息
   */
  async updateAccountBinding(
    userId: string,
    platform: string,
    bindingData: Record<string, any>
  ): Promise<MicroBizInstallation | null> {
    const installation = await this.getInstallation(userId);
    if (!installation) {
      throw new Error('INSTALLATION_NOT_FOUND: 请先安装 MicroBiz 套件');
    }

    const bindings = { ...installation.accountBindings, [platform]: bindingData };

    const result = await this.pool.query(
      `UPDATE microbiz_installations 
       SET account_bindings = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING *`,
      [JSON.stringify(bindings), userId]
    );

    return this.formatInstallation(result.rows[0]);
  }

  /**
   * 更新运营偏好
   */
  async updatePreferences(
    userId: string,
    preferences: Record<string, any>
  ): Promise<MicroBizInstallation | null> {
    const installation = await this.getInstallation(userId);
    if (!installation) {
      throw new Error('INSTALLATION_NOT_FOUND: 请先安装 MicroBiz 套件');
    }

    const mergedPrefs = { ...installation.preferences, ...preferences };

    const result = await this.pool.query(
      `UPDATE microbiz_installations 
       SET preferences = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING *`,
      [JSON.stringify(mergedPrefs), userId]
    );

    return this.formatInstallation(result.rows[0]);
  }

  /**
   * 更新安装状态
   */
  async updateInstallationStatus(
    userId: string,
    status: 'active' | 'paused' | 'uninstalled',
    agentStatus?: Record<string, any>
  ): Promise<MicroBizInstallation | null> {
    let query = `UPDATE microbiz_installations SET status = $1, updated_at = CURRENT_TIMESTAMP`;
    const params: any[] = [status];

    if (agentStatus) {
      query += `, agent_status = $3`;
      params.push(JSON.stringify(agentStatus));
    }

    query += ` WHERE user_id = $2 RETURNING *`;
    params.splice(1, 0, userId);

    const result = await this.pool.query(query, params);
    if (!result.rows[0]) return null;
    return this.formatInstallation(result.rows[0]);
  }

  /**
   * 卸载 MicroBiz 套件
   */
  async uninstall(userId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM microbiz_installations WHERE user_id = $1',
      [userId]
    );
  }

  /**
   * 格式化数据库行为 MicroBizTeam 对象
   */
  private formatTeam(row: any): MicroBizTeam {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      icon: row.icon,
      color: row.color,
      leaderConfig: typeof row.leader_config === 'string' ? JSON.parse(row.leader_config) : row.leader_config,
      workflow: typeof row.workflow === 'string' ? JSON.parse(row.workflow) : row.workflow,
      accountBindingsTemplate: typeof row.account_bindings_template === 'string'
        ? JSON.parse(row.account_bindings_template)
        : row.account_bindings_template,
      notificationConfig: typeof row.notification_config === 'string'
        ? JSON.parse(row.notification_config)
        : row.notification_config,
      dataSources: typeof row.data_sources === 'string' ? JSON.parse(row.data_sources) : row.data_sources,
      version: row.version,
      isPublic: row.is_public,
      sortOrder: row.sort_order,
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at
    };
  }

  /**
   * 格式化数据库行为 MicroBizAgent 对象
   */
  private formatAgent(row: any): MicroBizAgent {
    return {
      id: row.id,
      teamId: row.team_id,
      name: row.name,
      description: row.description,
      role: row.role,
      capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
      inputSchema: typeof row.input_schema === 'string' ? JSON.parse(row.input_schema) : row.input_schema,
      outputSchema: typeof row.output_schema === 'string' ? JSON.parse(row.output_schema) : row.output_schema,
      apiBindings: typeof row.api_bindings === 'string' ? JSON.parse(row.api_bindings) : row.api_bindings,
      modelConfig: typeof row.model_config === 'string' ? JSON.parse(row.model_config) : row.model_config,
      systemPrompt: row.system_prompt,
      sortOrder: row.sort_order,
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at
    };
  }

  /**
   * 格式化数据库行为 MicroBizInstallation 对象
   */
  private formatInstallation(row: any): MicroBizInstallation {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      selectedTeams: typeof row.selected_teams === 'string' ? JSON.parse(row.selected_teams) : row.selected_teams,
      accountBindings: typeof row.account_bindings === 'string' ? JSON.parse(row.account_bindings) : row.account_bindings,
      preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences,
      agentStatus: typeof row.agent_status === 'string' ? JSON.parse(row.agent_status) : row.agent_status,
      installedFrom: row.installed_from,
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at
    };
  }
}

// 导出单例
export const microbizTeamService = new MicroBizTeamService();
