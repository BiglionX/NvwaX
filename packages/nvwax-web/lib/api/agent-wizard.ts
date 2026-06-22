import apiClient from './client';

/**
 * v2.2.0 Agent Wizard API 客户端
 *
 * 集成后端 v2.2.0 新服务：
 * - agent-registry.service.ts: 语义匹配和 Agent 注册
 * - nvwax-mcp-server.ts: MCP 协议接口
 * - skill-matching.service.ts: Skill 匹配
 *
 * @see packages/nvwax-server/src/services/agent-registry.service.ts
 * @see packages/nvwax-server/src/mcp/nvwax-mcp-server.ts
 */

/**
 * 注册的 Agent 类型
 */
export interface RegisteredAgent {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  keywords: string[];
  source: 'built-in' | 'yaml' | 'api' | 'community';
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

/**
 * 语义搜索匹配结果
 */
export interface AgentMatchResult {
  agent: RegisteredAgent;
  score: number; // 0-1
  matchReason: string;
}

/**
 * Skill 匹配结果
 */
export interface SkillMatch {
  skillName: string;
  status: 'found' | 'missing_pending' | 'ignored';
  url?: string;
  version?: string;
  dependencies?: string[];
}

/**
 * 创建 Agent 的请求体（前端→后端）
 */
export interface CreateAgentRequest {
  name: string;
  description: string;
  industry?: string;
  capabilities: string[];
  skills: string[];
  tools?: string[];
  /** 模型参数（可选）*/
  modelParams?: {
    model?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
  };
  /** 元数据 */
  metadata?: {
    /** 来源模板 */
    template?: string;
    /** 标签 */
    tags?: string[];
  };
}

/**
 * 创建 Agent 响应
 */
export interface CreateAgentResponse {
  success: boolean;
  data?: {
    id: string;
    name: string;
    version: string;
    /** 工作流 ID（用于执行） */
    workflowId?: string;
  };
  error?: string;
}

/**
 * v2.2.0 Agent Wizard API
 *
 * 调用后端 v2.2.0 引入的新服务
 */
export const agentWizardApi = {
  /**
   * 语义匹配 Agent（v2.2.0 AgentRegistryService）
   * @param query 搜索关键词
   * @param capabilities 必需的能力标签
   * @param topK 返回数量
   */
  searchAgents: async (
    query: string,
    capabilities: string[] = [],
    topK: number = 5
  ): Promise<{ success: boolean; results: AgentMatchResult[]; error?: string }> => {
    try {
      // 直接调用 nvwax-mcp-server.ts 暴露的 MCP 端点
      const response = await apiClient.post('/mcp/tools/call', {
        name: 'nvwax_search_agents',
        arguments: { query, capabilities, top_k: topK }
      });

      // MCP 响应格式: { content: [{ type: 'text', text: '...' }] }
      const text = response.data?.content?.[0]?.text;
      if (!text) {
        return { success: true, results: [] };
      }

      const parsed = JSON.parse(text);
      return { success: true, results: parsed.results || [] };
    } catch (error: any) {
      console.error('[AgentWizardAPI] searchAgents failed:', error.message);
      // 降级：返回空结果，让前端使用本地预置模板
      return { success: false, results: [], error: error.message };
    }
  },

  /**
   * 匹配 Skills（v2.2.0 skillMatchingService）
   */
  matchSkills: async (
    requiredSkills: string[]
  ): Promise<{ success: boolean; matches: Record<string, SkillMatch>; error?: string }> => {
    try {
      const response = await apiClient.post('/mcp/tools/call', {
        name: 'nvwax_match_skills',
        arguments: { required_skills: requiredSkills }
      });

      const text = response.data?.content?.[0]?.text;
      if (!text) {
        return { success: true, matches: {} };
      }

      const parsed = JSON.parse(text);
      return { success: true, matches: parsed.skillMatches || {} };
    } catch (error: any) {
      console.error('[AgentWizardAPI] matchSkills failed:', error.message);
      return { success: false, matches: {}, error: error.message };
    }
  },

  /**
   * 注册新的 Agent 定义（v2.2.0 AgentRegistryService.register）
   * 这是创建流程的最后一步
   */
  registerAgent: async (
    agent: Omit<RegisteredAgent, 'createdAt'>
  ): Promise<{ success: boolean; agent?: RegisteredAgent; error?: string }> => {
    try {
      const response = await apiClient.post('/mcp/tools/call', {
        name: 'nvwax_register_agent',
        arguments: {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          capabilities: agent.capabilities,
          keywords: agent.keywords
        }
      });

      const text = response.data?.content?.[0]?.text;
      if (!text) {
        return { success: false, error: 'Empty response from server' };
      }

      const parsed = JSON.parse(text);
      return { success: parsed.success === true, agent: parsed.agent, error: parsed.success === false ? parsed.error : undefined };
    } catch (error: any) {
      console.error('[AgentWizardAPI] registerAgent failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * 创建并保存 Agent（组合调用：先创建工作流，再注册到 Registry）
   *
   * @deprecated 推荐使用三步向导：先在沙箱测试，再调用 registerAgent
   */
  createAgent: async (
    request: CreateAgentRequest
  ): Promise<CreateAgentResponse> => {
    try {
      // Step 1: 创建 Workflow
      const workflowRes = await apiClient.post('/workflows', {
        name: request.name,
        description: request.description,
        nodes: [
          {
            id: 'llm_node',
            type: 'llm',
            params: {
              prompt: buildAgentPrompt(request),
              model: request.modelParams?.model || 'deepseek-chat',
              temperature: request.modelParams?.temperature ?? 0.7,
              topP: request.modelParams?.topP ?? 0.9,
              max_tokens: request.modelParams?.maxTokens ?? 2000
            }
          }
        ],
        edges: []
      });

      const workflowId = workflowRes.data?.data?.id || workflowRes.data?.id;
      if (!workflowId) {
        return { success: false, error: 'Failed to create workflow' };
      }

      // Step 2: 注册到 Agent Registry
      const agentId = `user-agent-${Date.now()}`;
      const registerResult = await agentWizardApi.registerAgent({
        id: agentId,
        name: request.name,
        description: request.description,
        version: '1.0.0',
        capabilities: request.capabilities,
        keywords: [],
        source: 'api',
        metadata: {
          ...request.metadata,
          workflowId,
          skills: request.skills,
          tools: request.tools
        }
      });

      if (!registerResult.success) {
        // 即使 Registry 注册失败，Workflow 已创建，返回部分成功
        console.warn('[AgentWizardAPI] Registry register failed but workflow created');
      }

      return {
        success: true,
        data: {
          id: agentId,
          name: request.name,
          version: '1.0.0',
          workflowId
        }
      };
    } catch (error: any) {
      console.error('[AgentWizardAPI] createAgent failed:', error.message);
      return { success: false, error: error.message };
    }
  }
};

/**
 * 构建 Agent 的 system prompt
 */
function buildAgentPrompt(request: CreateAgentRequest): string {
  const responsibilities = request.capabilities.length > 0
    ? `你的核心能力：${request.capabilities.join('、')}`
    : '';

  const skillsSection = request.skills.length > 0
    ? `可用技能：${request.skills.join('、')}`
    : '';

  return `你是 ${request.name}。

${request.description}

${responsibilities}

${skillsSection}

请根据用户需求，运用你的能力提供专业、准确、有价值的回复。`.trim();
}

export default agentWizardApi;
