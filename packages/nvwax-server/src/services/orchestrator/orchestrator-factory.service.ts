/**
 * OrchestratorFactory — 装配 agent-squad 编排器
 * ------------------------------------------------------------
 * 组装：DeepSeekClassifier（意图路由） + 4 个 DeepSeekAgent（子代理）
 *       + AgentSquad（编排内核，InMemoryChatStorage）
 *
 * 子代理与状态机意图的映射：
 * - requirements_analyst → clarify   （需求不清，回需求收集澄清）
 * - team_architect       → proceed
 * - agent_matcher        → proceed
 * - document_writer      → proceed
 */

import { AgentSquad, InMemoryChatStorage } from 'agent-squad';
import type { LlmService } from '../llm/llm.service.js';
import { DeepSeekAgent } from './deepseek-agent.service.js';
import { DeepSeekClassifier } from './deepseek-classifier.service.js';
import {
  type OrchestrationIntent,
  type OrchestratorAgentSpec,
  type OrchestratorEnvConfig,
  resolveOrchestratorEnvConfig,
} from './types.js';

/** 默认创建流程子代理（CEO 生成节点的专业分工） */
export const DEFAULT_ORCHESTRATOR_AGENTS: OrchestratorAgentSpec[] = [
  {
    id: 'requirements_analyst',
    name: '需求分析员',
    description: '解析用户对智能体/团队的业务需求，提炼目标、职责与验收标准；需求残缺时主动指出缺失信息',
    systemPrompt:
      '你是 NvwaX 智能体创建流程中的「需求分析员」。你的任务是把用户的业务需求转化为清晰、结构化的需求描述：' +
      '包括公司/团队类型、核心职责、期望产出、数据源、行业、规模等。若用户提供的信息不足，明确指出缺失项，' +
      '不要臆测。输出为简洁的中文需求清单。',
    intent: 'clarify',
  },
  {
    id: 'team_architect',
    name: '团队架构师',
    description: '根据需求设计虚拟团队的角色构成与协作结构，决定需要哪些职能 Agent 及其分工',
    systemPrompt:
      '你是 NvwaX 智能体创建流程中的「团队架构师」。根据需求分析结果设计虚拟公司/AiTeam 的角色矩阵：' +
      '每个角色（CEO/市场/产品/技术/运营等）的定位、职责、以及角色间的协作关系。输出为结构化的团队设计方案，' +
      '优先复用现有 Agent 仓库中的成熟角色。',
    intent: 'proceed',
  },
  {
    id: 'agent_matcher',
    name: 'Agent 匹配专员',
    description: '在 Agent 仓库中为团队设计方案匹配合适的现成 Agent 与技能，处理缺失角色的补充建议',
    systemPrompt:
      '你是 NvwaX 智能体创建流程中的「Agent 匹配专员」。根据团队设计方案，在候选 Agent/技能清单中为每个角色' +
      '挑选最匹配的 Agent，说明匹配理由与置信度；若某角色没有现成 Agent 可匹配，明确标注缺失并提出补充建议' +
      '（新建或引入外部）。输出为角色 → Agent 的匹配映射。',
    intent: 'proceed',
  },
  {
    id: 'document_writer',
    name: '文档撰写员',
    description: '将团队设计与匹配结果整理为完整的配置文档与交付说明，供用户评审确认',
    systemPrompt:
      '你是 NvwaX 智能体创建流程中的「文档撰写员」。将团队设计方案与 Agent 匹配结果整理为完整、可交付的' +
      '创建文档：团队概览、角色明细、Agent 匹配表、技能配置、实施步骤。语言正式、结构清晰，供用户评审确认。',
    intent: 'proceed',
  },
];

export interface CreationOrchestrator {
  squad: AgentSquad;
  classifier: DeepSeekClassifier;
  agents: DeepSeekAgent[];
  specs: OrchestratorAgentSpec[];
  /** agentId → 流程意图；未注册 id 返回 proceed（保守） */
  intentFor(agentId: string | null | undefined): OrchestrationIntent;
}

export function buildCreationOrchestrator(
  llm: LlmService,
  env: OrchestratorEnvConfig = resolveOrchestratorEnvConfig(),
  specs: OrchestratorAgentSpec[] = DEFAULT_ORCHESTRATOR_AGENTS
): CreationOrchestrator {
  const classifier = new DeepSeekClassifier({
    llm,
    modelId: env.classifierModel,
    temperature: env.classifierTemperature,
    minConfidence: env.minConfidence,
  });

  const agents = specs.map(
    (spec) =>
      new DeepSeekAgent({
        id: spec.id, // 显式 id（中文名会被 agent-squad 默认规则生成空串）
        name: spec.name,
        description: spec.description,
        systemPrompt: spec.systemPrompt,
        llm,
        model: env.agentModel,
        temperature: env.agentTemperature,
      })
  );

  const squad = new AgentSquad({
    classifier,
    storage: new InMemoryChatStorage(),
    config: {
      // 未识别时不用 default agent 兜底，交由 executor 走降级路径（A3 验收）
      USE_DEFAULT_AGENT_IF_NONE_IDENTIFIED: false,
      LOG_AGENT_CHAT: envLog('ORCHESTRATOR_LOG_AGENT_CHAT'),
      LOG_CLASSIFIER_CHAT: envLog('ORCHESTRATOR_LOG_CLASSIFIER_CHAT'),
      LOG_CLASSIFIER_OUTPUT: envLog('ORCHESTRATOR_LOG_CLASSIFIER_OUTPUT'),
      LOG_EXECUTION_TIMES: envLog('ORCHESTRATOR_LOG_EXECUTION_TIMES'),
    },
  });

  for (const agent of agents) {
    squad.addAgent(agent);
  }

  const intentByAgentId = new Map(specs.map((s) => [s.id, s.intent]));
  const intentFor = (agentId: string | null | undefined): OrchestrationIntent => {
    if (!agentId) return 'proceed';
    return intentByAgentId.get(agentId) ?? 'proceed';
  };

  return { squad, classifier, agents, specs, intentFor };
}

function envLog(name: string): boolean {
  return (process.env[name] ?? 'false').toLowerCase() === 'true';
}
