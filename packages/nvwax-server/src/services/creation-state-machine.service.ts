/**
 * Creation State Machine Service
 * 
 * 图状态机流程引擎，替代线性 7 步创建流程
 * 
 * 核心能力：
 * 1. 图状态管理（节点 + 边 + 条件分支）
 * 2. Checkpoint 持久化（支持断点恢复）
 * 3. Human-in-the-loop（关键节点暂停等待审批）
 * 4. 状态回退（GO_BACK 事件）
 * 5. 状态转换审计日志
 */

import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './database.service.js';
import {
  type StateNodeId,
  type StateNode,
  type StateTransition,
  type CreationStateData,
  type StateCheckpoint,
  type StateMachineConfig,
  type StateMachineEvent,
  DEFAULT_STATE_NODES,
  DEFAULT_TRANSITIONS,
} from '../types/creation-state.js';

// ============================================================
// 状态机引擎
// ============================================================

export class CreationStateMachine {
  private nodes: Map<StateNodeId, StateNode>;
  private transitions: StateTransition[];
  private terminalNodes: Set<StateNodeId>;
  private currentNodeId: StateNodeId;
  private stateData: CreationStateData;
  private history: StateTransition[];
  private sessionId: string;

  constructor(config: {
    sessionId: string;
    userId: string;
    nodes?: StateNode[];
    transitions?: StateTransition[];
    initialData?: Partial<CreationStateData>;
  }) {
    // 注册节点
    const nodeList = config.nodes || DEFAULT_STATE_NODES;
    this.nodes = new Map(nodeList.map(n => [n.id, n]));
    this.transitions = config.transitions || DEFAULT_TRANSITIONS;
    this.terminalNodes = new Set<StateNodeId>(['complete', 'failed']);
    
    // 初始化状态
    this.sessionId = config.sessionId;
    this.currentNodeId = 'requirements_gathering';
    this.history = [];
    this.stateData = {
      sessionId: config.sessionId,
      userId: config.userId,
      startedAt: new Date().toISOString(),
      ...config.initialData
    };
  }

  // ============================================================
  // 核心方法
  // ============================================================

  /** 获取当前节点 */
  getCurrentNode(): StateNode | undefined {
    return this.nodes.get(this.currentNodeId);
  }

  /** 获取当前节点 ID */
  getCurrentNodeId(): StateNodeId {
    return this.currentNodeId;
  }

  /** 获取状态数据 */
  getStateData(): CreationStateData {
    return { ...this.stateData };
  }

  /** 获取转换历史 */
  getHistory(): StateTransition[] {
    return [...this.history];
  }

  /** 是否为终止状态 */
  isTerminal(): boolean {
    return this.terminalNodes.has(this.currentNodeId);
  }

  /** 是否等待人工审批 */
  isWaitingForHuman(): boolean {
    const node = this.getCurrentNode();
    return node?.requiresHumanApproval === true;
  }

  /** 获取当前可用的转换列表 */
  getAvailableTransitions(): StateTransition[] {
    return this.transitions.filter(t => t.from === this.currentNodeId);
  }

  /** 获取进度百分比 */
  getProgress(): { currentStep: number; totalSteps: number; percentage: number } {
    const orderedNodes: StateNodeId[] = [
      'requirements_gathering', 'team_design', 'agent_matching',
      'skill_matching', 'ceo_generation', 'document_generation',
      'human_review', 'confirm', 'complete'
    ];
    
    const currentIndex = orderedNodes.indexOf(this.currentNodeId);
    if (currentIndex === -1) {
      // 辅助节点（clarify / revise_design / create_agent_guide）
      // 找到最近的主节点
      const mainNodeIndex = orderedNodes.findIndex(n => {
        const hist = this.history.filter(h => h.to === n);
        return hist.length > 0;
      });
      return {
        currentStep: Math.max(1, mainNodeIndex),
        totalSteps: orderedNodes.length - 1,
        percentage: Math.round((Math.max(1, mainNodeIndex) / (orderedNodes.length - 1)) * 100)
      };
    }

    return {
      currentStep: currentIndex + 1,
      totalSteps: orderedNodes.length - 1, // 不算 complete
      percentage: Math.round((currentIndex / (orderedNodes.length - 1)) * 100)
    };
  }

  // ============================================================
  // 事件处理
  // ============================================================

