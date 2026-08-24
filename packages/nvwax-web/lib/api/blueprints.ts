import { authedJson, buildQuery } from '@/lib/oidc/authed-fetch';

/**
 * 蓝图配置结构（与后端 BlueprintConfig 对齐）
 */
export interface BlueprintRoot {
  id: string;
  name: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
}

export interface BlueprintSubagent {
  id: string;
  name: string;
  systemPrompt?: string;
  parentId?: string;
}

export interface BlueprintSkillRef {
  agentId: string;
  skillId: string;
  skillName?: string;
}

export interface BlueprintToolRef {
  agentId: string;
  toolName: string;
}

export interface BlueprintConfig {
  root?: BlueprintRoot;
  subagents?: BlueprintSubagent[];
  skills?: BlueprintSkillRef[];
  tools?: BlueprintToolRef[];
}

export interface BlueprintValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warn';
}

export interface BlueprintValidationResult {
  valid: boolean;
  issues: BlueprintValidationIssue[];
}

export interface AgentBlueprint {
  id: string;
  agentId: string;
  sessionId?: string | null;
  config: BlueprintConfig;
  status: 'draft' | 'deployed';
  deployedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 蓝图 API 客户端（Draft → Deploy 门禁）
 *
 * 鉴权说明：后端 /blueprints 挂载 universalAuthMiddleware（仅认 Bearer / ?token=），
 * 统一走 authedJson（/api/auth/proxy 注入 OIDC token）。
 */
export const blueprintApi = {
  listByAgent: async (agentId: string) => {
    return authedJson<{ success: boolean; data: AgentBlueprint[] }>(
      `/blueprints${buildQuery({ agentId })}`,
    );
  },

  get: async (id: string) => {
    return authedJson<{ success: boolean; data: AgentBlueprint }>(`/blueprints/${id}`);
  },

  create: async (body: { agentId: string; sessionId?: string; config: BlueprintConfig }) => {
    return authedJson<{
      success: boolean;
      data: { id: string; status: 'draft' };
      validation: BlueprintValidationResult;
    }>('/blueprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  update: async (id: string, config: BlueprintConfig) => {
    return authedJson<{
      success: boolean;
      data: { id: string; status: string };
      validation: BlueprintValidationResult;
    }>(`/blueprints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
  },

  deploy: async (id: string) => {
    return authedJson<{
      success: boolean;
      data?: { id: string; status: 'deployed'; deployedAt: string };
      error?: string;
      validation?: BlueprintValidationResult;
    }>(`/blueprints/${id}/deploy`, { method: 'POST' });
  },

  remove: async (id: string) => {
    return authedJson<{ success: boolean; message?: string }>(`/blueprints/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * 客户端轻量校验（与服务端 BlueprintValidator 行为对齐）
 * 用于前端在保存/部署前实时反馈，避免来回请求
 */
export function validateBlueprintClient(config: BlueprintConfig): BlueprintValidationResult {
  const issues: BlueprintValidationIssue[] = [];
  const root = config.root;
  if (!root) {
    issues.push({ path: 'root', message: '缺少根 Agent', severity: 'error' });
    return { valid: false, issues };
  }
  if (!root.systemPrompt?.trim()) {
    issues.push({ path: 'root.systemPrompt', message: '根 Agent 缺少 systemPrompt', severity: 'error' });
  }
  if (!root.model?.trim()) {
    issues.push({ path: 'root.model', message: '根 Agent 缺少 model', severity: 'error' });
  }
  if (!root.name?.trim()) {
    issues.push({ path: 'root.name', message: '根 Agent 缺少 name', severity: 'error' });
  }

  const subagents = config.subagents ?? [];
  const byId = new Map<string, BlueprintSubagent>();
  subagents.forEach((s) => { if (s.id) byId.set(s.id, s); });

  subagents.forEach((s, i) => {
    const p = `subagents[${i}]`;
    if (!s.systemPrompt?.trim()) {
      issues.push({ path: `${p}.systemPrompt`, message: `子代理 ${s.id || '(无名)'} 缺少 systemPrompt`, severity: 'error' });
    }
    if (!s.parentId) {
      issues.push({ path: `${p}.parentId`, message: `子代理 ${s.id || '(无名)'} 缺少 parentId`, severity: 'error' });
    } else if (s.parentId !== root.id && !byId.has(s.parentId)) {
      issues.push({ path: `${p}.parentId`, message: `引用了不存在的父节点 ${s.parentId}`, severity: 'error' });
    }
  });

  // 工具名冲突
  const toolsByAgent = new Map<string, Set<string>>();
  for (const t of config.tools ?? []) {
    const set = toolsByAgent.get(t.agentId) ?? new Set<string>();
    if (set.has(t.toolName)) {
      issues.push({ path: 'tools', message: `Agent ${t.agentId} 下工具名重复: ${t.toolName}`, severity: 'error' });
    }
    set.add(t.toolName);
    toolsByAgent.set(t.agentId, set);
  }

  return { valid: issues.filter((i) => i.severity === 'error').length === 0, issues };
}
