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
   * TODO: ProClaw 功能尚未完善，保留接口为占位
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
      return {
        teamName: skill.name,
        description: skill.description,
        leaderConfig: typeof skill.leader_config === 'string' ? JSON.parse(skill.leader_config) : skill.leader_config,
        roles: typeof skill.roles === 'string' ? JSON.parse(skill.roles) : skill.roles,
        workflow: typeof skill.workflow === 'string' ? JSON.parse(skill.workflow) : skill.workflow,
        bindingRules: typeof skill.binding_rules === 'string' ? JSON.parse(skill.binding_rules) : skill.binding_rules,
        metadata: {
          source: 'nvwax',
          createdAt: new Date().toISOString(),
          version: skill.version
        }
      };
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
