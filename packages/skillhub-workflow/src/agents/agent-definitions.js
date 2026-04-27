/**
 * Agent 类型定义
 * 定义各种专业 Agent 的职责和关键词
 */

export const AGENT_TYPES = {
  FRONTEND: {
    id: 'frontend-agent',
    name: 'Frontend Agent',
    description: '专长于 React/Vue 组件、UI/UX、状态管理',
    keywords: ['前端', '界面', '组件', 'UI', '样式', 'React', 'Vue', 'CSS', 'HTML', 'JavaScript'],
    workflowTemplate: {
      nodes: [
        { 
          type: 'llm', 
          params: { 
            prompt: '作为前端专家，分析需求并设计组件结构，包括 props、state 和事件处理。' 
          } 
        },
        { 
          type: 'data_transform', 
          params: { 
            operation: 'json_stringify' 
          } 
        }
      ]
    }
  },
  BACKEND: {
    id: 'backend-agent',
    name: 'Backend Agent',
    description: '专长于 API 设计、业务逻辑、认证授权',
    keywords: ['后端', 'API', '服务器', '接口', 'Express', 'Fastify', '路由', '中间件', '认证'],
    workflowTemplate: {
      nodes: [
        { 
          type: 'llm', 
          params: { 
            prompt: '作为后端专家，设计 RESTful API 端点、请求验证和业务逻辑实现。' 
          } 
        }
      ]
    }
  },
  DATABASE: {
    id: 'database-agent',
    name: 'Database Agent',
    description: '专长于数据模型、查询优化、迁移脚本',
    keywords: ['数据库', '表结构', 'SQL', 'Prisma', 'Schema', '模型', '迁移', '索引'],
    workflowTemplate: {
      nodes: [
        { 
          type: 'llm', 
          params: { 
            prompt: '作为数据库专家，设计数据模型、表结构和关系，包括字段类型和索引策略。' 
          } 
        }
      ]
    }
  },
  TEST: {
    id: 'test-agent',
    name: 'Test Agent',
    description: '专长于单元测试、集成测试、E2E 测试',
    keywords: ['测试', '用例', 'jest', 'cypress', '测试覆盖率', '断言', 'mock'],
    workflowTemplate: {
      nodes: [
        { 
          type: 'llm', 
          params: { 
            prompt: '作为测试专家，编写全面的测试用例，包括边界情况和错误处理。' 
          } 
        }
      ]
    }
  },
  DOCS: {
    id: 'docs-agent',
    name: 'Documentation Agent',
    description: '专长于 API 文档、README、技术文档',
    keywords: ['文档', '说明', '注释', 'README', 'API 文档', '使用指南'],
    workflowTemplate: {
      nodes: [
        { 
          type: 'llm', 
          params: { 
            prompt: '作为文档专家，编写清晰、完整的技术文档，包括示例代码和使用说明。' 
          } 
        }
      ]
    }
  }
};

/**
 * 根据关键词查找匹配的 Agent
 * @param {string[]} keywords - 搜索关键词数组
 * @returns {Array} 匹配的 Agent 列表
 */
export function findAgentsByKeywords(keywords) {
  const matchedAgents = [];
  
  for (const [key, agent] of Object.entries(AGENT_TYPES)) {
    const hasMatch = keywords.some(keyword => 
      agent.keywords.some(agentKeyword => 
        keyword.toLowerCase().includes(agentKeyword.toLowerCase()) ||
        agentKeyword.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    if (hasMatch) {
      matchedAgents.push(agent);
    }
  }
  
  return matchedAgents;
}

/**
 * 根据任务描述智能选择最合适的 Agent
 * @param {string} taskDescription - 任务描述
 * @returns {Object} 最合适的 Agent
 */
export function selectBestAgent(taskDescription) {
  const keywords = taskDescription.split(/[\s,，]+/).filter(k => k.length > 0);
  const matchedAgents = findAgentsByKeywords(keywords);
  
  if (matchedAgents.length > 0) {
    return matchedAgents[0];
  }
  
  // 默认返回 backend agent
  return AGENT_TYPES.BACKEND;
}

export default AGENT_TYPES;
