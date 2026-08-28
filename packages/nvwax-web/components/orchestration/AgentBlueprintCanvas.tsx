'use client';

/**
 * AgentBlueprintCanvas — 创建结果蓝图画布（ReactFlow）
 * ------------------------------------------------------------
 * 借鉴 deshwalmahesh/open-agent-orchestrator 的"挂载面板 + Draft/Deploy"交互
 * （不引入其代码），自研 ReactFlow 画布。
 *
 * 能力：
 * 1. 展示 config 的树结构（root + subagents + 挂载的 skills/tools）
 * 2. 左侧挂载面板：Sub-Agents / Skills / Tools 三 Tab，点击加入
 * 3. 实时客户端校验（与服务端 BlueprintValidator 行为对齐）
 * 4. Draft → Deploy 门禁（seed 模式本地模拟；remote 模式调 API）
 *
 * 明确不做（RFC §7 风险）：
 * - 不做自由 DAG 编辑（拖拽连线）
 * - 不做节点拖动
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// React 19 + @xyflow/react v12 类型导出在 JSX 上有兼容问题（TS2786），
// 仓库已有 ThemeProvider 等文件同样问题（非 ReactFlow 独有），是 React 19 类型过渡期现象。
// 这里用 as any 局部断言，运行时行为不受影响。
const FlowBackground = Background as any;
const FlowControls = Controls as any;
const FlowHandle = Handle as any;

import {
  type BlueprintConfig,
  type BlueprintSubagent,
  type BlueprintSkillRef,
  type BlueprintToolRef,
  type BlueprintValidationResult,
  validateBlueprintClient,
} from '@/lib/api/blueprints';

// ============================================================
// Mock 库（seed 模式可挂载项）—— 后续可换成 API 拉取
// ============================================================

const SUBAGENT_TEMPLATES: Array<Pick<BlueprintSubagent, 'id' | 'name' | 'systemPrompt'>> = [
  { id: 'requirements_analyst', name: '需求分析员', systemPrompt: '解析用户需求，提炼目标/职责/验收标准。' },
  { id: 'team_architect', name: '团队架构师', systemPrompt: '设计虚拟公司的角色矩阵与协作关系。' },
  { id: 'agent_matcher', name: 'Agent 匹配专员', systemPrompt: '从 Agent 仓库为角色匹配现成 Agent/技能。' },
  { id: 'document_writer', name: '文档撰写员', systemPrompt: '整理创建结果为可交付配置文档。' },
];

const SKILL_LIBRARY = [
  { skillId: 'skill-web-search', skillName: '联网搜索' },
  { skillId: 'skill-code-review', skillName: '代码评审' },
  { skillId: 'skill-data-analysis', skillName: '数据分析' },
  { skillId: 'skill-translation', skillName: '多语翻译' },
];

const TOOL_LIBRARY = [
  'web_search',
  'calculator',
  'pdf_to_text',
  'python_sandbox',
  'ask_human',
];

// ============================================================
// 自定义节点（root / subagent / skill / tool 四种类型）
// ============================================================

type NodeKind = 'root' | 'subagent' | 'skill' | 'tool';

interface BaseNodeData {
  label: string;
  description?: string;
  kind: NodeKind;
  badge?: string;
}

const NODE_KIND_STYLE: Record<NodeKind, { bg: string; border: string; text: string }> = {
  root:     { bg: '#1e40af', border: '#1e3a8a', text: 'white' },
  subagent: { bg: '#7c3aed', border: '#5b21b6', text: 'white' },
  skill:    { bg: '#059669', border: '#047857', text: 'white' },
  tool:     { bg: '#ea580c', border: '#c2410c', text: 'white' },
};

function buildNode({ id, data, position }: { id: string; data: BaseNodeData; position: { x: number; y: number } }) {
  const style = NODE_KIND_STYLE[data.kind];
  return {
    id,
    type: 'agent',
    position,
    data: {
      ...data,
      _style: style,
    },
  };
}

function AgentNode({ data }: NodeProps) {
  const d = data as unknown as BaseNodeData & { _style: { bg: string; border: string; text: string } };
  return (
    <div
      style={{
        background: d._style.bg,
        border: `2px solid ${d._style.border}`,
        color: d._style.text,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 160,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      }}
    >
      <FlowHandle type="target" position={Position.Top} style={{ background: '#555' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, opacity: 0.8 }}>{d.badge}</span>
      </div>
      <div style={{ marginTop: 2 }}>{d.label}</div>
      {d.description ? (
        <div style={{ marginTop: 4, fontSize: 11, fontWeight: 400, opacity: 0.85 }}>
          {d.description}
        </div>
      ) : null}
      <FlowHandle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
}

const nodeTypes = { agent: AgentNode };

// ============================================================
// 画布组件
// ============================================================

export interface AgentBlueprintCanvasProps {
  initialConfig?: BlueprintConfig;
  /**
   * 'seed'：本地状态管理（无 API 依赖，便于演示/Storybook）
   * 'remote'：通过 onChange 与 onDeploy 回调外接 API
   */
  mode?: 'seed' | 'remote';
  onChange?: (config: BlueprintConfig, validation: BlueprintValidationResult) => void;
  onDeploy?: (config: BlueprintConfig) => Promise<{ success: boolean; validation: BlueprintValidationResult }> | { success: boolean; validation: BlueprintValidationResult };
  defaultAgentId?: string;
}

