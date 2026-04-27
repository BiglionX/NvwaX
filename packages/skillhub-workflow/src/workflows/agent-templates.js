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
  }
};

export default agentWorkflowTemplates;
