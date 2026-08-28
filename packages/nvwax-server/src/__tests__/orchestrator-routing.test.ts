/**
 * 编排器单元测试（mock LLM，不依赖真实 API）
 * ------------------------------------------------------------
 * 覆盖：
 * 1. DeepSeekClassifier：JSON 解析 / 阈值 / 降级 / 未注册 agentId
 * 2. OrchestratorExecutor：禁用降级 / 未命中降级 / 完整链路（真实 AgentSquad + mock LLM）
 * 3. intentFor 意图映射
 *
 * 完整链路测试使用真实 agent-squad 编排内核 + mock LlmService，
 * 验证框架集成正确性（A3 验收项：链路可跑、可降级）。
 */

/// <reference types="jest" />

import { jest, describe, expect, test } from '@jest/globals';
import {
  DeepSeekClassifier,
} from '../services/orchestrator/deepseek-classifier.service.js';
import {
  OrchestratorExecutor,
  userMessage,
} from '../services/orchestrator/orchestrator-executor.service.js';
import { buildCreationOrchestrator } from '../services/orchestrator/orchestrator-factory.service.js';
import {
  resolveOrchestratorEnvConfig,
  type OrchestratorEnvConfig,
} from '../services/orchestrator/types.js';
import type { LlmService } from '../services/llm/llm.service.js';

function makeMockLlm(impl: (req: any) => Promise<{ content: string }>): LlmService {
  const fn = jest.fn(impl);
  return { isConfigured: true, createCompletion: fn } as unknown as LlmService;
}

function envConfig(overrides: Partial<OrchestratorEnvConfig> = {}): OrchestratorEnvConfig {
  return { ...resolveOrchestratorEnvConfig({}), ...overrides };
}

describe('DeepSeekClassifier', () => {
  const specs = [
    { id: 'requirements_analyst', name: '需求分析员', description: '解析业务需求', intent: 'clarify' as const },
    { id: 'team_architect', name: '团队架构师', description: '设计团队角色', intent: 'proceed' as const },
  ];

  function buildClassifier(llm: LlmService, minConfidence = 0.5): DeepSeekClassifier {
    const orch = buildCreationOrchestrator(llm, envConfig({ minConfidence }), specs as any);
    return orch.classifier;
  }

  test('正常 JSON 输出 → 选中正确 agent + confidence', async () => {
    const llm = makeMockLlm(async () => ({
      content: '{"agentId": "team_architect", "confidence": 0.92}',
    }));
    const classifier = buildClassifier(llm);
    const result = await classifier.classify('我要建一个电商运营团队', []);
    expect(result.selectedAgent?.id).toBe('team_architect');
    expect(result.confidence).toBe(0.92);
  });

  test('容忍 ```json 代码块包裹', async () => {
    const llm = makeMockLlm(async () => ({
      content: '```json\n{"agentId": "requirements_analyst", "confidence": 0.8}\n```',
    }));
    const classifier = buildClassifier(llm);
    const result = await classifier.classify('帮我看看我需要什么', []);
    expect(result.selectedAgent?.id).toBe('requirements_analyst');
  });

  test('置信度低于阈值（≥0.2）→ fallback 到 requirements_analyst', async () => {
    const llm = makeMockLlm(async () => ({
      content: '{"agentId": "team_architect", "confidence": 0.3}',
    }));
    const classifier = buildClassifier(llm, 0.5);
    const result = await classifier.classify('随便', []);
    // RFC §A1 决策建议：低置信度不应返回 null（导致流程无路可走），
    // 而是 fallback 到 requirements_analyst（视为"需进一步澄清"）
    expect(result.selectedAgent?.id).toBe('requirements_analyst');
    expect(result.confidence).toBe(0.3);
  });

  test('置信度极低（<0.2）→ 视为未命中（selectedAgent null）', async () => {
    const llm = makeMockLlm(async () => ({
      content: '{"agentId": "team_architect", "confidence": 0.1}',
    }));
    const classifier = buildClassifier(llm, 0.5);
    const result = await classifier.classify('完全无关输入', []);
    expect(result.selectedAgent).toBeNull();
    expect(result.confidence).toBe(0.1);
  });

  test('agentId 未注册 → 未命中', async () => {
    const llm = makeMockLlm(async () => ({
      content: '{"agentId": "ghost_agent", "confidence": 0.9}',
    }));
    const classifier = buildClassifier(llm);
    const result = await classifier.classify('测试', []);
    expect(result.selectedAgent).toBeNull();
  });

  test('LLM 抛错 → 降级为未命中（不抛出）', async () => {
    const llm = makeMockLlm(async () => {
      throw new Error('upstream 500');
    });
    const classifier = buildClassifier(llm);
    const result = await classifier.classify('测试', []);
    expect(result.selectedAgent).toBeNull();
    expect(result.confidence).toBe(0);
  });

  test('输出非法 JSON → 未命中', async () => {
    const llm = makeMockLlm(async () => ({ content: '抱歉，我无法理解' }));
    const classifier = buildClassifier(llm);
    const result = await classifier.classify('测试', []);
    expect(result.selectedAgent).toBeNull();
  });
});