const INITIAL_CONFIG: BlueprintConfig = {
  root: {
    id: 'ceo',
    name: 'CEO 主代理',
    systemPrompt: '你是 NvwaX 虚拟公司的 CEO Agent，负责协调团队完成用户任务。',
    model: 'deepseek-v4-flash',
    temperature: 0.7,
  },
  subagents: [
    {
      id: 'team_architect',
      name: '团队架构师',
      systemPrompt: '根据需求设计虚拟公司的角色矩阵与协作关系。',
      parentId: 'ceo',
    },
  ],
  skills: [],
  tools: [],
};

export default function AgentBlueprintCanvas(props: AgentBlueprintCanvasProps) {
  const { mode = 'seed', onChange, onDeploy, defaultAgentId } = props;
  const [config, setConfig] = useState<BlueprintConfig>(props.initialConfig ?? INITIAL_CONFIG);
  const [status, setStatus] = useState<'draft' | 'deployed'>('draft');
  const [activeTab, setActiveTab] = useState<'subagents' | 'skills' | 'tools'>('subagents');

  const validation = useMemo(() => validateBlueprintClient(config), [config]);
  const emit = useCallback(
    (next: BlueprintConfig) => {
      const v = validateBlueprintClient(next);
      onChange?.(next, v);
    },
    [onChange]
  );

  // ------------ 转换 config → ReactFlow nodes/edges ------------
  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];
    if (!config.root) return { nodes: ns, edges: es };

    // 根节点居中
    ns.push(
      buildNode({
        id: config.root.id,
        data: { kind: 'root', label: config.root.name, badge: 'CEO', description: config.root.model },
        position: { x: 320, y: 40 },
      })
    );

    // 子代理：按 parentId 分层（depth 0 = root；depth 1 = root children；...）
    const subagents = config.subagents ?? [];
    const childrenByParent = new Map<string, BlueprintSubagent[]>();
    for (const s of subagents) {
      if (!s.parentId) continue;
      const arr = childrenByParent.get(s.parentId) ?? [];
      arr.push(s);
      childrenByParent.set(s.parentId, arr);
    }

    // BFS 按层铺开
    const HORIZONTAL_GAP = 220;
    const VERTICAL_GAP = 130;
    const depthNodes = new Map<number, string[]>(); // depth → node ids
    const nodeDepth = new Map<string, number>();
    nodeDepth.set(config.root.id, 0);
    const queue: Array<{ id: string; depth: number }> = [{ id: config.root.id, depth: 0 }];
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      const kids = childrenByParent.get(id) ?? [];
      kids.forEach((k, idx) => {
        if (k.id) {
          nodeDepth.set(k.id, depth + 1);
          queue.push({ id: k.id, depth: depth + 1 });
        }
      });
    }

    // 按 depth 摆放
    const byDepth = new Map<number, BlueprintSubagent[]>();
    for (const s of subagents) {
      const d: number = (s.id ? nodeDepth.get(s.id) : undefined) ?? 1;
      const arr = byDepth.get(d) ?? [];
      arr.push(s);
      byDepth.set(d, arr);
    }
    for (const [d, items] of byDepth.entries()) {
      const totalWidth = items.length * HORIZONTAL_GAP;
      const startX = Math.max(40, 400 - totalWidth / 2);
      items.forEach((s, idx) => {
        if (!s.id) return;
        ns.push(
          buildNode({
            id: s.id,
            data: { kind: 'subagent', label: s.name, badge: `深度 ${d}`, description: s.parentId ? `→ ${s.parentId}` : '孤儿' },
            position: { x: startX + idx * HORIZONTAL_GAP, y: 40 + d * VERTICAL_GAP },
          })
        );
        if (s.parentId) {
          es.push({ id: `${s.parentId}->${s.id}`, source: s.parentId, target: s.id, animated: false });
        }
      });
    }

    // 技能 / 工具：作为 root 右侧附加节点
    let offsetX = 600;
    for (const sk of config.skills ?? []) {
      const nid = `skill-${sk.skillId}-${sk.agentId}`;
      ns.push(
        buildNode({
          id: nid,
          data: { kind: 'skill', label: sk.skillName ?? sk.skillId, badge: 'SKILL', description: `挂载到 ${sk.agentId}` },
          position: { x: offsetX, y: 40 },
        })
      );
      es.push({ id: `${sk.agentId}->${nid}`, source: sk.agentId, target: nid, style: { stroke: '#059669' } });
      offsetX += HORIZONTAL_GAP;
    }
    offsetX = 600;
    for (const t of config.tools ?? []) {
      const nid = `tool-${t.toolName}-${t.agentId}`;
      ns.push(
        buildNode({
          id: nid,
          data: { kind: 'tool', label: t.toolName, badge: 'TOOL', description: `挂载到 ${t.agentId}` },
          position: { x: offsetX, y: 180 },
        })
      );
      es.push({ id: `${t.agentId}->${nid}`, source: t.agentId, target: nid, style: { stroke: '#ea580c' } });
      offsetX += HORIZONTAL_GAP;
    }

    return { nodes: ns, edges: es };
  }, [config]);

  // ------------ 操作：添加子代理 / 技能 / 工具 ------------
  const addSubagent = (tpl: (typeof SUBAGENT_TEMPLATES)[number]) => {
    if (!config.root) return;
    if (config.subagents?.some((s) => s.id === tpl.id)) return; // 防重复
    const next: BlueprintConfig = {
      ...config,
      subagents: [...(config.subagents ?? []), { ...tpl, parentId: config.root.id }],
    };
    setConfig(next);
    setStatus('draft');
    emit(next);
  };

  const addSkill = (s: (typeof SKILL_LIBRARY)[number]) => {
    if (!config.root) return;
    if (config.skills?.some((x) => x.skillId === s.skillId && x.agentId === config.root!.id)) return;
    const next: BlueprintConfig = {
      ...config,
      skills: [...(config.skills ?? []), { agentId: config.root.id, skillId: s.skillId, skillName: s.skillName } as BlueprintSkillRef],
    };
    setConfig(next);
    emit(next);
  };

  const addTool = (toolName: string) => {
    if (!config.root) return;
    if (config.tools?.some((x) => x.toolName === toolName && x.agentId === config.root!.id)) return;
    const next: BlueprintConfig = {
      ...config,
      tools: [...(config.tools ?? []), { agentId: config.root.id, toolName } as BlueprintToolRef],
    };
    setConfig(next);
    emit(next);
  };

  const removeSubagent = (id: string) => {
    const next: BlueprintConfig = {
      ...config,
      subagents: (config.subagents ?? []).filter((s) => s.id !== id),
    };
    setConfig(next);
    emit(next);
  };

  const removeSkill = (skillId: string, agentId: string) => {
    const next: BlueprintConfig = {
      ...config,
      skills: (config.skills ?? []).filter((s) => !(s.skillId === skillId && s.agentId === agentId)),
    };
    setConfig(next);
    emit(next);
  };

  const removeTool = (toolName: string, agentId: string) => {
    const next: BlueprintConfig = {
      ...config,
      tools: (config.tools ?? []).filter((t) => !(t.toolName === toolName && t.agentId === agentId)),
    };
    setConfig(next);
    emit(next);
  };

  const handleDeploy = async () => {
    if (!validation.valid) return;
    if (mode === 'remote' && onDeploy) {
      const r = await onDeploy(config);
      if (r.success) setStatus('deployed');
    } else {
      // seed 模式：本地模拟部署
      setStatus('deployed');
    }
  };

  const errorIssues = validation.issues.filter((i) => i.severity === 'error');

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 260px', gap: 12, height: 'calc(100vh - 160px)', minHeight: 540 }}>
      {/* 左侧挂载面板 */}
      <aside role="complementary" aria-label="挂载面板" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, overflow: 'auto' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#334155' }}>挂载面板</h3>
        <div role="tablist" style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {(['subagents', 'skills', 'tools'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={activeTab === t}
              onClick={() => setActiveTab(t)}
              style={{
                flex: 1,
                padding: '4px 0',
                fontSize: 12,
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                background: activeTab === t ? '#1e40af' : 'white',
                color: activeTab === t ? 'white' : '#334155',
                cursor: 'pointer',
              }}
            >
              {t === 'subagents' ? 'Sub-Agents' : t === 'skills' ? 'Skills' : 'Tools'}
            </button>
          ))}
        </div>

        {activeTab === 'subagents' && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {SUBAGENT_TEMPLATES.map((tpl) => {
              const used = config.subagents?.some((s) => s.id === tpl.id);
              return (
                <li key={tpl.id} style={{ marginBottom: 6 }}>
                  <button
                    onClick={() => addSubagent(tpl)}
                    disabled={used}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: 12,
                      background: used ? '#e2e8f0' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      cursor: used ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{tpl.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{used ? '已挂载' : '点击挂载到 root'}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {activeTab === 'skills' && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {SKILL_LIBRARY.map((s) => {
              const used = config.skills?.some((x) => x.skillId === s.skillId && x.agentId === config.root?.id);
              return (
                <li key={s.skillId} style={{ marginBottom: 6 }}>
                  <button
                    onClick={() => addSkill(s)}
                    disabled={used}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: 12,
                      background: used ? '#e2e8f0' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      cursor: used ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {s.skillName} {used ? '✓' : '+'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {activeTab === 'tools' && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {TOOL_LIBRARY.map((t) => {
              const used = config.tools?.some((x) => x.toolName === t && x.agentId === config.root?.id);
              return (
                <li key={t} style={{ marginBottom: 6 }}>
                  <button
                    onClick={() => addTool(t)}
                    disabled={used}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: 12,
                      background: used ? '#e2e8f0' : 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: 4,
                      cursor: used ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {t} {used ? '✓' : '+'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* 中间画布 */}
      <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, position: 'relative' }}>
        {/* 顶部状态栏 */}
        <div style={{ position: 'absolute', top: 8, left: 8, right: 8, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center', padding: '6px 10px', background: '#f1f5f9', borderRadius: 6 }}>
          <span
            style={{
              padding: '2px 8px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 4,
              background: status === 'deployed' ? '#059669' : '#94a3b8',
              color: 'white',
            }}
          >
            {status === 'deployed' ? 'DEPLOYED' : 'DRAFT'}
          </span>
          <span style={{ fontSize: 12, color: errorIssues.length === 0 ? '#059669' : '#dc2626' }}>
            {errorIssues.length === 0 ? '✓ 校验通过' : `⚠ ${errorIssues.length} 个错误`}
          </span>
          {defaultAgentId ? <span style={{ fontSize: 11, color: '#64748b' }}>agentId={defaultAgentId}</span> : null}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => {
              setConfig(INITIAL_CONFIG);
              setStatus('draft');
            }}
            style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', background: 'white' }}
          >
            重置
          </button>
          <button
            onClick={handleDeploy}
            disabled={!validation.valid}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              borderRadius: 4,
              cursor: validation.valid ? 'pointer' : 'not-allowed',
              background: validation.valid ? '#1e40af' : '#cbd5e1',
              color: 'white',
            }}
          >
            {mode === 'remote' ? 'Deploy 部署' : 'Deploy（本地模拟）'}
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          style={{ paddingTop: 48 }}
        >
          <FlowBackground gap={16} />
          <FlowControls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </section>

      {/* 右侧校验 + 列表 */}
      <aside style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, overflow: 'auto' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#334155' }}>已挂载项</h3>
        <div style={{ fontSize: 12, marginBottom: 8 }}>
          <div style={{ fontWeight: 600, color: '#7c3aed' }}>子代理（{config.subagents?.length ?? 0}）</div>
          {(config.subagents ?? []).map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 11 }}>
              <span>{s.name}</span>
              <button onClick={() => s.id && removeSubagent(s.id)} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, marginBottom: 8 }}>
          <div style={{ fontWeight: 600, color: '#059669' }}>技能（{config.skills?.length ?? 0}）</div>
          {(config.skills ?? []).map((s) => (
            <div key={`${s.skillId}-${s.agentId}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 11 }}>
              <span>{s.skillName ?? s.skillId}</span>
              <button onClick={() => removeSkill(s.skillId, s.agentId)} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, marginBottom: 8 }}>
          <div style={{ fontWeight: 600, color: '#ea580c' }}>工具（{config.tools?.length ?? 0}）</div>
          {(config.tools ?? []).map((t) => (
            <div key={`${t.toolName}-${t.agentId}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 11 }}>
              <span>{t.toolName}</span>
              <button onClick={() => removeTool(t.toolName, t.agentId)} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>

        <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />
        <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#334155' }}>校验问题</h3>
        {validation.issues.length === 0 ? (
          <div style={{ fontSize: 12, color: '#059669' }}>✓ 全部通过，可部署</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {validation.issues.map((i, idx) => (
              <li key={idx} style={{ fontSize: 11, padding: '3px 0', color: i.severity === 'error' ? '#dc2626' : '#92400e' }}>
                <code style={{ background: '#f1f5f9', padding: '0 4px', borderRadius: 2 }}>{i.path}</code>: {i.message}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
