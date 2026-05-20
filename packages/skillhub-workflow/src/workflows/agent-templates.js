/**
 * Agent 工作流模板
 * 预定义的多 Agent 协作工作流
 */

export const agentWorkflowTemplates = {
  'frontend-development': {
    name: 'Frontend Development Workflow',
    description: 'Complete frontend development workflow with multiple agents',
    nodes: [
      {
        id: 'router',
        type: 'agent_router',
        params: {
          input: '{{input.task}}',
          agents: ['frontend-agent', 'backend-agent']
        }
      },
      {
        id: 'frontend_agent',
        type: 'llm',
        params: {
          prompt: '作为前端专家，基于需求 {{input.task}} 设计 React 组件结构，包括 props、state 和事件处理。'
        }
      },
      {
        id: 'test_agent',
        type: 'llm',
        params: {
          prompt: '为前端组件编写单元测试用例，包括边界情况和错误处理。'
        }
      }
    ],
    edges: [
      { from: 'router', to: 'frontend_agent' },
      { from: 'frontend_agent', to: 'test_agent' }
    ]
  },
  
  'fullstack-crud': {
    name: 'Full-Stack CRUD Application',
    description: 'Build a complete CRUD application with database, API, and UI',
    nodes: [
      {
        id: 'db_design',
        type: 'llm',
        params: {
          prompt: '作为数据库专家，为 {{input.entity}} 设计数据模型，包括表结构、字段类型和索引。'
        }
      },
      {
        id: 'api_design',
        type: 'llm',
        params: {
          prompt: '作为后端专家，为 {{input.entity}} 设计 RESTful API 端点（CRUD），包括请求验证和错误处理。'
        }
      },
      {
        id: 'ui_design',
        type: 'llm',
        params: {
          prompt: '作为前端专家，为 {{input.entity}} 设计用户界面，包括列表页、详情页和表单。'
        }
      }
    ],
    edges: [
      { from: 'db_design', to: 'api_design' },
      { from: 'api_design', to: 'ui_design' }
    ]
  },
  
  'skill-research': {
    name: 'Skill Research Workflow',
    description: 'Research and recommend skills from SkillHub',
    nodes: [
      {
        id: 'search',
        type: 'skillhub_search',
        params: {
          query: '{{input.topic}}',
          limit: 10
        }
      },
      {
        id: 'analyze',
        type: 'llm',
        params: {
          prompt: '分析以下技能列表，推荐最适合 {{input.use_case}} 的前3个技能：\n\n{{search.skills}}'
        }
      },
      {
        id: 'detail',
        type: 'skillhub_detail',
        params: {
          skillId: '{{analyze.recommended_skill_id}}'
        }
      }
    ],
    edges: [
      { from: 'search', to: 'analyze' },
      { from: 'analyze', to: 'detail' }
    ]
  },
  
  'team-design-review': {
    name: 'Team Design Review Workflow',
    description: '审查团队设计的合理性和完整性',
    nodes: [
      {
        id: 'validate_structure',
        type: 'reviewer',
        params: {
          reviewType: 'team_design',
          dataToReview: '{{input.teamDesign}}',
          qualityCriteria: {
            minRoles: 3,
            maxRoles: 5,
            requireWorkflow: true
          }
        }
      },
      {
        id: 'check_completeness',
        type: 'llm',
        params: {
          prompt: '检查团队设计中是否遗漏了关键角色：{{input.teamDesign}}\n\n行业标准参考：{{input.industry}}'
        }
      },
      {
        id: 'final_decision',
        type: 'condition',
        params: {
          condition: 'validate_structure.reviewPassed && check_completeness.response.includes("complete")'
        }
      }
    ],
    edges: [
      { from: 'validate_structure', to: 'check_completeness' },
      { from: 'check_completeness', to: 'final_decision' }
    ]
  },
  
  'agent-matching-validation': {
    name: 'Agent Matching Validation',
    description: '验证 Agent 匹配结果的准确性和兼容性',
    nodes: [
      {
        id: 'parallel_search',
        type: 'parallel_search',
        params: {
          searchTasks: [
            { id: 'github', type: 'github_search', query: '{{input.roleName}}' },
            { id: 'hf', type: 'huggingface_search', query: '{{input.roleName}}' }
          ]
        }
      },
      {
        id: 'score_review',
        type: 'reviewer',
        params: {
          reviewType: 'agent_match',
          dataToReview: '{{parallel_search.results}}'
        }
      },
      {
        id: 'select_best',
        type: 'data_transform',
        params: {
          operation: 'extract_field',
          field: 'bestMatch'
        }
      }
    ],
    edges: [
      { from: 'parallel_search', to: 'score_review' },
      { from: 'score_review', to: 'select_best' }
    ]
  },
  
  'nvwa-agent-config-review': {
    name: 'Nvwa Agent Configuration Review',
    description: '审查 Nvwa Agent 配置的完整性和合理性',
    nodes: [
      {
        id: 'validate_config',
        type: 'reviewer',
        params: {
          reviewType: 'nvwa_agent_config',
          dataToReview: '{{input.agentConfig}}',
          qualityCriteria: {
            requiredFields: ['name', 'description', 'dataSources', 'outputs', 'skills'],
            minSkills: 2,
            maxSkills: 10
          }
        }
      },
      {
        id: 'check_dependencies',
        type: 'reviewer',
        params: {
          reviewType: 'skill_dependency_check',
          dataToReview: '{{input.agentConfig.skills}}'
        }
      },
      {
        id: 'final_validation',
        type: 'reviewer',
        params: {
          reviewType: 'final_config',
          dataToReview: {
            config: '{{input.agentConfig}}',
            validation: '{{validate_config.result}}',
            dependencies: '{{check_dependencies.result}}'
          }
        }
      }
    ],
    edges: [
      { from: 'validate_config', to: 'check_dependencies' },
      { from: 'check_dependencies', to: 'final_validation' }
    ]
  },
  
  'nvwa-template-search': {
    name: 'Nvwa Template Parallel Search',
    description: '并行搜索多个源的 Agent 模板（包括国内源）',
    nodes: [
      {
        id: 'search_agents',
        type: 'data_transform',
        params: {
          operation: 'custom_function',
          // 这个工作流会被 NvwaX Server 的 nvwa-agent.service.ts 直接调用
          // 实际搜索在 agent-search.service.ts 中实现
          note: 'This workflow is called by NvwaX Server, which handles multi-source search'
        }
      }
    ],
    edges: []
  }
};

export default agentWorkflowTemplates;