  /**
   * 处理事件并转换状态
   * @returns 转换后的节点 ID，如果转换失败则返回 null
   */
  async handleEvent(event: StateMachineEvent): Promise<{
    success: boolean;
    fromNode: StateNodeId;
    toNode: StateNodeId | null;
    message: string;
  }> {
    const fromNode = this.currentNodeId;

    // 终止状态下不接受新事件
    if (this.isTerminal()) {
      return { success: false, fromNode, toNode: null, message: '流程已终止，无法处理事件' };
    }

    try {
      let nextNode: StateNodeId | null = null;

      switch (event.type) {
        case 'PROCEED':
          nextNode = await this.handleProceed(event.data);
          break;
        case 'CLARIFY':
          nextNode = await this.handleClarify(event.message);
          break;
        case 'APPROVE':
          nextNode = await this.handleApprove(event.feedback);
          break;
        case 'REJECT':
          nextNode = await this.handleReject(event.reason);
          break;
        case 'GO_BACK':
          nextNode = await this.handleGoBack(event.targetNode);
          break;
        case 'RESTORE':
          nextNode = await this.handleRestore(event.checkpointId);
          break;
        case 'ERROR':
          nextNode = await this.handleError(event.error);
          break;
        case 'TIMEOUT':
          nextNode = 'failed';
          this.stateData.error = {
            nodeId: fromNode,
            message: `节点 ${fromNode} 执行超时`,
            recoverable: false
          };
          break;
        default:
          return { success: false, fromNode, toNode: null, message: `未知事件类型: ${(event as any).type}` };
      }

      if (nextNode && this.nodes.has(nextNode)) {
        // 记录转换
        const transition: StateTransition = {
          from: fromNode,
          to: nextNode,
          condition: { type: 'always' },
          action: event.type,
          timestamp: new Date().toISOString()
        };
        this.history.push(transition);
        this.currentNodeId = nextNode;

        // 持久化 checkpoint
        await this.saveCheckpoint();

        console.log(`[StateMachine] ${fromNode} → ${nextNode} (event: ${event.type})`);

        return { success: true, fromNode, toNode: nextNode, message: `已转换到 ${nextNode}` };
      }

      return { success: false, fromNode, toNode: null, message: '未找到有效的转换路径' };
    } catch (error: any) {
      console.error(`[StateMachine] Event handling failed:`, error);
      return { success: false, fromNode, toNode: null, message: error.message };
    }
  }

  // ============================================================
  // 事件处理器
  // ============================================================

  /** 处理 PROCEED 事件（推进到下一节点） */
  private async handleProceed(data?: Partial<CreationStateData>): Promise<StateNodeId | null> {
    // 合并数据
    if (data) {
      this.stateData = { ...this.stateData, ...data };
    }

    const currentNode = this.getCurrentNode();
    if (!currentNode) return null;

    // 如果当前节点需要人工审批，不能直接推进
    if (currentNode.requiresHumanApproval) {
      console.warn(`[StateMachine] Node ${currentNode.id} requires human approval, cannot proceed directly`);
      return null;
    }

    // 先尝试 on_data 条件（基于新数据评估）
    const onDataNode = this.resolveNextNode('on_data');
    if (onDataNode) {
      return onDataNode;
    }

    // 降级到 'always' 转换
    const nextNode = this.resolveNextNode('always');
    return nextNode;
  }

  /** 处理 CLARIFY 事件（需要澄清） */
  private async handleClarify(message: string): Promise<StateNodeId | null> {
    this.stateData.userFeedback = {
      phase: 'requirements_gathering',
      message,
      approved: false
    };
    return 'clarify';
  }

  /** 处理 APPROVE 事件（用户审批通过） */
  private async handleApprove(feedback?: string): Promise<StateNodeId | null> {
    this.stateData.userFeedback = {
      phase: this.currentNodeId as any,
      message: feedback || '已确认',
      approved: true
    };
    return this.resolveNextNode('on_approval');
  }

  /** 处理 REJECT 事件（用户拒绝） */
  private async handleReject(reason: string): Promise<StateNodeId | null> {
    this.stateData.userFeedback = {
      phase: this.currentNodeId as any,
      message: reason,
      approved: false
    };
    return this.resolveNextNode('on_rejection');
  }

  /** 处理 GO_BACK 事件（回退到指定节点） */
  private async handleGoBack(targetNode: StateNodeId): Promise<StateNodeId | null> {
    if (!this.nodes.has(targetNode)) {
      console.warn(`[StateMachine] Target node ${targetNode} does not exist`);
      return null;
    }

    // 不允许回退到终止节点
    if (this.terminalNodes.has(targetNode)) {
      console.warn(`[StateMachine] Cannot go back to terminal node ${targetNode}`);
      return null;
    }

    return targetNode;
  }

  /** 处理 RESTORE 事件（从 checkpoint 恢复） */
  private async handleRestore(checkpointId: string): Promise<StateNodeId | null> {
    const checkpoint = await this.loadCheckpoint(checkpointId);
    if (!checkpoint) {
      console.warn(`[StateMachine] Checkpoint ${checkpointId} not found`);
      return null;
    }

    // 恢复状态
    this.currentNodeId = checkpoint.nodeId;
    this.stateData = checkpoint.data;
    this.history = checkpoint.history;

    return checkpoint.nodeId; // 返回当前节点表示恢复成功
  }

  /** 处理 ERROR 事件 */
  private async handleError(error: Error): Promise<StateNodeId | null> {
    this.stateData.error = {
      nodeId: this.currentNodeId,
      message: error.message,
      recoverable: true
    };

    // 检查是否有错误转换路径
    const errorTransition = this.resolveNextNode('on_error');
    if (errorTransition) {
      return errorTransition;
    }

    // 默认进入 failed 状态
    return 'failed';
  }

