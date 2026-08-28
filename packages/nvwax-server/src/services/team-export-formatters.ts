/**
 * Team Export Formatters
 *
 * 多壳落地转换器（纯函数，无 DB 依赖）：
 * - json      ：通用 JSON
 * - yaml      ：通用 YAML
 * - proclaw   ：ProClaw 桌面端（.proclaw-team.json）
 * - crewai    ：CrewAI YAML（pip install crewai && crewai run team.yaml）
 * - langgraph ：LangGraph StateGraph JSON（用户自行写 driver）
 *
 * 供两条导出路径共用：
 * 1. Agent 仓库（aiteams 表）—— export.service.ts
 * 2. 创建流程成功弹窗（aiteam_creation_sessions）—— session-based export
 */

import yaml from 'js-yaml';

export type TeamExportFormat = 'json' | 'yaml' | 'proclaw' | 'crewai' | 'langgraph';

export const SUPPORTED_TEAM_EXPORT_FORMATS: TeamExportFormat[] = [
  'json',
  'yaml',
  'proclaw',
  'crewai',
  'langgraph'
];

export interface NormalizedTeamData {
  name: string;
  description?: string;
  version?: string;
  tags?: string[];
  category?: string | null;
  workflow?: Record<string, any>;
  triggers?: Record<string, any>;
  /** 统一成员形状：role / responsibilities / config */
  members: Array<{
    role: string;
    responsibilities?: any;
    config?: Record<string, any>;
    description?: string;
    agentName?: string;
  }>;
  metadata?: Record<string, any>;
}

/**
 * 将任意来源的团队原始数据归一化为统一形状。
 * 兼容：
 * - aiteams 表行（member.role / member.responsibilities / member.config）
 * - session 的 team_design.roles[]（roleName / description / responsibilities）
 */
export function normalizeTeamData(raw: any): NormalizedTeamData {
  const sourceMembers = Array.isArray(raw.members) ? raw.members : [];
  const roles = Array.isArray(raw.teamDesign?.roles) ? raw.teamDesign.roles : [];

  const members = sourceMembers.length > 0
    ? sourceMembers.map((m: any) => ({
        role: m.role || m.agentName || m.roleName || 'Agent',
        responsibilities: m.responsibilities,
        config: m.config || {},
        description: m.description,
        agentName: m.agentName
      }))
    : roles.map((r: any) => ({
        role: r.roleName || r.role || 'Agent',
        responsibilities: r.responsibilities || [],
        config: {
          systemPrompt:
            r.description ||
            `你是 ${r.roleName || r.role || 'Agent'}。`
        },
        description: r.description
      }));

  return {
    name: raw.name || raw.teamName || 'NvwaX Team',
    description: raw.description,
    version: raw.version || '1.0.0',
    tags: raw.tags || [],
    category: raw.category ?? null,
    workflow: raw.workflow || raw.teamDesign?.collaborationFlow || {},
    triggers: raw.triggers || {},
    members,
    metadata: raw.metadata
  };
}

/**
 * 转换为 ProClaw 格式
 */
export function convertToProClawFormat(data: NormalizedTeamData): any {
  return {
    proclaw_version: '1.0.0',
    type: 'aiteam',
    name: data.name,
    description: data.description,
    version: data.version,
    tags: data.tags,
    category: data.category,
    workflow: data.workflow,
    triggers: data.triggers,
    members: data.members,
    compatibility: {
      min_proclaw_version: '1.0.0',
      required_modules: extractRequiredModules(data)
    },
    metadata: data.metadata
  };
}

function extractRequiredModules(data: NormalizedTeamData): string[] {
  const modules = new Set<string>();
  // 从 responsibilities / config 中尽力提取模块名（保守策略：不猜测）
  for (const m of data.members) {
    const cfg = m.config || {};
    if (Array.isArray(cfg.modules)) {
      cfg.modules.forEach((x: string) => modules.add(x));
    }
  }
  return Array.from(modules);
}

/**
 * 转换为 CrewAI YAML 格式
 */
export function convertToCrewAIYaml(data: NormalizedTeamData): any {
  const agents = data.members.map((m) => {
    const responsibilities = m.responsibilities || [];
    const goal = Array.isArray(responsibilities)
      ? responsibilities.join('；')
      : String(responsibilities || m.description || m.role);
    const backstory =
      (m.config && (m.config.systemPrompt || m.config.backstory)) ||
      m.description ||
      `你是 ${m.role}。`;

    return {
      role: m.role,
      goal,
      backstory,
      tools: []
    };
  });

  const steps: any[] = Array.isArray(data.workflow?.steps) ? data.workflow.steps : [];

  const tasks = steps.length > 0
    ? steps.map((step, idx) => {
        const agentRole =
          (agents.find((a) => a.role === step.agent)?.role) ||
          (idx === 0 ? agents[0]?.role : agents[idx - 1]?.role) ||
          agents[0]?.role ||
          'Agent';
        return {
          description: step.name
            ? `[${step.name}] ${step.description || ''}`.trim()
            : step.description || `Step ${idx + 1}`,
          expected_output: step.expectedOutput || 'structured output',
          agent: agentRole
        };
      })
    : [
        {
          description: `执行 ${data.name || '团队任务'}`,
          expected_output: 'structured output',
          agent: agents[0]?.role || 'Agent'
        }
      ];

  const process =
    data.workflow?.routing || data.workflow?.coordinator
      ? 'hierarchical'
      : 'sequential';

  return {
    crew: {
      name: data.name || 'NvwaX Team',
      description: data.description || '',
      process,
      agents,
      tasks,
      metadata: {
        source: 'nvwax',
        version: data.version || '1.0.0',
        tags: data.tags || [],
        category: data.category || null,
        consumer_hint:
          'pip install crewai && crewai run team.yaml  (https://docs.crewai.com/)'
      }
    }
  };
}

