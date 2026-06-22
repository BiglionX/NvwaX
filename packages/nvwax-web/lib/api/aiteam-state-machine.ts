import apiClient from './client';

/**
 * v2.2.0 Aiteam State Machine API 客户端
 *
 * 包装后端 /api/aiteam-state-machine/* 路由：
 * - 创建状态机 Session
 * - 触发事件（PROCEED / CLARIFY / APPROVE / REJECT / GO_BACK / ERROR）
 * - 查询当前状态 / 图定义
 * - Checkpoint 回退
 *
 * @see packages/nvwax-server/src/routes/aiteam-state-machine.routes.ts
 * @see packages/nvwax-server/src/services/creation-state-machine.service.ts
 */

// ============================================================
// 类型定义
// ============================================================

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

export type EventName = 'PROCEED' | 'CLARIFY' | 'APPROVE' | 'REJECT' | 'GO_BACK' | 'ERROR';

export type MachineStatus = 'active' | 'paused' | 'completed' | 'failed';

export interface StateMachineEvent {
  type: EventName;
  data?: Record<string, unknown>;
}

export interface StateGraphNode {
  id: string;
  label: string;
  description?: string;
  requiresHumanApproval?: boolean;
  timeoutMs?: number;
  group?: 'main' | 'auxiliary' | 'terminal';
  layer?: number;
}

export interface StateGraphEdge {
  from: string;
  to: string;
  condition: {
    type: 'always' | 'on_data' | 'on_approval';
    expression?: string;
  };
}

export interface StateCheckpoint {
  id: string;
  sessionId: string;
  nodeId: string;
  stateData: Record<string, unknown>;
  history: Array<{
    from: string;
    to: string;
    event: EventName;
    timestamp: string;
    message?: string;
  }>;
  createdAt: string;
}

export interface StateMachineState {
  sessionId: string;
  currentNode: StateNodeId;
  status: MachineStatus;
  progress: number; // 0-100
  checkpoint?: StateCheckpoint;
  stateData: Record<string, unknown>;
  history: Array<{
    from: string;
    to: string;
    event: EventName;
    timestamp: string;
    message?: string;
  }>;
  lastError?: string;
}

export interface StateGraphDefinition {
  nodes: StateGraphNode[];
  edges: StateGraphEdge[];
}

export interface EventResult {
  success: boolean;
  fromNode: string;
  toNode: string;
  message: string;
  state: StateMachineState;
}

// ============================================================
// API 函数
// ============================================================

/**
 * 创建新的 Aiteam 状态机 Session
 */
export async function createStateMachineSession(
  userId: string,
  initialData?: Record<string, unknown>
): Promise<{ sessionId: string }> {
  const response = await apiClient.post('/aiteam-state-machine/sessions', {
    userId,
    initialData,
  });
  return response.data;
}

/**
 * 获取当前状态机状态
 */
export async function getStateMachineState(
  sessionId: string
): Promise<StateMachineState> {
  const response = await apiClient.get(`/aiteam-state-machine/sessions/${sessionId}/state`);
  return response.data.state;
}

/**
 * 获取状态机图定义
 */
export async function getStateMachineGraph(): Promise<StateGraphDefinition> {
  const response = await apiClient.get('/aiteam-state-machine/graph');
  return response.data.graph;
}

/**
 * 触发状态机事件
 */
export async function triggerStateMachineEvent(
  sessionId: string,
  event: StateMachineEvent
): Promise<EventResult> {
  const response = await apiClient.post(`/aiteam-state-machine/sessions/${sessionId}/event`, {
    event,
  });
  return response.data.result;
}

/**
 * 重置状态机到初始状态
 */
export async function resetStateMachineSession(sessionId: string): Promise<void> {
  await apiClient.post(`/aiteam-state-machine/sessions/${sessionId}/reset`);
}

/**
 * 快捷方法：批准当前节点
 */
export async function approveNode(sessionId: string): Promise<EventResult> {
  return triggerStateMachineEvent(sessionId, { type: 'APPROVE' });
}

/**
 * 快捷方法：拒绝当前节点
 */
export async function rejectNode(sessionId: string, reason?: string): Promise<EventResult> {
  return triggerStateMachineEvent(sessionId, {
    type: 'REJECT',
    data: { reason },
  });
}

/**
 * 快捷方法：推进到下一节点
 */
export async function proceedNode(
  sessionId: string,
  data?: Record<string, unknown>
): Promise<EventResult> {
  return triggerStateMachineEvent(sessionId, {
    type: 'PROCEED',
    data,
  });
}

/**
 * 快捷方法：回退到上一个节点
 */
export async function goBackNode(sessionId: string): Promise<EventResult> {
  return triggerStateMachineEvent(sessionId, { type: 'GO_BACK' });
}

/**
 * 快捷方法：请求澄清（进入 clarify 状态）
 */
export async function clarifyNode(sessionId: string, question?: string): Promise<EventResult> {
  return triggerStateMachineEvent(sessionId, {
    type: 'CLARIFY',
    data: { question },
  });
}
