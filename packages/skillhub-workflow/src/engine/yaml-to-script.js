/**
 * yaml-to-script.js — 把 YAML 工作流定义翻译为编排脚本
 * ------------------------------------------------------------
 * YamlWorkflowDefinition（nodes + edges/depends_on）→ 一段可在
 * workflow-engine 中执行的 JS 编排脚本：
 *   - 按依赖做拓扑分层；同层节点用 parallel 并发，层间顺序推进（phase 标记）；
 *   - `{{node.field}}` / `{{args.x}}` 模板在运行时基于 results/args 解析；
 *   - agent 节点 → agent()（persona 取 YAML agent 的 system_prompt）；
 *   - llm 节点 → agent()（通用助手 persona）；
 *   - human_approval 节点照常执行，但记录日志提示（人工审批在 worker 内无法阻塞）。
 */

// ============================================================
// 拓扑分层
// ============================================================

/** 返回节点 id 的层级数组（每层为一个数组），依赖先满足者靠前 */
export function topologicalLayers(nodes, edges = []) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const deps = new Map(nodes.map((n) => [n.id, new Set()]));
  const dependents = new Map(nodes.map((n) => [n.id, new Set()]));

  for (const edge of edges) {
    if (byId.has(edge.from) && byId.has(edge.to)) {
      deps.get(edge.to).add(edge.from);
      dependents.get(edge.from).add(edge.to);
    }
  }
  // 也支持 nodes 自带的 depends_on
  for (const node of nodes) {
    for (const dep of node.depends_on || []) {
      if (byId.has(dep)) {
        deps.get(node.id).add(dep);
        dependents.get(dep).add(node.id);
      }
    }
  }

  const layers = [];
  const remaining = new Set(nodes.map((n) => n.id));
  while (remaining.size > 0) {
    const ready = [...remaining].filter((id) => {
      for (const d of deps.get(id)) if (remaining.has(d)) return false;
      return true;
    });
    if (ready.length === 0) {
      // 环：把剩余节点全部放入最后一层（保留执行，避免死循环）
      layers.push([...remaining]);
      break;
    }
    layers.push(ready);
    for (const id of ready) remaining.delete(id);
  }
  return layers;
}

// ============================================================
// 脚本生成
// ============================================================

function esc(value) {
  return JSON.stringify(String(value ?? ''));
}

function buildNodeCall(node, agentDefs, indent) {
  const pad = ' '.repeat(indent);
  const agentDef = node.agent ? agentDefs.get(node.agent) : undefined;
  const persona = agentDef?.agent?.system_prompt
    ? esc(agentDef.agent.system_prompt)
    : esc(`You are ${node.agent || 'an AI assistant'}, working on a delegated workflow task.`);

  // 提示词：优先 params.prompt（模板化）；若节点声明了 input，把解析后的输入追加为上下文
  // （兼容 YAML 中 prompt 无占位符但 input 指向上游输出的写法，如 review 节点）
  let promptExpr;
  if (node.params?.prompt) {
    promptExpr = node.input
      ? `tpl(${esc(node.params.prompt)} + '\\n\\n输入上下文：' + ${esc(node.input)})`
      : `tpl(${esc(node.params.prompt)})`;
  } else if (node.input) {
    promptExpr = `tpl(${esc(`请完成以下任务：${node.input}`)})`;
  } else {
    promptExpr = `tpl(${esc('请完成以下任务：' + (node.agent || node.type || 'untitled'))})`;
  }

  const optsParts = [
    `label: ${esc(node.id)}`,
    `persona: ${persona}`,
  ];
  if (node.params?.temperature !== undefined) optsParts.push(`temperature: ${Number(node.params.temperature)}`);
  if (node.params?.model !== undefined) optsParts.push(`model: ${esc(node.params.model)}`);

  const humanNote = node.human_approval
    ? `${pad}// human_approval: 节点 ${node.id} 需要人工审批，当前在 worker 内不阻塞，仅记录\n`
    : '';

  return (
    `${humanNote}${pad}results[${esc(node.id)}] = await agent(${promptExpr}, { ${optsParts.join(', ')} });`
  );
}

/**
 * 生成编排脚本源码。
 * @param {object} definition YamlWorkflowDefinition
 * @param {Map<string, object>} agentDefs agent id → YamlAgentDefinition（可选）
 * @returns {string} 脚本源码
 */
export function yamlWorkflowToScript(definition, agentDefs = new Map()) {
  const { workflow } = definition;
  const layers = topologicalLayers(workflow.nodes, workflow.edges || []);
  const lines = [
    `// Generated from YAML workflow: ${workflow.id} (${workflow.name})`,
    `const ctx = { ...(args || {}) };`,
    `const results = {};`,
    `const tpl = (s) => String(s ?? '').replace(/\\{\\{\\s*([\\w.]+)\\s*\\}\\}/g, (_, p) => {`,
    `  const parts = p.split('.');`,
    `  // 裸键（非 args. 前缀且非节点结果）→ 回退到工作流输入 args`,
    `  const root = (parts[0] === 'args' || !(parts[0] in results)) ? ctx : results;`,
    `  let v = root;`,
    `  const start = parts[0] === 'args' ? 1 : 0;`,
    `  for (let i = start; i < parts.length; i++) {`,
    `    v = v?.[parts[i]];`,
    `    if (v === undefined) return '';`,
    `    // 字符串/标量结果直接返回（兼容 {{node.output}} 引用字符串结果的 YAML 写法）`,
    `    if (typeof v !== 'object' || v === null) return String(v);`,
    `  }`,
    `  return JSON.stringify(v);`,
    `});`,
    ``,
  ];

  for (const layer of layers) {
    const layerId = layer.join(', ');
    lines.push(`phase(${esc(layerId)});`);
    if (layer.length === 1) {
      const node = workflow.nodes.find((n) => n.id === layer[0]);
      lines.push(buildNodeCall(node, agentDefs, 0));
      lines.push('');
    } else {
      lines.push(`await parallel([`);
      for (const id of layer) {
        const node = workflow.nodes.find((n) => n.id === id);
        lines.push(`  async () => {`);
        lines.push(buildNodeCall(node, agentDefs, 4));
        lines.push(`  },`);
      }
      lines.push(`]);`);
      lines.push('');
    }
  }

  lines.push(`return results;`);
  return lines.join('\n');
}
