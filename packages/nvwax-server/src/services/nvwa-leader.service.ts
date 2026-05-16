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
   * @param isVirtualCompany 是否为虚拟公司模式（多角色团队）
   * @returns 生成的团队配置
   */
  async generateTeamFromNvwa(nvwaData: {
    description: string;
    dataSources: string[];
    outputs: string[];
    implementation: string;
    skills: string[];
  }, isVirtualCompany: boolean = false) {
    console.log(`🤖 Generating ${isVirtualCompany ? 'virtual company' : 'team'} configuration from Nvwa data...`);
    
    // TODO: 接入真实的 LLM API
    // 当环境变量配置了 LLM API Key 时，使用 LLM 生成配置
    // 否则使用 mock 数据作为降级方案
    const useLLM = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (useLLM && isVirtualCompany) {
      // TODO: 实现真实的 LLM 调用
      // return await this.generateWithLLM(nvwaData);
      console.log('⚠️ LLM API not configured, using mock data');
    }
    
    // 使用 mock 数据作为降级方案
    if (isVirtualCompany) {
      return this.generateMockVirtualCompany(nvwaData);
    } else {
      return this.generateMockTeam(nvwaData);
    }
  }

  /**
   * 生成虚拟公司配置（多角色团队）
   */
  private generateMockVirtualCompany(nvwaData: {
    description: string;
    dataSources: string[];
    outputs: string[];
    implementation: string;
    skills: string[];
  }) {
    const desc = nvwaData.description;
    
    // 根据描述推断公司类型
    const companyType = this.inferCompanyType(nvwaData);
    
    // 根据类型生成不同的团队配置
    const templates = {
      marketing: {
        name: `${desc.substring(0, 15)}营销公司`,
        description: `专业营销团队：${desc}`,
        category: 'virtual-company',
        leaderConfig: {
          name: '营销总监',
          responsibilities: ['需求分析', '策略制定', '质量把控', '进度管理']
        },
        roles: [
          {
            role: '数据分析师',
            specialty: '市场数据挖掘和用户洞察',
            responsibilities: ['历史数据分析', '目标人群画像', '竞品调研'],
            agent_type: 'backend-agent'
          },
          {
            role: '文案专员',
            specialty: '营销文案和话术创作',
            responsibilities: ['广告文案', '社交媒体内容', '邮件营销'],
            agent_type: 'backend-agent'
          },
          {
            role: '设计专员',
            specialty: '视觉设计和物料制作',
            responsibilities: ['活动海报', '详情页设计', '品牌视觉'],
            agent_type: 'frontend-agent'
          }
        ],
        workflow: {
          steps: [
            { step: 1, action: '需求分析和目标设定', performed_by: '营销总监', output: 'brief' },
            { step: 2, action: '历史数据分析和市场洞察', performed_by: '数据分析师', output: 'insights' },
            { step: 3, action: '营销策略制定', performed_by: '营销总监', output: 'strategy' },
            { step: 4, action: '营销文案生成', performed_by: '文案专员', output: 'copywriting' },
            { step: 5, action: '视觉设计', performed_by: '设计专员', output: 'visual_assets' },
            { step: 6, action: '最终审核和优化', performed_by: '营销总监', output: 'final_campaign' }
          ]
        },
        bindingRules: {
          communication_protocol: '每个环节完成后提交营销总监审核',
          conflict_resolution: '由营销总监决定最终方案',
          quality_standards: '符合品牌调性，数据驱动决策'
        }
      },
      development: {
        name: `${desc.substring(0, 15)}开发团队`,
        description: `全栈开发团队：${desc}`,
        category: 'virtual-company',
        leaderConfig: {
          name: '技术负责人',
          responsibilities: ['技术选型', '架构设计', '代码审查', '进度管理']
        },
        roles: [
          {
            role: '产品经理',
            specialty: '需求分析和产品设计',
            responsibilities: ['需求梳理', '原型设计', '用户故事'],
            agent_type: 'backend-agent'
          },
          {
            role: '后端开发',
            specialty: 'API开发和业务逻辑',
            responsibilities: ['数据库设计', 'API开发', '性能优化'],
            agent_type: 'backend-agent'
          },
          {
            role: '前端开发',
            specialty: '界面开发和用户体验',
            responsibilities: ['UI组件', '交互逻辑', '响应式设计'],
            agent_type: 'frontend-agent'
          },
          {
            role: '测试工程师',
            specialty: '质量保证和测试',
            responsibilities: ['单元测试', '集成测试', 'Bug修复'],
            agent_type: 'test-agent'
          }
        ],
        workflow: {
          steps: [
            { step: 1, action: '需求分析和系统设计', performed_by: '产品经理', output: 'requirements' },
            { step: 2, action: '技术架构设计', performed_by: '技术负责人', output: 'architecture' },
            { step: 3, action: '数据库设计', performed_by: '后端开发', output: 'db_schema' },
            { step: 4, action: 'API接口开发', performed_by: '后端开发', output: 'api_code' },
            { step: 5, action: '前端界面开发', performed_by: '前端开发', output: 'ui_code' },
            { step: 6, action: '集成测试', performed_by: '测试工程师', output: 'test_report' },
            { step: 7, action: '部署和文档', performed_by: '技术负责人', output: 'deployment_guide' }
          ]
        },
        bindingRules: {
          communication_protocol: '每日站会同步进度，代码提交前需审查',
          conflict_resolution: '由技术负责人最终决策',
          quality_standards: '代码覆盖率>80%，API符合RESTful规范'
        }
      },
      design: {
        name: `${desc.substring(0, 15)}设计工作室`,
        description: `创意设计团队：${desc}`,
        category: 'virtual-company',
        leaderConfig: {
          name: '创意总监',
          responsibilities: ['创意把控', '质量标准', '客户沟通', '项目审核']
        },
        roles: [
          {
            role: '平面设计师',
            specialty: '品牌视觉和平面物料设计',
            responsibilities: ['Logo设计', '包装设计', '宣传物料'],
            agent_type: 'frontend-agent'
          },
          {
            role: 'UI/UX设计师',
            specialty: '用户界面和体验设计',
            responsibilities: ['界面设计', '交互原型', '用户测试'],
            agent_type: 'frontend-agent'
          },
          {
            role: '3D建模师',
            specialty: '三维建模和渲染',
            responsibilities: ['3D模型', '产品渲染', '动画制作'],
            agent_type: 'backend-agent'
          }
        ],
        workflow: {
          steps: [
            { step: 1, action: '创意构思和需求分析', performed_by: '创意总监', output: 'creative_brief' },
            { step: 2, action: '市场调研和竞品分析', performed_by: '创意总监', output: 'research_report' },
            { step: 3, action: '初稿设计', performed_by: '平面设计师', output: 'initial_design' },
            { step: 4, action: 'UI/UX设计', performed_by: 'UI/UX设计师', output: 'ui_design' },
            { step: 5, action: '3D建模和渲染', performed_by: '3D建模师', output: '3d_models' },
            { step: 6, action: '整合优化', performed_by: '创意总监', output: 'final_design' },
            { step: 7, action: '交付和反馈', performed_by: '创意总监', output: 'delivery' }
          ]
        },
        bindingRules: {
          communication_protocol: '设计评审会议，多方协作确认',
          conflict_resolution: '由创意总监决定最终方案',
          quality_standards: '符合品牌规范，用户友好'
        }
      }
    };

    // 使用模板，默认使用 development
    const template = (templates as any)[companyType] || templates.development;
    
    // 更新描述
    template.description = `基于 Nvwa 需求分析自动生成的虚拟公司：${desc}`;
    
    return template;
  }

  /**
   * 生成单个团队配置（非虚拟公司模式）
   */
  private generateMockTeam(nvwaData: {
    description: string;
    dataSources: string[];
    outputs: string[];
    implementation: string;
    skills: string[];
  }) {
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
      roles: [
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
   * 根据公司类型推断类别
   */
  private inferCompanyType(nvwaData: any): string {
    const desc = nvwaData.description.toLowerCase();
    const skills = nvwaData.skills.join(' ').toLowerCase();
    const outputs = nvwaData.outputs.join(' ').toLowerCase();
    
    // 营销类
    if (desc.includes('营销') || desc.includes('marketing') || 
        desc.includes('推广') || desc.includes('广告') ||
        outputs.includes('文案') || outputs.includes('营销')) {
      return 'marketing';
    }
    
    // 设计类
    if (desc.includes('设计') || desc.includes('design') ||
        desc.includes('创意') || desc.includes('视觉') ||
        skills.includes('设计') || outputs.includes('设计')) {
      return 'design';
    }
    
    // 开发类（默认）
    return 'development';
  }

  /**
   * 保存团队配置到项目或市场
   * @param projectId 项目 ID（可选，如果不提供则只保存到市场）
   * @param teamConfig 团队配置
   * @param userId 用户 ID
   * @param isPublic 是否公开到市场
   * @returns 创建结果
   */
  async saveTeamToProject(
    projectId: string | null,
    teamConfig: any,
    userId: string,
    isPublic: boolean = false
  ) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. 创建 Team Skill 模板（保存到市场）
      const teamSkillId = uuidv4();
      await client.query(
        `INSERT INTO team_skills 
          (id, name, description, category, leader_config, roles, workflow, binding_rules, author_id, is_public, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          teamSkillId,
          teamConfig.name,
          teamConfig.description,
          teamConfig.category,
          JSON.stringify(teamConfig.leaderConfig),
          JSON.stringify(teamConfig.roles),
          JSON.stringify(teamConfig.workflow),
          JSON.stringify(teamConfig.bindingRules),
          userId,
          isPublic,
          '1.0.0'
        ]
      );

      // 2. 如果提供了 projectId，也保存到项目中
      let aiTeamId = null;
      let agentTeamId = null;
      
      if (projectId) {
        // 创建 AiTeam
        aiTeamId = uuidv4();
        await client.query(
          `INSERT INTO ai_teams (id, project_id, name) VALUES ($1, $2, $3)`,
          [aiTeamId, projectId, teamConfig.name]
        );

        // 创建 Agent Team（包含团队配置）
        agentTeamId = uuidv4();
        await client.query(
          `INSERT INTO agent_teams (id, team_id, name, agents) VALUES ($1, $2, $3, $4)`,
          [
            agentTeamId,
            aiTeamId,
            `${teamConfig.name} - Agent Team`,
            JSON.stringify({
              leaderConfig: teamConfig.leaderConfig,
              teammates: teamConfig.roles,
              workflow: teamConfig.workflow,
              bindingRules: teamConfig.bindingRules
            })
          ]
        );
      }

      await client.query('COMMIT');

      console.log('✅ Team configuration saved successfully');
      
      return {
        success: true,
        teamSkillId,
        aiTeamId,
        agentTeamId,
        teamName: teamConfig.name
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to save team configuration:', error);
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
