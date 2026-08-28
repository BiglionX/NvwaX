/**
 * Creation State Types
 * 
 * 定义状态机流程引擎所需的类型
 * 用于 Aiteam 创建流程的状态管理
 */

import type { 
  RequirementAnalysis, 
  TeamDesign, 
  AgentMatch, 
  SkillMatchResult, 
  NvwaXPhase 
} from '../services/nvwax-agent.service.js';
import type { CEOConfig } from '../services/ceo-agent-generator.service.js';
import type { DocumentPackage } from '../services/document-generator.service.js';

// ============================================================
// 状态节点定义
// ============================================================

/** 状态机节点 ID */
export type StateNodeId = 
  | 'requirements_gathering'
  | 'clarify'
  | 'team_design'
  | 'revise_design'
  | 'agent_matching'
  | 'create_agent_guide'
  | 'skill_matching'
  | 'ceo_generation'
  | 'document_generation'
  | 'human_review'
  | 'confirm'
  | 'complete'
  | 'failed';

/** 状态节点定义 */
export interface StateNode {
  id: StateNodeId;
  name: string;
  description: string;
  /** 是否需要人工审批（human-in-the-loop） */
  requiresHumanApproval: boolean;
  /** 节点超时时间（毫秒） */
  timeoutMs: number;
}

// ============================================================
// 状态转换
// ============================================================

/** 状态转换条件 */
export interface TransitionCondition {
  /** 条件类型 */
  type: 'always' | 'on_data' | 'on_approval' | 'on_rejection' | 'on_error' | 'on_timeout';
  /** 条件表达式（用于 on_data 类型） */
  expression?: string;
}

/** 状态转换定义 */
export interface StateTransition {
  from: StateNodeId;
  to: StateNodeId;
  condition: TransitionCondition;
  /** 转换时执行的动作 */
  action?: string;
  /** 转换时间戳 */
  timestamp?: string;
}

// ============================================================
// 状态数据
// ============================================================

/** 创建流程的完整状态数据 */
export interface CreationStateData {
  // 流程元数据
  sessionId: string;
  userId: string;
  startedAt: string;

  // 需求分析结果
  requirements?: RequirementAnalysis;
  
  // 团队设计结果
  teamDesign?: TeamDesign;
  
  // Agent 匹配结果
  agentMatches?: Record<string, AgentMatch[]>;
  
  // Skill 匹配结果
  skillMatches?: SkillMatchResult;
  
  // CEO 配置
  ceoConfig?: CEOConfig;
  
  // 文档包
  documentPackage?: DocumentPackage;
  
  // 用户反馈
  userFeedback?: {
    phase: NvwaXPhase;
    message: string;
    approved: boolean;
  };
  
  // 错误信息
  error?: {
    nodeId: StateNodeId;
    message: string;
    recoverable: boolean;
  };

  // 编排结果（agent-squad 节点内编排，见 OrchestratorExecutor）
  orchestration?: OrchestrationInfo;
}

/**
 * 编排信息（状态机侧轻量结构，兼容 OrchestratorExecutor 的 OrchestrationResult）
 * 供 on_data 条件表达式（如 `orchestration.intent === 'clarify'`）与审计使用
 */
export interface OrchestrationInfo {
  /** classifier 分类出的流程意图 */
  intent: 'clarify' | 'proceed' | 'approve' | 'handoff';
  /** 被选中的子代理 id（无匹配/降级时为 null） */
  agentId: string | null;
  agentName: string | null;
  /** 路由置信度 0-1 */
  confidence: number;
  /** 子代理输出文本 */
  output: string;
  /** handoff 接力链（预留） */
  handoffChain: string[];
  /** true = 编排器不可用/无匹配，调用方应走降级路径 */
  degraded: boolean;
}

// ============================================================
// Checkpoint
// ============================================================

/** 状态检查点（用于持久化和断点恢复） */
export interface StateCheckpoint {
  id: string;
  sessionId: string;
  nodeId: StateNodeId;
  data: CreationStateData;
  history: StateTransition[];
  createdAt: string;
}

// ============================================================
// 状态机配置
// ============================================================

/** 状态机配置 */
export interface StateMachineConfig {
  /** 节点定义 */
  nodes: StateNode[];
  /** 转换规则 */
  transitions: StateTransition[];
  /** 初始节点 */
  initialNode: StateNodeId;
  /** 终止节点 */
  terminalNodes: StateNodeId[];
}

// ============================================================
// 状态机事件
// ============================================================

/** 状态机事件 */
export type StateMachineEvent = 
  | { type: 'PROCEED'; data?: Partial<CreationStateData> }
  | { type: 'CLARIFY'; message: string }
  | { type: 'APPROVE'; feedback?: string }
  | { type: 'REJECT'; reason: string }
  | { type: 'GO_BACK'; targetNode: StateNodeId }
  | { type: 'RESTORE'; checkpointId: string }
  | { type: 'ERROR'; error: Error }
  | { type: 'TIMEOUT' }
  | { type: 'ORCHESTRATE'; data?: { userInput?: string; context?: string } };

// ============================================================
// 预定义节点
// ============================================================

