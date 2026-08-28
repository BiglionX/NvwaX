/**
 * BlueprintValidator 单元测试
 * ------------------------------------------------------------
 * 覆盖 Draft→Deploy 门禁的 5 类校验规则：
 * root 字段 / subagent 必填 / 无环 / 深度≤4 / 工具名冲突
 */

/// <reference types="jest" />

import {
  validateBlueprint,
  MAX_BLUEPRINT_DEPTH,
  type BlueprintConfig,
} from '../services/blueprint/blueprint-validator.service.js';

function validConfig(): BlueprintConfig {
  return {
    root: { id: 'ceo', name: 'CEO 主代理', systemPrompt: '你是 CEO', model: 'deepseek-v4-flash', temperature: 0.7 },
    subagents: [
      { id: 'team_architect', name: '团队架构师', systemPrompt: '设计团队', parentId: 'ceo' },
      { id: 'agent_matcher', name: 'Agent 匹配', systemPrompt: '匹配 Agent', parentId: 'team_architect' },
    ],
    skills: [{ agentId: 'ceo', skillId: 'skill-1', skillName: '通用协作' }],
    tools: [{ agentId: 'ceo', toolName: 'web_search' }],
  };
}

describe('BlueprintValidator', () => {
  test('合法蓝图 → valid', () => {
    const r = validateBlueprint(validConfig());
    expect(r.valid).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  test('缺 root → 不可部署', () => {
    const cfg = validConfig();
    delete (cfg as any).root;
    const r = validateBlueprint(cfg);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.path === 'root' && i.severity === 'error')).toBe(true);
  });

  test('root 缺 model / systemPrompt → error', () => {
    const cfg = validConfig();
    cfg.root = { id: 'ceo', name: 'CEO' }; // 缺 systemPrompt + model
    const r = validateBlueprint(cfg);
    expect(r.valid).toBe(false);
    const paths = r.issues.map((i) => i.path);
    expect(paths).toContain('root.systemPrompt');
    expect(paths).toContain('root.model');
  });

  test('subagent 缺 systemPrompt → error', () => {
    const cfg = validConfig();
    cfg.subagents![0].systemPrompt = '';
    const r = validateBlueprint(cfg);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.path === 'subagents[0].systemPrompt')).toBe(true);
  });

  test('悬挂 parentId（引用不存在的节点）→ error', () => {
    const cfg = validConfig();
    cfg.subagents![1].parentId = 'ghost';
    const r = validateBlueprint(cfg);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.path === 'subagents[1].parentId')).toBe(true);
  });

  test('环引用 → error', () => {
    const cfg = validConfig();
    cfg.subagents![0].parentId = 'agent_matcher'; // agent_matcher 的 parent 是 team_architect → 环
    const r = validateBlueprint(cfg);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.message.includes('环引用'))).toBe(true);
  });

  test(`深度超过 ${MAX_BLUEPRINT_DEPTH} → error`, () => {
    const cfg = validConfig();
    // 构造链：ceo → a → b → c → d → e（深度 5）
    cfg.subagents = [
      { id: 'a', name: 'A', systemPrompt: 'x', parentId: 'ceo' },
      { id: 'b', name: 'B', systemPrompt: 'x', parentId: 'a' },
      { id: 'c', name: 'C', systemPrompt: 'x', parentId: 'b' },
      { id: 'd', name: 'D', systemPrompt: 'x', parentId: 'c' },
      { id: 'e', name: 'E', systemPrompt: 'x', parentId: 'd' },
    ];
    const r = validateBlueprint(cfg);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.message.includes('深度'))).toBe(true);
  });

  test(`深度恰好 ${MAX_BLUEPRINT_DEPTH} → valid`, () => {
    const cfg = validConfig();
    cfg.subagents = [
      { id: 'a', name: 'A', systemPrompt: 'x', parentId: 'ceo' },
      { id: 'b', name: 'B', systemPrompt: 'x', parentId: 'a' },
      { id: 'c', name: 'C', systemPrompt: 'x', parentId: 'b' },
      { id: 'd', name: 'D', systemPrompt: 'x', parentId: 'c' },
    ];
    const r = validateBlueprint(cfg);
    expect(r.valid).toBe(true);
  });

  test('同一 agent 下工具名重复 → error', () => {
    const cfg = validConfig();
    cfg.tools = [
      { agentId: 'ceo', toolName: 'web_search' },
      { agentId: 'ceo', toolName: 'web_search' },
    ];
    const r = validateBlueprint(cfg);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.message.includes('工具名重复'))).toBe(true);
  });

  test('子代理名与自身工具名冲突 → error', () => {
    const cfg = validConfig();
    cfg.tools = [{ agentId: 'team_architect', toolName: '团队架构师' }];
    const r = validateBlueprint(cfg);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.message.includes('工具名冲突'))).toBe(true);
  });

  test('技能引用缺 skillId → error', () => {
    const cfg = validConfig();
    cfg.skills = [{ agentId: 'ceo', skillId: '' }];
    const r = validateBlueprint(cfg);
    expect(r.valid).toBe(false);
  });

  test('subagent id 与 root 冲突 → error', () => {
    const cfg = validConfig();
    cfg.subagents!.push({ id: 'ceo', name: '重复', systemPrompt: 'x', parentId: 'ceo' });
    const r = validateBlueprint(cfg);
    expect(r.valid).toBe(false);
    expect(r.issues.some((i) => i.message.includes('根 Agent 冲突'))).toBe(true);
  });
});
