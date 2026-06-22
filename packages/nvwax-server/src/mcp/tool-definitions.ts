/**
 * MCP Tool Definitions
 * 
 * 定义 NvwaX 暴露给外部 Agent 框架的 MCP Tools
 * 遵循 Model Context Protocol 规范
 */

// ============================================================
// Tool Schema 定义
// ============================================================

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPPropertySchema>;
    required?: string[];
  };
}

export interface MCPPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: MCPPropertySchema;
  properties?: Record<string, MCPPropertySchema>;
}

// ============================================================
// NvwaX MCP Tools
// ============================================================

export const NVWAX_MCP_TOOLS: MCPToolDefinition[] = [
  {
    name: 'nvwax_search_agents',
    description: '搜索匹配的 AI Agent。根据角色名称、所需能力或关键词，从 NvwaX 注册表中搜索最匹配的 Agent。',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索查询，可以是角色名称、职责描述或关键词'
        },
        capabilities: {
          type: 'array',
          description: '所需能力标签列表',
          items: { type: 'string', description: '能力标签' }
        },
        top_k: {
          type: 'number',
          description: '返回的最大匹配数量（默认 5）'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'nvwax_design_team',
    description: '设计 AI 团队结构。根据团队类型、职责和期望产出，设计包含 3-5 个角色的团队配置方案。',
    inputSchema: {
      type: 'object',
      properties: {
        team_type: {
          type: 'string',
          description: '团队类型，如"营销团队"、"开发团队"、"客服团队"'
        },
        responsibilities: {
          type: 'array',
          description: '团队主要职责列表',
          items: { type: 'string', description: '职责描述' }
        },
        expected_outputs: {
          type: 'array',
          description: '期望产出类型列表',
          items: { type: 'string', description: '产出类型' }
        },
        industry: {
          type: 'string',
          description: '行业背景（可选）'
        }
      },
      required: ['team_type', 'responsibilities']
    }
  },
  {
    name: 'nvwax_match_skills',
    description: '为团队匹配 Skills。根据团队设计中各角色所需的技能，从 SkillHub 搜索匹配的技能。',
    inputSchema: {
      type: 'object',
      properties: {
        required_skills: {
          type: 'array',
          description: '所需技能名称列表',
          items: { type: 'string', description: '技能名称' }
        },
        team_type: {
          type: 'string',
          description: '团队类型（用于优化匹配）'
        }
      },
      required: ['required_skills']
    }
  },
  {
    name: 'nvwax_analyze_requirements',
    description: '分析用户需求。从用户的自然语言描述中提取团队类型、职责、产出等结构化信息。',
    inputSchema: {
      type: 'object',
      properties: {
        user_input: {
          type: 'string',
          description: '用户的自然语言需求描述'
        }
      },
      required: ['user_input']
    }
  },
  {
    name: 'nvwax_get_best_practices',
    description: '获取最佳实践。基于历史创建数据，获取特定团队类型的最佳配置建议。',
    inputSchema: {
      type: 'object',
      properties: {
        team_type: {
          type: 'string',
          description: '团队类型'
        },
        limit: {
          type: 'number',
          description: '返回的最佳实践数量（默认 3）'
        }
      },
      required: ['team_type']
    }
  },
  {
    name: 'nvwax_register_agent',
    description: '注册新的 Agent 定义。将自定义 Agent 添加到 NvwaX 注册表中，供后续团队创建使用。',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Agent 唯一标识符'
        },
        name: {
          type: 'string',
          description: 'Agent 名称'
        },
        description: {
          type: 'string',
          description: 'Agent 描述'
        },
        capabilities: {
          type: 'array',
          description: '能力标签列表',
          items: { type: 'string', description: '能力标签' }
        },
        keywords: {
          type: 'array',
          description: '关键词列表（用于搜索匹配）',
          items: { type: 'string', description: '关键词' }
        }
      },
      required: ['id', 'name', 'description', 'capabilities']
    }
  }
];

/**
 * 获取所有 Tool 名称
 */
export function getToolNames(): string[] {
  return NVWAX_MCP_TOOLS.map(t => t.name);
}

/**
 * 根据名称获取 Tool 定义
 */
export function getToolByName(name: string): MCPToolDefinition | undefined {
  return NVWAX_MCP_TOOLS.find(t => t.name === name);
}