export const DEFAULT_STATE_NODES: StateNode[] = [
  {
    id: 'requirements_gathering',
    name: '需求收集与分析',
    description: '收集用户需求并分析团队目标',
    requiresHumanApproval: false,
    timeoutMs: 300_000 // 5 分钟
  },
  {
    id: 'clarify',
    name: '需求澄清',
    description: '向用户追问以补充不足信息',
    requiresHumanApproval: true,
    timeoutMs: 600_000 // 10 分钟
  },
  {
    id: 'team_design',
    name: '团队结构设计',
    description: '基于需求设计团队角色和协作流程',
    requiresHumanApproval: false,
    timeoutMs: 300_000
  },
  {
    id: 'revise_design',
    name: '修订团队设计',
    description: '根据用户反馈或审查结果修改设计',
    requiresHumanApproval: true,
    timeoutMs: 600_000
  },
  {
    id: 'agent_matching',
    name: 'Agent 搜索与匹配',
    description: '为每个角色搜索匹配的 Agent',
    requiresHumanApproval: false,
    timeoutMs: 300_000
  },
  {
    id: 'create_agent_guide',
    name: 'Agent 创建引导',
    description: '引导用户创建缺失的 Agent',
    requiresHumanApproval: true,
    timeoutMs: 900_000 // 15 分钟
  },
  {
    id: 'skill_matching',
    name: 'Skill 匹配',
    description: '为团队匹配所需 Skills',
    requiresHumanApproval: false,
    timeoutMs: 300_000
  },
  {
    id: 'ceo_generation',
    name: 'CEO Agent 生成',
    description: '生成定制化的 CEO Agent 配置',
    requiresHumanApproval: false,
    timeoutMs: 300_000
  },
  {
    id: 'document_generation',
    name: '文档包生成',
    description: '生成完整的团队经营配置文档',
    requiresHumanApproval: false,
    timeoutMs: 300_000
  },
  {
    id: 'human_review',
    name: '人工审核',
    description: '用户审核完整配置并确认',
    requiresHumanApproval: true,
    timeoutMs: 1800_000 // 30 分钟
  },
  {
    id: 'confirm',
    name: '确认保存',
    description: '确认并保存最终配置',
    requiresHumanApproval: true,
    timeoutMs: 600_000
  },
  {
    id: 'complete',
    name: '创建完成',
    description: '团队创建流程完成',
    requiresHumanApproval: false,
    timeoutMs: 0
  },
  {
    id: 'failed',
    name: '创建失败',
    description: '流程因错误终止',
    requiresHumanApproval: false,
    timeoutMs: 0
  }
];

/** 预定义的转换规则 */
export const DEFAULT_TRANSITIONS: StateTransition[] = [
  // requirements_gathering 的出口
  { from: 'requirements_gathering', to: 'clarify', condition: { type: 'on_data', expression: 'confidence < 0.8' } },
  { from: 'requirements_gathering', to: 'team_design', condition: { type: 'always' } },
  
  // clarify 的出口
  { from: 'clarify', to: 'requirements_gathering', condition: { type: 'always' } },
  
  // team_design 的出口
  { from: 'team_design', to: 'revise_design', condition: { type: 'on_rejection' } },
  { from: 'team_design', to: 'agent_matching', condition: { type: 'on_approval' } },
  { from: 'team_design', to: 'agent_matching', condition: { type: 'always' } },
  
  // revise_design 的出口
  { from: 'revise_design', to: 'team_design', condition: { type: 'always' } },
  
  // agent_matching 的出口
  { from: 'agent_matching', to: 'create_agent_guide', condition: { type: 'on_data', expression: 'hasMissingAgents' } },
  { from: 'agent_matching', to: 'skill_matching', condition: { type: 'always' } },
  
  // create_agent_guide 的出口
  { from: 'create_agent_guide', to: 'skill_matching', condition: { type: 'on_approval' } },
  { from: 'create_agent_guide', to: 'skill_matching', condition: { type: 'always' } },
  
  // skill_matching 的出口
  { from: 'skill_matching', to: 'ceo_generation', condition: { type: 'always' } },
  
  // ceo_generation 的出口
  { from: 'ceo_generation', to: 'document_generation', condition: { type: 'always' } },
  
  // document_generation 的出口
  { from: 'document_generation', to: 'human_review', condition: { type: 'always' } },
  
  // human_review 的出口
  { from: 'human_review', to: 'confirm', condition: { type: 'on_approval' } },
  { from: 'human_review', to: 'revise_design', condition: { type: 'on_rejection' } },
  { from: 'human_review', to: 'team_design', condition: { type: 'on_data', expression: 'goBackTo === "team_design"' } },
  
  // confirm 的出口
  { from: 'confirm', to: 'complete', condition: { type: 'on_approval' } },
  
  // 全局错误处理
  { from: 'requirements_gathering', to: 'failed', condition: { type: 'on_error' } },
  { from: 'team_design', to: 'failed', condition: { type: 'on_error' } },
  { from: 'agent_matching', to: 'failed', condition: { type: 'on_error' } },
  { from: 'skill_matching', to: 'failed', condition: { type: 'on_error' } },
  { from: 'ceo_generation', to: 'failed', condition: { type: 'on_error' } },
  { from: 'document_generation', to: 'failed', condition: { type: 'on_error' } },
];
