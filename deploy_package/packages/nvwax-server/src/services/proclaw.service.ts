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
   * 获取虚拟公司配置用于导出到 ProClaw
   */
  async getVirtualCompanyConfigForProClaw(teamSkillId: string): Promise<Record<string, unknown> | null> {
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
      console.error('Failed to get virtual company config:', error);
      return null;
    }
  }
}
