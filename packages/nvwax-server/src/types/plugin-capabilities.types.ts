/**
 * 行业插件能力增强 - 类型定义
 * 
 * 对应 PRD v2.0 中定义的 Action 输出格式、插件能力注册等类型
 */

// ============ 插件动作定义 ============

/**
 * 插件动作参数定义
 */
export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  default?: any;
  enum?: string[];
  items?: { type: string; description?: string };
}

/**
 * 插件动作定义（对应 PRD 2.1.1 Action 输出格式）
 */
export interface PluginAction {
  name: string;
  label: string;
  description?: string;
  parameters: Record<string, ActionParameter>;
  confirm_required?: boolean;
  confirm_message?: string;
  timeout_seconds?: number;
  fallback_text?: string;
}

/**
 * 插件数据查询定义（对应 PRD 2.3）
 */
export interface PluginDataQuery {
  name: string;
  description?: string;
  parameters: Record<string, ActionParameter>;
  returns?: string;
  query?: string;
  cache_ttl_seconds?: number;
}

/**
 * 插件能力整体描述（对应 PRD 2.2.1）
 */
export interface PluginCapability {
  plugin_id: string;
  plugin_name: string;
  actions: PluginAction[];
  data_queries?: PluginDataQuery[];
  skill_ids?: string[];
}

/**
 * 插件能力注册请求体（对应 PRD 2.2.3）
 */
export interface RegisterCapabilityRequest {
  plugin_id: string;
  plugin_name: string;
  actions: PluginAction[];
  data_queries?: PluginDataQuery[];
  skill_ids?: string[];
}

/**
 * 注册的能力记录（数据库存储结构）
 */
export interface PluginCapabilityRecord {
  id: string;
  plugin_id: string;
  plugin_name: string;
  actions: PluginAction[];
  data_queries: PluginDataQuery[];
  skill_ids: string[];
  created_at: string;
  updated_at: string;
}

// ============ Agent 输出类型 ============

/**
 * Agent 文本输出
 */
export interface AgentTextOutput {
  type: 'text';
  content: string;
}

/**
 * Agent Action 输出（对应 PRD 2.1.1）
 */
export interface AgentActionOutput {
  type: 'action';
  action_name: string;
  plugin_id?: string;
  label: string;
  description?: string;
  parameters: Record<string, any>;
  confirm_required?: boolean;
  confirm_message?: string;
  timeout_seconds?: number;
  fallback_text?: string;
}

/**
 * Agent 数据查询输出（对应 PRD 2.3.2）
 */
export interface AgentDataQueryOutput {
  type: 'data_query';
  query_name: string;
  parameters: Record<string, any>;
  reason?: string;
  plugin_id?: string;
}

/**
 * Agent 卡片输出
 */
export interface AgentCardOutput {
  type: 'card';
  title: string;
  description?: string;
  fields?: Array<{ label: string; value: string }>;
  image_url?: string;
  actions?: AgentActionOutput[];
}

/**
 * Agent 混合输出（对应 PRD 2.1.3）
 */
export interface AgentMixedOutput {
  type: 'mixed';
  parts: (AgentTextOutput | AgentActionOutput | AgentDataQueryOutput | AgentCardOutput)[];
}

/**
 * Agent 输出联合类型
 */
export type AgentOutput = AgentTextOutput | AgentActionOutput | AgentDataQueryOutput | AgentCardOutput | AgentMixedOutput;

// ============ 推荐引擎类型 ============

/**
 * 推荐请求（对应 PRD 2.5.1）
 */
export interface RecommendationRequest {
  plugin_ids: string[];
  industry_tags?: string[];
  limit?: number;
  include_skills?: boolean;
}

/**
 * 推荐 Agent 条目
 */
export interface RecommendedAgent {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  plugin_id?: string;
  downloads: number;
  rating: number;
  match_score?: number;
  match_reason?: string;
}

/**
 * 推荐 Skill 条目
 */
export interface RecommendedSkill {
  id: string;
  name: string;
  type: 'knowledge' | 'tool' | 'workflow';
  source: 'skillhub' | 'local';
  description?: string;
  industry_tags?: string[];
  match_score?: number;
}

/**
 * 推荐响应（对应 PRD 2.5.1）
 */
export interface RecommendationResponse {
  recommended_agents: RecommendedAgent[];
  recommended_skills: RecommendedSkill[];
  total_agents: number;
  total_skills: number;
}

// ============ Action 验证类型 ============

/**
 * Action 验证请求（对应 PRD 2.5.2）
 */
export interface ActionValidationRequest {
  action_name: string;
  parameters: Record<string, any>;
  plugin_id?: string;
}

/**
 * Action 验证响应（对应 PRD 2.5.2）
 */
export interface ActionValidationResponse {
  valid: boolean;
  plugin_id?: string;
  action_name: string;
  required_params: string[];
  provided_params: string[];
  missing_params: string[];
  suggestions: string[];
}

// ============ 上下文注入类型 ============

/**
 * 扩展 Express Request 类型以支持 pluginContext
 */
declare global {
  namespace Express {
    interface Request {
      pluginContext?: {
        capabilities: PluginCapability[];
        rawHeader?: string;
      };
    }
  }
}