/**
 * 转换为 LangGraph JSON 格式
 */
export function convertToLangGraphJson(data: NormalizedTeamData): any {
  const nodes = data.members.map((m, idx) => {
    const id = (m.role || `agent_${idx + 1}`)
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || `agent_${idx + 1}`;
    return {
      id,
      type: 'agent',
      config: {
        role: m.role,
        system_prompt:
          (m.config && (m.config.systemPrompt || m.config.backstory)) ||
          m.description ||
          `你是 ${m.role}。`,
        responsibilities: m.responsibilities || []
      }
    };
  });

  const steps: any[] = Array.isArray(data.workflow?.steps) ? data.workflow.steps : [];
  let edges: Array<{ from: string; to: string; type: string }> = [];

  if (steps.length > 0) {
    edges = steps
      .map((step, idx) => {
        const fromName =
          step.from ||
          (idx === 0 ? nodes[0]?.id : nodes[idx - 1]?.id) ||
          nodes[0]?.id;
        const toName =
          step.to ||
          step.agent ||
          (nodes[idx]?.id) ||
          nodes[nodes.length - 1]?.id;
        const resolveId = (name: string) => {
          if (!name) return null;
          const lower = String(name).toLowerCase().replace(/[^a-z0-9_]/g, '_');
          return (
            nodes.find((n) => n.id === lower)?.id ||
            nodes.find((n) => n.config.role === name)?.id ||
            lower
          );
        };
        const from = resolveId(fromName);
        const to = resolveId(toName);
        if (!from || !to || from === to) return null;
        return { from, to, type: step.type || 'handoff' };
      })
      .filter((e): e is { from: string; to: string; type: string } => e !== null);
  }

  if (edges.length === 0 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({ from: nodes[i].id, to: nodes[i + 1].id, type: 'sequential' });
    }
  }

  return {
    version: '0.1',
    schema: 'langgraph-state-graph/v1',
    graph: {
      entry_point: nodes[0]?.id || 'start',
      nodes,
      edges,
      finish_points: nodes.length > 0 ? [nodes[nodes.length - 1].id] : []
    },
    metadata: {
      source: 'nvwax',
      team_name: data.name || 'NvwaX Team',
      description: data.description || '',
      version: data.version || '1.0.0',
      tags: data.tags || [],
      category: data.category || null,
      consumer_hint:
        'LangGraph has no config-driven CLI. See docs: https://langchain-ai.github.io/langgraph/'
    }
  };
}

/**
 * 生成文件内容 + 扩展名
 *
 * 兼容两种输入：
 * 1. 归一化团队数据（NormalizedTeamData）—— 内部自动调用对应转换器
 * 2. 已转换对象（如 { crew: {...} } / { graph: {...} }）—— 直接序列化
 */
export function serializeTeamExport(
  data: NormalizedTeamData | any,
  format: TeamExportFormat
): { content: string; extension: string } {
  const looksConverted =
    data &&
    typeof data === 'object' &&
    (data.crew || data.graph || data.schema);

  const payload = looksConverted
    ? data
    : format === 'proclaw'
    ? convertToProClawFormat(data)
    : format === 'crewai'
    ? convertToCrewAIYaml(data)
    : format === 'langgraph'
    ? convertToLangGraphJson(data)
    : data;

  switch (format) {
    case 'json':
      return { content: JSON.stringify(payload, null, 2), extension: 'json' };
    case 'yaml':
      return { content: yaml.dump(payload, { indent: 2 }), extension: 'yaml' };
    case 'proclaw':
      return {
        content: JSON.stringify(payload, null, 2),
        extension: 'proclaw.json'
      };
    case 'crewai':
      return {
        content: yaml.dump(payload, {
          indent: 2,
          lineWidth: 120,
          noRefs: true
        }),
        extension: 'yaml'
      };
    case 'langgraph':
      return {
        content: JSON.stringify(payload, null, 2),
        extension: 'json'
      };
    default: {
      const exhaustive: never = format;
      throw new Error(`Unsupported format: ${String(exhaustive)}`);
    }
  }
}

/**
 * 生成建议文件名（不含扩展名）
 */
export function suggestTeamFilename(teamName: string, format: TeamExportFormat): string {
  const safe = teamName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff\-_.]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'ai-team';

  const extMap: Record<TeamExportFormat, string> = {
    json: 'json',
    yaml: 'yaml',
    proclaw: 'proclaw-team.json',
    crewai: 'crewai.yaml',
    langgraph: 'langgraph.json'
  };

  return `${safe}.${extMap[format]}`;
}