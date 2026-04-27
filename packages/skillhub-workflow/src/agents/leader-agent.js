import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';

/**
 * Leader Agent - 智能团队编排器
 * 
 * 负责：
 * 1. 根据需求智能匹配或创建 Team Skill
 * 2. 动态组建团队
 * 3. 按照工作流执行团队任务
 * 4. 协调 Teammate 之间的协作
 */
export class LeaderAgent {
  constructor() {
    this.llm = new ChatOpenAI({
      modelName: process.env.OPENAI_API_KEY ? 'gpt-4' : 'gpt-3.5-turbo',
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY || 'mock-key'
    });
    
    // 初始化时加载可用的 Team Skills
    this.availableTeamSkills = [];
    this.loadTeamSkills();
  }

  /**
   * 智能选择或创建 Team Skill
   * @param {string} requirement 用户需求描述
   * @returns {Promise<Object>} TeamSkillConfig 团队配置
   */
  async selectOrCreateTeamSkill(requirement) {
    console.log('🎯 Leader Agent analyzing requirement:', requirement);
    
    // Step 1: 尝试匹配现有的 Team Skill
    const matchedSkill = await this.matchTeamSkill(requirement);
    
    if (matchedSkill) {
      console.log('✅ Found matching Team Skill:', matchedSkill.name);
      return matchedSkill;
    }
    
    // Step 2: 如果没有匹配，动态创建新的团队配置
    console.log('🔄 No matching template found, creating dynamic team...');
    return await this.createDynamicTeam(requirement);
  }

