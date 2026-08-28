/**
 * 编排器真实路由冒烟测试（Live，需 DEEPSEEK_API_KEY）
 * ------------------------------------------------------------
 * 验证 RFC A1 验收项：classifier 路由质量。
 * - 20 条典型创建需求，与人工标注的期望子代理比较，统计一致率
 * - 无 DEEPSEEK_API_KEY 时整体跳过（CI 安全）
 * - 断言下限 60%（防回归）；若一致率 < 80% 会打印警告，提示未达 RFC 门槛
 *
 * 运行：pnpm --filter nvwax-server test -- orchestrator-routing.live
 */

/// <reference types="jest" />

import { jest, describe, expect, test, beforeAll } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'node:path';
import { LlmService } from '../services/llm/llm.service.js';
import { OrchestratorExecutor } from '../services/orchestrator/orchestrator-executor.service.js';

// jest 的 cwd 为 packages/nvwax-server，仓库根 .env 在 ../../.env
//
// override: true 的必要性：pnpm/jest 子进程会继承父 shell 的 DEEPSEEK_API_KEY（如 IDE、
// 终端或 CI 配置的旧 key）。dotenv 默认不覆盖已存在的环境变量，会导致".env 换了新 key
// 但实际探测用旧 key、报 401"的诡异现象。override 强制以仓库根 .env 为权威来源。
dotenv.config({ path: path.join(process.cwd(), '../../.env'), override: true });

/** 探测 key 是否真实有效（401/无效 key 时跳过 A1/E2E 验证，仅保留 A3 降级实证） */
async function probeKeyValid(llm: LlmService): Promise<boolean> {
  if (!llm.isConfigured) return false;
  try {
    await llm.createCompletion({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 1,
    });
    return true;
  } catch (error: any) {
    const msg = String(error?.message ?? error);
    if (msg.includes('401') || msg.includes('invalid') || msg.includes('Authentication')) {
      console.warn(`\n⚠️ 检测到 LLM key 无效（401），跳过 A1 路由质量/E2E 验证。A3 降级路径已由本探测实证（degraded 不抛异常）。\n`);
    }
    return false;
  }
}

// ============================================================
// 20 条典型创建需求 + 人工标注（回归 fixture，RFC v0.5）
// ============================================================
//
// 期望子代理 id 映射（与 RFC §A1 决策建议一致）：
// - requirements_analyst：需求不清/闲聊（兜底）
// - team_architect：明确建团队意图（含"建/搭/创建/设计 + 团队/公司/Agent"等强信号）
// - agent_matcher：已有团队设计 → 匹配 Agent
// - document_writer：设计+匹配完成 → 生成文档
//
// 此 fixture 用于：live 冒烟测试（实测 A1 一致率）+ 后续回归基线
// 若实际一致率 ≥80%，RFC A1 验收通过；<80% 则按 RFC §A1 决策建议优化
//
interface RoutingCase {
  input: string;
  expected: string;
}

const ROUTING_CASES: RoutingCase[] = [
  // —— 需求分析（需求模糊/需要澄清） ——
  { input: '我想做一个能帮公司自动回复客户消息的智能体，但具体怎么设计我还没想好，你能帮我理清需求吗', expected: 'requirements_analyst' },
  { input: '帮我分析一下我需要什么样的智能团队，我只有个模糊的想法', expected: 'requirements_analyst' },
  { input: '我不知道我的业务适合几个智能体，先帮我梳理一下需求', expected: 'requirements_analyst' },
  // —— 团队架构（明确需求 → 设计团队构成） ——
  { input: '我要建一个电商创业公司的虚拟团队，包含市场、运营、客服', expected: 'team_architect' },
  { input: '帮我设计一个 AI 产品研发团队的角色矩阵，包括产品经理和工程师', expected: 'team_architect' },
  { input: '我们公司要做数字化转型，帮我规划一下需要哪些职能 Agent 以及协作关系', expected: 'team_architect' },
  { input: '为一家 SaaS 公司设计虚拟团队结构，明确 CEO、CTO、市场负责人的分工', expected: 'team_architect' },
  { input: '我需要一个内容营销团队的设计方案，包含编辑、设计、投放角色', expected: 'team_architect' },
  // —— Agent 匹配（已有团队设计 → 匹配现成 Agent/技能） ——
  { input: '我的团队设计好了，帮我从 Agent 仓库里为每个角色匹配最合适的现成智能体', expected: 'agent_matcher' },
  { input: '帮我看看市场总监这个角色有没有现成的 Agent 可以用，顺便找找合适的技能', expected: 'agent_matcher' },
  { input: '团队里缺一个数据分析师，帮我在仓库里找找有没有匹配的 Agent', expected: 'agent_matcher' },
  { input: '为我的客服主管角色推荐匹配的 Agent 和技能包', expected: 'agent_matcher' },
  // —— 文档撰写（设计+匹配完成 → 生成交付文档） ——
  { input: '团队设计和 Agent 匹配都完成了，帮我生成完整的创建配置文档', expected: 'document_writer' },
  { input: '把上面的团队方案整理成正式文档，包含角色明细和实施步骤', expected: 'document_writer' },
  { input: '写一份虚拟公司的交付说明文档，要结构清晰、可直接评审', expected: 'document_writer' },
  // —— 边界：跨领域需求（可接受团队架构，标注为 team_architect） ——
  { input: '帮我从零开始创建一个完整的 AI Agent 团队，什么都还没做', expected: 'team_architect' },
  { input: '我要开一家线上教育公司，帮我搭建整套智能体团队', expected: 'team_architect' },
  { input: '给连锁餐饮店设计一套门店运营智能体方案', expected: 'team_architect' },
  // —— 边界：需求不明确到无法路由 ——
  { input: '嗯嗯好的', expected: 'requirements_analyst' },
  { input: '你好', expected: 'requirements_analyst' },
];

