import { Pool } from 'pg';

export interface ProClawExportResult {
  success: boolean;
  proClawAppId?: string;
  downloadUrl?: string;
  message?: string;
}

export class ProClawBackendService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 获取 AiTeam 配置用于导出到 ProClaw
   */
  async getAiTeamConfigForProClaw(teamSkillId: string): Promise<Record<string, unknown> | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM team_skills WHERE id = $1',
        [teamSkillId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const skill = result.rows[0];
      
      // 构建符合 ProClaw 要求的配置格式
      const config: Record<string, unknown> = {
        teamName: skill.name,
        description: skill.description,
        leaderConfig: typeof skill.leader_config === 'string' ? JSON.parse(skill.leader_config) : skill.leader_config,
        roles: typeof skill.roles === 'string' ? JSON.parse(skill.roles) : skill.roles,
        workflow: typeof skill.workflow === 'string' ? JSON.parse(skill.workflow) : skill.workflow,
        bindingRules: typeof skill.binding_rules === 'string' ? JSON.parse(skill.binding_rules) : skill.binding_rules,
        metadata: {
          source: 'nvwax',
          createdAt: new Date().toISOString(),
          version: skill.version,
          category: skill.category
        }
      };

      // 如果是行业插件，附带 agent 明细数据
      if (skill.category === 'industry-plugin') {
        const agentsResult = await this.pool.query(
          'SELECT * FROM industry_agents WHERE team_skill_id = $1 ORDER BY sort_order ASC',
          [teamSkillId]
        );
        
        config.agents = agentsResult.rows.map(row => ({
          id: row.proclaw_agent_id,
          name: row.name,
          description: row.description,
          role: row.role,
          capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
          permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
          inputSchema: typeof row.input_schema === 'string' ? JSON.parse(row.input_schema) : row.input_schema,
          outputSchema: typeof row.output_schema === 'string' ? JSON.parse(row.output_schema) : row.output_schema,
          apiBindings: typeof row.api_bindings === 'string' ? JSON.parse(row.api_bindings) : row.api_bindings,
          modelConfig: typeof row.model_config === 'string' ? JSON.parse(row.model_config) : row.model_config,
          systemPrompt: row.system_prompt
        }));
      }

      return config;
    } catch (error) {
      console.error('Failed to get AiTeam config:', error);
      return null;
    }
  }

  /**
   * 将 AiTeam 集成到 ProClaw
   * TODO: ProClaw 功能尚未完善，以下为占位实现
   * 后续流程：
   * 1. 导出 AiTeam 配置为 JSON
   * 2. 调用 ProClaw API 导入配置
   * 3. 返回 ProClaw 中的团队 ID
   */
  async integrateToProClaw(teamSkillId: string, options?: {
    inventoryModule?: boolean;
  }): Promise<ProClawExportResult> {
    // TODO: 实现真实的 ProClaw 集成
    console.log(`[TODO] Integrating AiTeam ${teamSkillId} to ProClaw (inventory: ${options?.inventoryModule ?? false})`);
    
    // ProClaw 本地开发路径: D:\BigLionX\ProClaw
    // ProClaw 域名: https://proclaw.cc
    
    return {
      success: true,
      proClawAppId: `proclaw_team_${Date.now()}`,
      downloadUrl: `https://proclaw.cc/download?team=${teamSkillId}`,
      message: 'AiTeam 已导出，请在 ProClaw 桌面端中导入（功能开发中）'
    };
  }
}