  /**
   * 匹配 Team Skill
   * @param {string} requirement 用户需求
   * @returns {Promise<Object|null>} 匹配的 Team Skill 或 null
   */
  async matchTeamSkill(requirement) {
    if (this.availableTeamSkills.length === 0) {
      return null;
    }

    const prompt = `
分析以下用户需求，从可用的 Team Skills 模板中选择最合适的：

用户需求: ${requirement}

可用的 Team Skills 模板:
${this.availableTeamSkills.map((skill, index) => 
  `${index + 1}. ${skill.name} (${skill.category})
   描述: ${skill.description}
   团队成员: ${skill.teammates.map(t => t.role).join(', ')}
`
).join('\n')}

请返回最匹配的 Team Skill 的编号（1-${this.availableTeamSkills.length}）。
如果没有合适的模板，返回 0。

只返回数字，不要有其他文字。
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      const selectedIndex = parseInt(content);
      
      if (selectedIndex > 0 && selectedIndex <= this.availableTeamSkills.length) {
        return this.availableTeamSkills[selectedIndex - 1];
      }
      
      return null;
    } catch (error) {
      console.error('Team Skill matching failed:', error);
      return null;
    }
  }

  /**
   * 动态创建团队配置
   * @param {string} requirement 用户需求
   * @returns {Promise<Object>} 动态生成的 TeamSkillConfig
   */
  async createDynamicTeam(requirement) {
    const prompt = `
作为团队组建专家，请为以下用户需求设计一个多智能体团队：

用户需求: ${requirement}

请按照以下 JSON 格式返回团队配置（只返回 JSON，不要有其他文字）：

{
  "name": "团队名称（简洁明了）",
  "description": "团队描述（说明团队的专长和适用场景）",
  "category": "类别（development/research/content/analysis/marketing/other）",
  "leaderConfig": {
    "name": "Leader角色名称",
    "responsibilities": ["职责1", "职责2", "职责3"]
  },
  "teammates": [
    {
      "role": "角色名称",
      "specialty": "专长领域",
      "responsibilities": ["具体职责1", "具体职责2"],
      "agent_type": "frontend-agent|backend-agent|database-agent|test-agent|docs-agent"
    }
  ],
  "workflow": {
    "steps": [
      {
        "step": 1,
        "action": "具体的动作描述",
        "performed_by": "执行该步骤的角色名称",
        "output": "产出物名称"
      }
    ]
  },
  "bindingRules": {
    "communication_protocol": "团队成员之间的沟通协议",
    "conflict_resolution": "冲突解决机制",
    "quality_standards": "质量标准和要求"
  }
}

要求：
1. 团队成员数量控制在 3-5 人
2. 工作流步骤要清晰、可执行
3. 每个角色的职责要明确
4. 确保团队能够完成用户的需求
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      const content = response.content.trim();
      
      // 提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      const config = JSON.parse(jsonMatch[0]);
      
      // 验证必要字段
      if (!config.name || !config.teammates || !config.workflow) {
        throw new Error('Invalid team configuration');
      }
      
      console.log('✅ Dynamic team created:', config.name);
      
      return config;
    } catch (error) {
      console.error('Dynamic team creation failed:', error);
      
      // 返回默认配置
      return this.getDefaultTeamConfig(requirement);
    }
  }

  /**
   * 执行团队任务
   * @param {Object} teamConfig 团队配置
   * @param {string} requirement 用户需求
   * @param {Object} workspace 共享工作区
   * @returns {Promise<Object>} 执行结果
   */
  async executeTeamTask(teamConfig, requirement, workspace = {}) {
    console.log('🚀 Starting team execution...');
    console.log('Team:', teamConfig.name);
    console.log('Requirement:', requirement);
    
    const { teammates, workflow, bindingRules } = teamConfig;
    const results = {};
    const sharedWorkspace = { ...workspace };
    
    // 按照工作流步骤执行
    for (const step of workflow.steps) {
      console.log(`\n📋 Executing step ${step.step}: ${step.action}`);
      
      // 找到执行该步骤的角色
      const executor = teammates.find(t => t.role === step.performed_by);
      
      if (!executor) {
        console.warn(`⚠️ Executor not found for role: ${step.performed_by}`);
        continue;
      }
      
      // 执行任务
      const result = await this.executeRoleTask(executor, step, {
        requirement,
        workspace: sharedWorkspace,
        previousResults: results,
        bindingRules
      });
      
      // 保存结果到共享工作区
      results[step.step] = result;
      sharedWorkspace[step.output] = result;
      
      console.log(`✅ Step ${step.step} completed by ${executor.role}`);
    }
    
    return {
      success: true,
      teamName: teamConfig.name,
      results,
      workspace: sharedWorkspace,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * 执行单个角色任务
   * @param {Object} role 角色定义
   * @param {Object} step 工作流步骤
   * @param {Object} context 上下文信息
   * @returns {Promise<Object>} 执行结果
   */
  async executeRoleTask(role, step, context) {
    const prompt = `
你是 ${role.role}。

【你的专长】
${role.specialty}

【你的职责】
${role.responsibilities?.join('\n') || '无特定职责'}

【当前任务】
${step.action}

【用户需求】
${context.requirement}

【共享工作区中的信息】
${JSON.stringify(context.workspace, null, 2)}

【之前步骤的结果】
${JSON.stringify(context.previousResults, null, 2)}

【团队协作规则】
- 沟通协议: ${context.bindingRules.communication_protocol}
- 质量标准: ${context.bindingRules.quality_standards}

请提供专业的解决方案，包括：
1. 你的分析和思路
2. 具体的实现方案或建议
3. 需要注意的事项

请用中文回答，保持专业和详细。
`;

    try {
      const response = await this.llm.invoke([new HumanMessage(prompt)]);
      
      return {
        role: role.role,
        action: step.action,
        output: response.content,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };
    } catch (error) {
      console.error(`Role task failed for ${role.role}:`, error);
      
      return {
        role: role.role,
        action: step.action,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        status: 'failed'
      };
    }
  }

  /**
   * 加载可用的 Team Skills
   */
  loadTeamSkills() {
    // 这里可以调用 API 从数据库加载公开的 Team Skills
    // 暂时使用硬编码的示例数据
    
    this.availableTeamSkills = [
      {
        name: '全栈开发团队',
        description: '完整的全栈应用开发团队，包括前端、后端、数据库和测试专家',
        category: 'development',
        leaderConfig: {
          name: 'Tech Lead',
          responsibilities: ['需求分析', '技术选型', '代码审查', '进度管理']
        },
        teammates: [
          {
            role: 'Frontend Developer',
            specialty: 'React/Vue 组件开发',
            agent_type: 'frontend-agent'
          },
          {
            role: 'Backend Developer',
            specialty: 'API 设计和业务逻辑',
            agent_type: 'backend-agent'
          },
          {
            role: 'Database Engineer',
            specialty: '数据模型设计和优化',
            agent_type: 'database-agent'
          }
        ],
        workflow: {
          steps: [
            { step: 1, action: '需求分析和系统设计', performed_by: 'Tech Lead', output: 'design_doc' },
            { step: 2, action: '数据库设计', performed_by: 'Database Engineer', output: 'db_schema' },
            { step: 3, action: 'API 接口设计', performed_by: 'Backend Developer', output: 'api_spec' },
            { step: 4, action: '前端界面开发', performed_by: 'Frontend Developer', output: 'ui_components' }
          ]
        },
        bindingRules: {
          communication_protocol: '每个步骤完成后更新共享工作区并通知下一个角色',
          conflict_resolution: '由 Tech Lead 最终决策',
          quality_standards: '代码需通过单元测试，API 需符合 RESTful 规范'
        }
      }
    ];
    
    console.log(`📚 Loaded ${this.availableTeamSkills.length} team skills`);
  }

  /**
   * 获取默认团队配置（备用方案）
   * @param {string} requirement 用户需求
   * @returns {Object} 默认团队配置
   */
  getDefaultTeamConfig(requirement) {
    return {
      name: '通用开发团队',
      description: '适用于一般软件开发任务的通用团队',
      category: 'development',
      leaderConfig: {
        name: 'Project Manager',
        responsibilities: ['任务分解', '进度管理', '质量把控']
      },
      teammates: [
        {
          role: 'Developer',
          specialty: '全栈开发',
          responsibilities: ['代码实现', 'API设计'],
          agent_type: 'backend-agent'
        },
        {
          role: 'Designer',
          specialty: 'UI/UX设计',
          responsibilities: ['界面设计', '用户体验'],
          agent_type: 'frontend-agent'
        }
      ],
      workflow: {
        steps: [
          { step: 1, action: '需求分析', performed_by: 'Project Manager', output: 'requirements' },
          { step: 2, action: '技术方案设计', performed_by: 'Developer', output: 'design' },
          { step: 3, action: '界面原型', performed_by: 'Designer', output: 'prototype' }
        ]
      },
      bindingRules: {
        communication_protocol: '每个步骤完成后更新共享工作区',
        conflict_resolution: '由 Project Manager 最终决策',
        quality_standards: '代码需通过测试，设计需符合规范'
      }
    };
  }
}

// 导出单例实例
export const leaderAgent = new LeaderAgent();
