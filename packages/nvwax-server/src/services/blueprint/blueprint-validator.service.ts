/**
 * BlueprintValidator — 蓝图配置校验（Draft → Deploy 门禁）
 * ------------------------------------------------------------
 * 校验规则（RFC §5.2 Draft→Deploy 门禁）：
 * 1. root 存在且必填字段齐全（name / systemPrompt / model）
 * 2. 每个 subagent 必有 systemPrompt 与存在的 parentId（无悬挂引用）
 * 3. 子树无环（parent 链向上追溯）
 * 4. 深度 ≤ 4（root=0）
 * 5. 无工具名冲突：同一 agent 下 tools 无重复；subagent.name 不与同一 agent 的 tools 冲突
 *
 * 纯函数、零依赖，便于单元测试。
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
  /** 问题路径，如 "root.systemPrompt" / "subagents[2].parentId" */
  path: string;
  message: string;
  /** 严重级别：error=Deploy 拒绝；warn=允许 Deploy 但提示 */
  severity: 'error' | 'warn';
}

export interface BlueprintValidationResult {
  valid: boolean;
  issues: BlueprintValidationIssue[];
}

/** 最大子树深度（RFC：深度 ≤ 4） */
export const MAX_BLUEPRINT_DEPTH = 4;

const REQUIRED_ROOT_FIELDS: Array<{ field: keyof BlueprintRoot; label: string }> = [
  { field: 'name', label: 'name' },
  { field: 'systemPrompt', label: 'systemPrompt' },
  { field: 'model', label: 'model' },
];

export function validateBlueprint(config: BlueprintConfig): BlueprintValidationResult {
  const issues: BlueprintValidationIssue[] = [];

  // ---- 1. root 校验 ----
  if (!config.root || typeof config.root !== 'object') {
    issues.push({ path: 'root', message: '缺少根 Agent（root）', severity: 'error' });
    // root 缺失时无法继续树校验
    return { valid: false, issues };
  }
  const root = config.root;
  if (!root.id) {
    issues.push({ path: 'root.id', message: '根 Agent 缺少 id', severity: 'error' });
  }
  for (const { field, label } of REQUIRED_ROOT_FIELDS) {
    if (!root[field] || String(root[field]).trim() === '') {
      issues.push({ path: `root.${field}`, message: `根 Agent 缺少必填字段 ${label}`, severity: 'error' });
    }
  }

  // ---- 2/3/4. subagent 树校验 ----
  const subagents = config.subagents ?? [];
  const byId = new Map<string, BlueprintSubagent>();
  for (const s of subagents) {
    if (s.id) {
      if (byId.has(s.id)) {
        issues.push({ path: `subagents[${subagents.indexOf(s)}].id`, message: `子代理 id 重复: ${s.id}`, severity: 'error' });
      } else {
        byId.set(s.id, s);
      }
    }
  }
  if (root.id && byId.has(root.id)) {
    issues.push({ path: 'root.id', message: `子代理 id 与根 Agent 冲突: ${root.id}`, severity: 'error' });
  }

  subagents.forEach((s, i) => {
    const p = `subagents[${i}]`;
    if (!s.id) {
      issues.push({ path: `${p}.id`, message: '子代理缺少 id', severity: 'error' });
    }
    if (!s.systemPrompt || s.systemPrompt.trim() === '') {
      issues.push({ path: `${p}.systemPrompt`, message: `子代理 ${s.id || '(无名)'} 缺少 systemPrompt`, severity: 'error' });
    }
    if (!s.parentId) {
      issues.push({ path: `${p}.parentId`, message: `子代理 ${s.id || '(无名)'} 缺少父节点（parentId）`, severity: 'error' });
    } else if (s.parentId !== root.id && !byId.has(s.parentId)) {
      issues.push({ path: `${p}.parentId`, message: `子代理 ${s.id} 引用了不存在的父节点 ${s.parentId}`, severity: 'error' });
    }
  });

  // 环检测：沿 parent 链向上追溯，若回到自身或超深则报错
  for (const s of subagents) {
    if (!s.id) continue;
    const depth = computeDepth(s.id, root.id, byId);
    if (depth === null) {
      issues.push({ path: `subagents[${subagents.indexOf(s)}].id`, message: `检测到环引用（节点 ${s.id}）`, severity: 'error' });
    } else if (depth > MAX_BLUEPRINT_DEPTH) {
      issues.push({
        path: `subagents[${subagents.indexOf(s)}].id`,
        message: `节点 ${s.id} 深度 ${depth} 超过上限 ${MAX_BLUEPRINT_DEPTH}`,
        severity: 'error',
      });
    }
  }

  // ---- 5. 工具/技能引用校验 ----
  const toolsByAgent = new Map<string, Set<string>>();
  for (const t of config.tools ?? []) {
    if (!t.agentId || !t.toolName) {
      issues.push({ path: 'tools', message: '工具引用缺少 agentId 或 toolName', severity: 'error' });
      continue;
    }
    const set = toolsByAgent.get(t.agentId) ?? new Set<string>();
    if (set.has(t.toolName)) {
      issues.push({ path: 'tools', message: `Agent ${t.agentId} 下工具名重复: ${t.toolName}`, severity: 'error' });
    } else {
      set.add(t.toolName);
    }
    toolsByAgent.set(t.agentId, set);
  }
  // 子代理名字与同 agent 下工具名冲突（RFC：sub-agent 名不得与内置工具冲突）
  for (const s of subagents) {
    if (!s.id || !s.name) continue;
    const parentTools = toolsByAgent.get(s.id) ?? new Set<string>();
    if (parentTools.has(s.name)) {
      issues.push({ path: `subagents[${subagents.indexOf(s)}].name`, message: `子代理名 "${s.name}" 与自身工具名冲突`, severity: 'error' });
    }
  }

  // 技能引用存在性
  for (const sk of config.skills ?? []) {
    if (!sk.agentId || !sk.skillId) {
      issues.push({ path: 'skills', message: '技能引用缺少 agentId 或 skillId', severity: 'error' });
    }
  }

  const errors = issues.filter((i) => i.severity === 'error');
  return { valid: errors.length === 0, issues };
}

/**
 * 计算节点深度（root=0）。返回 null 表示存在环。
 * 沿 parent 链向上追溯，路径长度即深度。
 */
function computeDepth(
  nodeId: string,
  rootId: string,
  byId: Map<string, BlueprintSubagent>
): number | null {
  const visited = new Set<string>([nodeId]);
  let current = byId.get(nodeId);
  let depth = 1;
  while (current && current.parentId) {
    if (current.parentId === rootId) {
      return depth;
    }
    if (visited.has(current.parentId)) {
      return null; // 环
    }
    visited.add(current.parentId);
    const parent = byId.get(current.parentId);
    if (!parent) {
      return null; // 悬挂引用（已由引用校验报错，这里避免死循环）
    }
    current = parent;
    depth += 1;
    if (depth > MAX_BLUEPRINT_DEPTH + 1) {
      return depth; // 超深提前返回
    }
  }
  return null;
}