describe('OrchestratorExecutor', () => {
  test('disabled（env 关闭）→ degraded=true，不调用 LLM', async () => {
    const llm = makeMockLlm(async () => ({ content: 'x' }));
    const executor = new OrchestratorExecutor(llm, envConfig({ enabled: false }));
    expect(executor.enabled).toBe(false);
    const result = await executor.orchestrate({
      userInput: 'test',
      userId: 'u1',
      sessionId: 's1',
    });
    expect(result.degraded).toBe(true);
    expect(result.agentId).toBeNull();
    expect(llm.createCompletion).not.toHaveBeenCalled();
  });

  test('LLM 未配置 → degraded=true', async () => {
    const llm = { isConfigured: false, createCompletion: jest.fn() } as unknown as LlmService;
    const executor = new OrchestratorExecutor(llm, envConfig({ enabled: true }));
    expect(executor.enabled).toBe(false);
    const result = await executor.orchestrate({ userInput: 'x', userId: 'u', sessionId: 's' });
    expect(result.degraded).toBe(true);
  });

  test('完整链路：classify 命中 team_architect → 子代理执行 → 结果回写（一次 classify）', async () => {
    let callCount = 0;
    const llm = makeMockLlm(async (req: any) => {
      callCount += 1;
      if (callCount === 1) {
        // classifier 调用
        return { content: '{"agentId": "team_architect", "confidence": 0.9}' };
      }
      // 子代理调用
      return { content: '团队设计方案：CEO + 市场 + 产品。' };
    });
    const executor = new OrchestratorExecutor(llm, envConfig({ enabled: true }));
    const result = await executor.orchestrate({
      userInput: '我要建一个电商创业公司的虚拟团队',
      userId: 'u1',
      sessionId: 's1',
      context: '公司类型：电商；规模：小团队',
    });
    expect(result.degraded).toBe(false);
    expect(result.agentId).toBe('team_architect');
    expect(result.intent).toBe('proceed');
    expect(result.confidence).toBe(0.9);
    expect(result.output).toContain('团队设计方案');
    expect(callCount).toBe(2);
  });

  test('classify 未命中任何子代理 → degraded=true，confidence 保留', async () => {
    const llm = makeMockLlm(async () => ({
      content: '{"agentId": null, "confidence": 0.1}',
    }));
    const executor = new OrchestratorExecutor(llm, envConfig({ enabled: true }));
    const result = await executor.orchestrate({ userInput: 'x', userId: 'u', sessionId: 's' });
    expect(result.degraded).toBe(true);
    expect(result.agentId).toBeNull();
    expect(result.confidence).toBe(0.1);
  });

  test('classifyOnly 命中 requirements_analyst → intent=clarify', async () => {
    const llm = makeMockLlm(async () => ({
      content: '{"agentId": "requirements_analyst", "confidence": 0.85}',
    }));
    const executor = new OrchestratorExecutor(llm, envConfig({ enabled: true }));
    const cls = await executor.classifyOnly({
      userInput: '我不知道要做什么，帮我分析一下需求',
      userId: 'u',
      sessionId: 's',
    });
    expect(cls.agentId).toBe('requirements_analyst');
    expect(cls.degraded).toBe(false);

    const orch = executor.getOrCreate();
    expect(orch.intentFor('requirements_analyst')).toBe('clarify');
    expect(orch.intentFor('team_architect')).toBe('proceed');
    expect(orch.intentFor('unknown_agent')).toBe('proceed');
    expect(orch.intentFor(null)).toBe('proceed');
  });

  test('history 参与 classify 上下文', async () => {
    const llm = makeMockLlm(async (req: any) => {
      const historyIncluded = JSON.stringify(req.messages).includes('对话历史');
      expect(historyIncluded).toBe(true);
      return { content: '{"agentId": "team_architect", "confidence": 0.8}' };
    });
    const executor = new OrchestratorExecutor(llm, envConfig({ enabled: true }));
    await executor.classifyOnly({
      userInput: '继续',
      userId: 'u',
      sessionId: 's',
      history: [userMessage('我要做电商')],
    });
  });
});