  // ============================================================
  // 转换解析
  // ============================================================

  /**
   * 根据条件类型解析下一个节点
   */
  private resolveNextNode(conditionType: string): StateNodeId | null {
    const available = this.transitions.filter(
      t => t.from === this.currentNodeId && t.condition.type === conditionType
    );

    if (available.length === 0) {
      // 如果没有匹配的条件转换，尝试 'always' 类型
      if (conditionType !== 'always') {
        return this.resolveNextNode('always');
      }
      return null;
    }

    // on_data 条件：需要评估条件表达式
    if (conditionType === 'on_data') {
      for (const transition of available) {
        if (this.evaluateCondition(transition.condition.expression)) {
          return transition.to;
        }
      }
      // 没有任何 on_data 条件匹配，返回 null（让调用方 fallback 到 always）
      return null;
    }

    // 返回第一个匹配的转换
    return available[0].to;
  }

  /**
   * 评估条件表达式
   * 简单的表达式求值，支持基本的属性访问和比较
   */
  private evaluateCondition(expression?: string): boolean {
    if (!expression) return false;

    try {
      // 简单的条件评估
      // 例如: "confidence < 0.8" → 检查 stateData.requirements?.confidence
      if (expression.includes('confidence < 0.8')) {
        return (this.stateData.requirements?.confidence || 1) < 0.8;
      }
      if (expression.includes('hasMissingAgents')) {
        // 检查是否有未匹配的角色
        const matches = this.stateData.agentMatches || {};
        return Object.values(matches).some(agents => agents.length === 0);
      }
      if (expression.includes('goBackTo')) {
        return false; // GO_BACK 使用专门的处理逻辑
      }
      return false;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Checkpoint 持久化
  // ============================================================

  /** 保存 checkpoint 到数据库 */
  async saveCheckpoint(): Promise<void> {
    try {
      const pool = databaseService.getPool();
      const checkpointId = uuidv4();

      await pool.query(
        `INSERT INTO creation_checkpoints (
          id, session_id, node_id, state_data, history, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (session_id) DO UPDATE SET
          node_id = EXCLUDED.node_id,
          state_data = EXCLUDED.state_data,
          history = EXCLUDED.history,
          updated_at = NOW()`,
        [
          checkpointId,
          this.sessionId,
          this.currentNodeId,
          JSON.stringify(this.stateData),
          JSON.stringify(this.history),
          new Date().toISOString()
        ]
      );

      console.log(`[StateMachine] Checkpoint saved: ${this.sessionId} @ ${this.currentNodeId}`);
    } catch (error: any) {
      // 如果表不存在，记录警告但不阻塞流程
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('[StateMachine] creation_checkpoints table not found, skipping checkpoint save');
        return;
      }
      console.error('[StateMachine] Failed to save checkpoint:', error.message);
    }
  }

  /** 从数据库加载 checkpoint */
  async loadCheckpoint(checkpointId?: string): Promise<StateCheckpoint | null> {
    try {
      const pool = databaseService.getPool();

      const query = checkpointId
        ? 'SELECT * FROM creation_checkpoints WHERE id = $1'
        : 'SELECT * FROM creation_checkpoints WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1';
      
      const param = checkpointId || this.sessionId;
      const result = await pool.query(query, [param]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        sessionId: row.session_id,
        nodeId: row.node_id,
        data: typeof row.state_data === 'string' ? JSON.parse(row.state_data) : row.state_data,
        history: typeof row.history === 'string' ? JSON.parse(row.history) : row.history,
        createdAt: row.created_at
      };
    } catch (error: any) {
      console.error('[StateMachine] Failed to load checkpoint:', error.message);
      return null;
    }
  }

  /** 从 checkpoint 恢复状态机 */
  static async restore(sessionId: string): Promise<CreationStateMachine | null> {
    const tempMachine = new CreationStateMachine({ sessionId, userId: '' });
    const checkpoint = await tempMachine.loadCheckpoint();

    if (!checkpoint) {
      console.log(`[StateMachine] No checkpoint found for session ${sessionId}`);
      return null;
    }

    const machine = new CreationStateMachine({
      sessionId: checkpoint.sessionId,
      userId: checkpoint.data.userId,
      initialData: checkpoint.data
    });

    machine.currentNodeId = checkpoint.nodeId;
    machine.history = checkpoint.history;
    machine.stateData = checkpoint.data;

    console.log(`[StateMachine] Restored from checkpoint: ${sessionId} @ ${checkpoint.nodeId}`);
    return machine;
  }

  // ============================================================
  // 序列化
  // ============================================================

  /** 序列化为可存储的格式 */
  toJSON() {
    return {
      sessionId: this.sessionId,
      currentNodeId: this.currentNodeId,
      stateData: this.stateData,
      history: this.history,
      isTerminal: this.isTerminal(),
      isWaitingForHuman: this.isWaitingForHuman(),
      progress: this.getProgress()
    };
  }
}

// 导出
export default CreationStateMachine;