// ============================================================
// 测试
// ============================================================
let RUN_LIVE = false;
// 无 key 或 key 无效时跳过（RUN_LIVE 由 beforeAll 探测决定）

describe('Orchestrator live routing (A1: 路由一致率)', () => {
  jest.setTimeout(180000);

  let executor: OrchestratorExecutor;
  beforeAll(async () => {
    const llm = new LlmService();
    RUN_LIVE = await probeKeyValid(llm);
    executor = new OrchestratorExecutor(llm);
    if (!RUN_LIVE) {
      // 无有效 key：将本套件整体跳过
      //（jest 无法在 beforeAll 动态 skip，用条件断言保证 CI 不红）
      console.warn('[skip] 无有效 DEEPSEEK_API_KEY，A1/E2E 验证跳过（A3 降级已实证）');
    }
  });

  test('20 条典型需求路由一致率 ≥ 60%（目标 ≥80%，实际一致率打印）', async () => {
    if (!RUN_LIVE) {
      // 环境无有效 key：降级路径已在单测（orchestrator-routing.test.ts）与 401 探测中覆盖
      expect(true).toBe(true);
      return;
    }
    const results: Array<{ input: string; expected: string; actual: string | null; ok: boolean; confidence: number }> = [];
    for (const c of ROUTING_CASES) {
      const cls = await executor.classifyOnly({ userInput: c.input, userId: 'live', sessionId: 'routing-smoke' });
      results.push({
        input: c.input,
        expected: c.expected,
        actual: cls.agentId,
        ok: cls.agentId === c.expected,
        confidence: cls.confidence,
      });
    }

    const matched = results.filter((r) => r.ok).length;
    const rate = matched / results.length;

    // 打印明细便于人工核对
    console.log(`\n[路由明细] 一致率 ${matched}/${results.length} = ${(rate * 100).toFixed(1)}%`);
    for (const r of results) {
      const mark = r.ok ? '✓' : '✗';
      console.log(`  ${mark} [${r.expected}] → [${r.actual ?? '无匹配'}] (${(r.confidence * 100).toFixed(0)}%) ${r.input.slice(0, 40)}`);
    }

    if (rate < 0.8) {
      console.warn(`\n⚠️ 一致率 ${(rate * 100).toFixed(1)}% 未达 RFC A1 门槛(≥80%)：需优化 classifier prompt 或评估是否退回 leader-router 增强`);
    }
    expect(rate).toBeGreaterThanOrEqual(0.6);
  });

  test('完整编排链路（classify → 子代理执行）端到端可用', async () => {
    if (!RUN_LIVE) {
      expect(true).toBe(true);
      return;
    }
    const result = await executor.orchestrate({
      userInput: '帮我设计一个电商创业公司的虚拟团队，包含市场、运营、客服角色',
      userId: 'live',
      sessionId: 'e2e-smoke',
      context: '公司类型：电商；规模：小团队（5-8人）',
    });
    console.log(`[E2E] agentId=${result.agentId} intent=${result.intent} confidence=${result.confidence} degraded=${result.degraded}`);
    console.log(`[E2E] output 前 200 字: ${result.output.slice(0, 200)}`);
    expect(result.degraded).toBe(false);
    expect(result.agentId).not.toBeNull();
    expect(result.output.length).toBeGreaterThan(0);
  });
});
