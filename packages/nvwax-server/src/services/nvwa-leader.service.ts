import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

/**
 * Nvwa Leader Service
 * 
 * 负责将 Nvwa 的需求分析结果与 Leader Agent 对接，
 * 自动生成团队配置并保存到数据库
 */
export class NvwaLeaderService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 从 Nvwa 需求生成团队配置
   * @param nvwaData Nvwa 的需求分析数据
   * @returns 生成的团队配置
   */
  async generateTeamFromNvwa(nvwaData: {
    description: string;
    dataSources: string[];
    outputs: string[];
    implementation: string;
    skills: string[];
  }) {
    console.log('🤖 Generating team configuration from Nvwa data...');
    
    // 构建完整的需求描述
    const fullRequirement = `
创建一个智能体系统，具体需求如下：

【用途描述】
${nvwaData.description}

【数据源】
${nvwaData.dataSources.join(', ')}

【输出结果】
${nvwaData.outputs.join(', ')}

【实现方式】
${nvwaData.implementation}

【所需技能】
${nvwaData.skills.join(', ')}

请为这个需求设计一个多智能体团队配置。
`;

    // TODO: 调用 Leader Agent 生成团队配置
    // 这里暂时返回模拟数据，实际应该调用 leaderAgent.selectOrCreateTeamSkill()
    
    const mockTeamConfig = {
      name: `${nvwaData.description.substring(0, 20)}团队`,
      description: `基于 Nvwa 需求分析自动生成的团队：${nvwaData.description}`,
      category: this.inferCategory(nvwaData),
      leaderConfig: {
        name: 'Project Manager',
        responsibilities: [
          '需求分析和任务分解',
          '团队协调和进度管理',
          '质量把控和验收'
        ]
      },
      teammates: [
        {
          role: 'Backend Developer',
          specialty: 'API 开发和业务逻辑',
          responsibilities: ['后端服务开发', '数据库设计'],
          agent_type: 'backend-agent'
        },
        {
          role: 'Frontend Developer',
          specialty: '用户界面开发',
          responsibilities: ['前端页面开发', '用户体验优化'],
          agent_type: 'frontend-agent'
        },
        {
          role: 'Data Engineer',
          specialty: '数据处理和集成',
          responsibilities: ['数据源集成', 'ETL 流程'],
          agent_type: 'backend-agent'
        }
      ],
      workflow: {
        steps: [
          {
            step: 1,
            action: '需求分析和系统设计',
            performed_by: 'Project Manager',
            output: 'design_doc'
          },
          {
            step: 2,
            action: '数据源集成',
            performed_by: 'Data Engineer',
            output: 'data_integration'
          },
          {
            step: 3,
            action: '后端 API 开发',
            performed_by: 'Backend Developer',
            output: 'api_implementation'
          },
          {
            step: 4,
            action: '前端界面开发',
            performed_by: 'Frontend Developer',
            output: 'ui_implementation'
          }
        ]
      },
      bindingRules: {
        communication_protocol: '每个步骤完成后更新共享工作区并通知下一个角色',
        conflict_resolution: '由 Project Manager 最终决策',
        quality_standards: '代码需通过测试，符合项目规范'
      }
    };

    return mockTeamConfig;
  }

  /**
   * 保存团队配置到项目
   * @param projectId 项目 ID
   * @param teamConfig 团队配置
   * @param userId 用户 ID
   * @returns 创建的 AiTeam 和 Agent Teams
   */
  async saveTeamToProject(
    projectId: string,
    teamConfig: any,
    userId: string
  ) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. 创建 AiTeam
      const aiTeamId = uuidv4();
      await client.query(
        `INSERT INTO ai_teams (id, project_id, name) VALUES ($1, $2, $3)`,
        [aiTeamId, projectId, teamConfig.name]
      );

      // 2. 创建 Agent Team（包含团队配置）
      const agentTeamId = uuidv4();
      await client.query(
        `INSERT INTO agent_teams (id, team_id, name, agents) VALUES ($1, $2, $3, $4)`,
        [
          agentTeamId,
          aiTeamId,
          `${teamConfig.name} - Agent Team`,
          JSON.stringify({
            leaderConfig: teamConfig.leaderConfig,
            teammates: teamConfig.teammates,
            workflow: teamConfig.workflow,
            bindingRules: teamConfig.bindingRules
          })
        ]
      );

      // 3. 保存为 Team Skill 模板（可选，方便复用）
      const teamSkillId = uuidv4();
      await client.query(
        `INSERT INTO team_skills 
          (id, name, description, category, leader_config, roles, workflow, binding_rules, author_id, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          teamSkillId,
          teamConfig.name,
          teamConfig.description,
          teamConfig.category,
          JSON.stringify(teamConfig.leaderConfig),
          JSON.stringify(teamConfig.teammates),
          JSON.stringify(teamConfig.workflow),
          JSON.stringify(teamConfig.bindingRules),
          userId,
          false // 默认为私有
        ]
      );

      await client.query('COMMIT');

      console.log('✅ Team configuration saved to project successfully');
      
      return {
        success: true,
        aiTeamId,
        agentTeamId,
        teamSkillId,
        teamName: teamConfig.name
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to save team to project:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 根据 Nvwa 数据推断类别
   */
  private inferCategory(nvwaData: any): string {
    const desc = nvwaData.description.toLowerCase();
    const skills = nvwaData.skills.join(' ').toLowerCase();
    
    if (desc.includes('客服') || desc.includes('chat') || desc.includes('对话')) {
      return 'customer-service';
    }
    if (desc.includes('数据') || desc.includes('分析') || desc.includes('analytics')) {
      return 'analysis';
    }
    if (desc.includes('内容') || desc.includes('写作') || desc.includes('content')) {
      return 'content';
    }
    if (desc.includes('电商') || desc.includes('购物') || desc.includes('ecommerce')) {
      return 'development';
    }
    if (skills.includes('nlp') || skills.includes('自然语言')) {
      return 'research';
    }
    
    return 'development'; // 默认类别
  }
}
