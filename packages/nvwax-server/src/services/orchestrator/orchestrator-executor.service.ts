/**
 * OrchestratorExecutor — 创建节点内的编排执行器
 * ------------------------------------------------------------
 * 供 CreationStateMachine 的 ceo_generation 等节点调用。
 *
 * 执行链路（走 agent-squad 核心公开 API，仅一次 classify）：
 *   classifier.classify(input, history)        → ClassifierResult（含 confidence）
 *   squad.agentProcessRequest(input, ...)      → AgentResponse（子代理输出）
 *
 * 降级契约（A3 验收项）：编排器不可用 / LLM 未配置 / 未命中任何子代理 /
 * classify 抛错 → 返回 degraded=true，调用方走原有创建逻辑，行为与集成前一致。
 */

import { AgentSquad, type ConversationMessage, ParticipantRole } from 'agent-squad';
import type { LlmService } from '../llm/llm.service.js';
import { buildCreationOrchestrator, type CreationOrchestrator } from './orchestrator-factory.service.js';
import { contentToText } from './deepseek-agent.service.js';
import {
  type OrchestrationResult,
  type OrchestratorEnvConfig,
  resolveOrchestratorEnvConfig,
} from './types.js';

export interface OrchestrateInput {
  userInput: string;
  userId: string;
  sessionId: string;
  /** 会话历史（classifier 上下文）；缺省空 */
  history?: ConversationMessage[];
  /** 额外上下文（如需求清单），透传给子代理 */
  context?: string;
}

export class OrchestratorExecutor {
  private orchestrator: CreationOrchestrator | null = null;
  private readonly env: OrchestratorEnvConfig;

  constructor(
    private readonly llm: LlmService,
    env: OrchestratorEnvConfig = resolveOrchestratorEnvConfig()
  ) {
    this.env = env;
  }

  /** 编排器是否可用（环境开关 + LLM 已配置） */
  get enabled(): boolean {
    return this.env.enabled && this.llm.isConfigured;
  }

  /** 懒加载编排器（单例，避免每节点重建） */
  getOrCreate(): CreationOrchestrator {
    if (!this.orchestrator) {
      this.orchestrator = buildCreationOrchestrator(this.llm, this.env);
    }
    return this.orchestrator;
  }

  /** 仅做意图路由（供冒烟测试 / 审计 / 状态机条件分支评估） */
  async classifyOnly(input: OrchestrateInput): Promise<{
    agentId: string | null;
    confidence: number;
    degraded: boolean;
  }> {
    if (!this.enabled) {
      return { agentId: null, confidence: 0, degraded: true };
    }
    try {
      const orch = this.getOrCreate();
      const result = await orch.classifier.classify(input.userInput, input.history ?? []);
      return {
        agentId: result.selectedAgent?.id ?? null,
        confidence: result.confidence,
        degraded: result.selectedAgent === null,
      };
    } catch (error: any) {
      console.warn(`[OrchestratorExecutor] classify failed, degraded: ${error?.message ?? error}`);
      return { agentId: null, confidence: 0, degraded: true };
    }
  }

  /** 完整编排：路由 → 子代理执行 → 结果回写 */
  async orchestrate(input: OrchestrateInput): Promise<OrchestrationResult> {
    if (!this.enabled) {
      return this.degradedResult('orchestrator disabled or LLM not configured');
    }

    const orch = this.getOrCreate();
    const history = input.history ?? [];

    let classifierResult;
    try {
      // 直接调 classifier.classify 以拿到 confidence（agentProcessRequest 不透出）
      classifierResult = await orch.classifier.classify(input.userInput, history);
    } catch (error: any) {
      console.warn(`[OrchestratorExecutor] classify failed, degraded: ${error?.message ?? error}`);
      return this.degradedResult('classify error');
    }

    if (!classifierResult.selectedAgent) {
      return {
        intent: 'proceed',
        agentId: null,
        agentName: null,
        confidence: classifierResult.confidence,
        output: '',
        handoffChain: [],
        raw: { reason: 'no agent matched' },
        degraded: true,
      };
    }

    let response;
    try {
      response = await orch.squad.agentProcessRequest(
        input.userInput,
        input.userId,
        input.sessionId,
        classifierResult,
        input.context ? { context: input.context } : {}
      );
    } catch (error: any) {
      console.warn(`[OrchestratorExecutor] agent execution failed, degraded: ${error?.message ?? error}`);
      return {
        intent: orch.intentFor(classifierResult.selectedAgent.id),
        agentId: classifierResult.selectedAgent.id,
        agentName: classifierResult.selectedAgent.name,
        confidence: classifierResult.confidence,
        output: '',
        handoffChain: [],
        raw: { error: error?.message ?? String(error) },
        degraded: true,
      };
    }

    const agentId = response.metadata?.agentId ?? classifierResult.selectedAgent.id;
    const output = extractOutput(response.output);

    return {
      intent: orch.intentFor(agentId),
      agentId,
      agentName: response.metadata?.agentName ?? classifierResult.selectedAgent.name,
      confidence: classifierResult.confidence,
      output,
      handoffChain: [], // agent-squad 1.x 无 handoff，预留
      raw: { classifierConfidence: classifierResult.confidence, streaming: response.streaming },
      degraded: false,
    };
  }

  private degradedResult(reason: string): OrchestrationResult {
    return {
      intent: 'proceed',
      agentId: null,
      agentName: null,
      confidence: 0,
      output: '',
      handoffChain: [],
      raw: { reason },
      degraded: true,
    };
  }
}

/** 归一化 agent-squad 的 AgentResponse.output（string | content 数组 | streaming transform） */
function extractOutput(output: any): string {
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) return contentToText(output);
  if (output && typeof output[Symbol.asyncIterator] === 'function') {
    // streaming 输出（Phase 0 的 DeepSeekAgent 非流式，防御处理）
    return '';
  }
  return '';
}

/** 便捷导出：ConversationMessage 构造（供调用方组装 history） */
export function userMessage(content: string): ConversationMessage {
  return { role: ParticipantRole.USER, content: [content] };
}

export function assistantMessage(content: string): ConversationMessage {
  return { role: ParticipantRole.ASSISTANT, content: [content] };
}

export type { AgentSquad };
