/**
 * Orchestrator 类型定义
 * ------------------------------------------------------------
 * NvwaX 智能体创建流程的编排层（基于 agent-squad，原 awslabs/multi-agent-orchestrator）。
 *
 * 职责边界（见 docs/AGENT-CREATION-ORCHESTRATOR-RFC.md）：
 * - CreationStateMachine 保留为流程壳（checkpoint / HITL / 审计）
 * - 编排器只做节点内智能执行：classifier 意图路由 → 子代理处理
 */

/** 子代理命中后对应的状态机流程意图 */
export type OrchestrationIntent = 'clarify' | 'proceed' | 'approve' | 'handoff';

/** 单个编排子代理的静态描述 */
export interface OrchestratorAgentSpec {
  /** 稳定 id（与 agent-squad Agent.id 一致，用于审计/路由） */
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  /** 该子代理被命中时对应的流程意图 */
  intent: OrchestrationIntent;
}

/** 编排执行结果（回写 stateData.orchestration） */
export interface OrchestrationResult {
  /** classifier 分类出的流程意图 */
  intent: OrchestrationIntent;
  /** 被选中的子代理 id（无匹配/降级时为 null） */
  agentId: string | null;
  agentName: string | null;
  /** 路由置信度 0-1（LLM 不可用/降级时为 0） */
  confidence: number;
  /** 子代理输出文本 */
  output: string;
  /** handoff 接力链（agent-squad 1.x 尚未支持，预留字段） */
  handoffChain: string[];
  /** 原始编排输出（诊断用） */
  raw: Record<string, unknown>;
  /** true = 编排器不可用/无匹配，调用方应走原有降级路径 */
  degraded: boolean;
}

/** 编排器环境配置 */
export interface OrchestratorEnvConfig {
  enabled: boolean;
  classifierModel: string;
  agentModel: string;
  classifierTemperature: number;
  agentTemperature: number;
  /** classifier 无匹配时的置信度阈值（低于则降级） */
  minConfidence: number;
}

/** 解析编排器环境变量（集中管理，便于测试注入） */
export function resolveOrchestratorEnvConfig(env: NodeJS.ProcessEnv = process.env): OrchestratorEnvConfig {
  return {
    enabled: (env.ORCHESTRATOR_ENABLED ?? 'true').toLowerCase() !== 'false',
    classifierModel: env.ORCHESTRATOR_CLASSIFIER_MODEL || 'deepseek-v4-flash',
    agentModel: env.ORCHESTRATOR_AGENT_MODEL || 'deepseek-v4-flash',
    classifierTemperature: Number(env.ORCHESTRATOR_CLASSIFIER_TEMPERATURE ?? 0),
    agentTemperature: Number(env.ORCHESTRATOR_AGENT_TEMPERATURE ?? 0.7),
    minConfidence: Number(env.ORCHESTRATOR_MIN_CONFIDENCE ?? 0.4),
  };
}
