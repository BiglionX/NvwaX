/**
 * Aiteam State Machine Routes (v2.2.0)
 *
 * 包装 CreationStateMachine，提供给前端的图状态机 API
 *
 * @see packages/nvwax-server/src/services/creation-state-machine.service.ts
 * @see packages/nvwax-server/src/types/creation-state.ts
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { universalAuthMiddleware } from '../middleware/universal-auth.middleware.js';
import { databaseService } from '../services/database.service.js';
import { CreationStateMachine } from '../services/creation-state-machine.service.js';
import { OrchestratorExecutor } from '../services/orchestrator/orchestrator-executor.service.js';
import { llmService } from '../services/llm/llm.service.js';
import {
  DEFAULT_STATE_NODES,
  DEFAULT_TRANSITIONS,
  type StateNodeId,
  type StateMachineEvent,
  type StateNode,
} from '../types/creation-state.js';
import { sseProgressService } from '../services/sse-progress.service.js';

const router = Router();

// 所有 Aiteam 状态机路由需要认证
router.use(universalAuthMiddleware);

// ceo_generation 节点内编排器（懒加载内部编排器，disabled 时 orchestrate 返回 degraded）
const creationOrchestrator = new OrchestratorExecutor(llmService);

// ============================================================
// 类型定义
// ============================================================

/**
 * 状态机会话（保存到 aiteam_creation_sessions.state_machine_state JSONB 字段）
 */
interface StateMachineSession {
  /** 会话 ID */
  sessionId: string;
  /** 用户 ID */
  userId: string;
  /** CreationStateMachine 实例（不持久化，只保留状态） */
  currentNodeId: StateNodeId;
  /** 状态数据 */
  stateData: Record<string, unknown>;
  /** 转换历史 */
  history: Array<{
    from: StateNodeId;
    to: StateNodeId;
    timestamp: string;
    action: string;
  }>;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 状态机 API 响应
 */
interface StateMachineResponse {
  success: boolean;
  data?: {
    currentNodeId: StateNodeId;
    currentNode: StateNode;
    status: 'pending' | 'active' | 'completed' | 'error' | 'skipped';
    progress: {
      currentStep: number;
      totalSteps: number;
      percentage: number;
    };
    history: StateMachineSession['history'];
    availableTransitions: Array<{
      from: StateNodeId;
      to: StateNodeId;
      condition: string;
    }>;
    stateData: Record<string, unknown>;
  };
  error?: string;
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 从数据库加载或创建 StateMachineSession
 */
async function loadOrCreateStateMachineSession(
  sessionId: string,
  userId: string
): Promise<{ state: StateMachineSession; machine: CreationStateMachine }> {
  const pool = databaseService.getPool();

  // 1. 尝试加载现有状态
  const result = await pool.query(
    `SELECT state_machine_state FROM aiteam_creation_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  let state: StateMachineSession;
  if (result.rows.length > 0 && result.rows[0].state_machine_state) {
    state = result.rows[0].state_machine_state;
  } else {
    // 2. 创建新状态
    state = {
      sessionId,
      userId,
      currentNodeId: 'requirements_gathering',
      stateData: {},
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // 3. 重建 CreationStateMachine 实例
  const machine = new CreationStateMachine({
    sessionId,
    userId,
    nodes: DEFAULT_STATE_NODES,
    transitions: DEFAULT_TRANSITIONS,
    initialData: state.stateData as any,
    // 注入 ceo_generation 节点内编排（增强；不可用时 orchestrate 返回 degraded，流程不变）
    orchestrator: {
      orchestrate: (input) => creationOrchestrator.orchestrate(input),
    },
  });

  // 4. 恢复当前节点和历史
  // 注：使用 TypeScript 私有属性访问，谨慎操作
  (machine as any).currentNodeId = state.currentNodeId;
  (machine as any).history = state.history;

  return { state, machine };
}

/**
 * 持久化 StateMachineSession 到数据库
 */
async function persistStateMachineSession(state: StateMachineSession): Promise<void> {
  const pool = databaseService.getPool();
  const updatedState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  await pool.query(
    `UPDATE aiteam_creation_sessions
     SET state_machine_state = $1::jsonb,
     updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(updatedState), state.sessionId]
  );
}

/**
 * 计算进度
 */
function computeProgress(currentNodeId: StateNodeId): { currentStep: number; totalSteps: number; percentage: number } {
  const orderedNodes: StateNodeId[] = [
    'requirements_gathering', 'team_design', 'agent_matching',
    'skill_matching', 'ceo_generation', 'document_generation',
    'human_review', 'confirm', 'complete'
  ];

  const currentIndex = orderedNodes.indexOf(currentNodeId);
  if (currentIndex === -1) {
    // 辅助节点：clarify / revise_design / create_agent_guide / failed
    return { currentStep: 0, totalSteps: orderedNodes.length - 1, percentage: 0 };
  }

  return {
    currentStep: currentIndex + 1,
    totalSteps: orderedNodes.length - 1,
    percentage: Math.round((currentIndex / (orderedNodes.length - 1)) * 100),
  };
}

// ============================================================
// 路由定义
// ============================================================

/**
 * GET /api/aiteam-state-machine/sessions/:id/state
 * 获取会话的当前状态机状态
 */
router.get('/sessions/:id/state', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = (req as any).user?.id || (req as any).sessionUser?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { state, machine } = await loadOrCreateStateMachineSession(sessionId, userId);

    // 获取当前节点信息
    const currentNode = DEFAULT_STATE_NODES.find(n => n.id === state.currentNodeId);

    // 获取可用的转换
    const availableTransitions = DEFAULT_TRANSITIONS
      .filter(t => t.from === state.currentNodeId)
      .map(t => ({ from: t.from, to: t.to, condition: t.condition.type }));

    const response: StateMachineResponse = {
      success: true,
      data: {
        currentNodeId: state.currentNodeId,
        currentNode: currentNode!,
        status: machine.isWaitingForHuman() ? 'active' : 'active',
        progress: computeProgress(state.currentNodeId),
        history: state.history,
        availableTransitions,
        stateData: state.stateData,
      },
    };

    res.json(response);
  } catch (error: any) {
    console.error('[AiteamStateMachine] Get state failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/aiteam-state-machine/sessions/:id/event
 * 触发状态机事件
 *
 * Body: { type: 'PROCEED' | 'CLARIFY' | 'APPROVE' | 'REJECT' | 'GO_BACK' | 'ERROR', data? }
 */
router.post('/sessions/:id/event', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = (req as any).user?.id || (req as any).sessionUser?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { type, data, message, reason, targetNode, error } = req.body as {
      type: string;
      data?: any;
      message?: string;
      reason?: string;
      targetNode?: StateNodeId;
      error?: string;
    };

    if (!type) {
      return res.status(400).json({ success: false, error: 'Missing event type' });
    }

    // 加载状态机
    const { state, machine } = await loadOrCreateStateMachineSession(sessionId, userId);

    // 构建事件
    const event: StateMachineEvent = (() => {
      switch (type) {
        case 'PROCEED':
          return { type: 'PROCEED', data };
        case 'CLARIFY':
          return { type: 'CLARIFY', message: message || '' };
        case 'APPROVE':
          return { type: 'APPROVE', feedback: reason };
        case 'REJECT':
          return { type: 'REJECT', reason: reason || '' };
        case 'GO_BACK':
          return { type: 'GO_BACK', targetNode: targetNode! };
        case 'ERROR':
          return { type: 'ERROR', error: new Error(error || 'Unknown error') };
        case 'ORCHESTRATE':
          return {
            type: 'ORCHESTRATE',
            data: { userInput: data?.userInput, context: data?.context },
          };
        default:
          throw new Error(`Unknown event type: ${type}`);
      }
    })();

    // 处理事件
    const result = await machine.handleEvent(event);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }

    // 更新状态
    const newState: StateMachineSession = {
      ...state,
      currentNodeId: result.toNode!,
      stateData: {
        ...state.stateData,
        ...(data || {}),
      },
      history: [...state.history, {
        from: result.fromNode,
        to: result.toNode!,
        timestamp: new Date().toISOString(),
        action: type,
      }],
      updatedAt: new Date().toISOString(),
    };

    // 持久化
    await persistStateMachineSession(newState);

    // 广播 SSE 进度
    sseProgressService.broadcastProgress(sessionId).catch(err => {
      console.warn('[AiteamStateMachine] SSE broadcast failed:', err);
    });

    // 同步更新 aiteam_creation_sessions.status 字段
    try {
      const pool = databaseService.getPool();
      const nodeToStatus: Record<string, string> = {
        requirements_gathering: 'requirements_gathering',
        team_design: 'role_selection',
        agent_matching: 'agent_searching',
        skill_matching: 'skill_matching',
        ceo_generation: 'role_selection',
        document_generation: 'confirming',
        human_review: 'confirming',
        confirm: 'confirming',
        complete: 'completed',
        failed: 'failed',
      };
      const newStatus = nodeToStatus[result.toNode!] || state.currentNodeId;
      await pool.query(
        `UPDATE aiteam_creation_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newStatus, sessionId]
      );
    } catch (err) {
      console.warn('[AiteamStateMachine] Failed to sync status:', err);
    }

    // 返回新状态
    const currentNode = DEFAULT_STATE_NODES.find(n => n.id === result.toNode);
    const availableTransitions = DEFAULT_TRANSITIONS
      .filter(t => t.from === result.toNode)
      .map(t => ({ from: t.from, to: t.to, condition: t.condition.type }));

    const response: StateMachineResponse = {
      success: true,
      data: {
        currentNodeId: result.toNode!,
        currentNode: currentNode!,
        status: 'active',
        progress: computeProgress(result.toNode!),
        history: newState.history,
        availableTransitions,
        stateData: newState.stateData,
      },
    };

    res.json(response);
  } catch (error: any) {
    console.error('[AiteamStateMachine] Event failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/aiteam-state-machine/graph
 * 获取状态机定义（用于前端可视化）
 */
router.get('/graph', (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        nodes: DEFAULT_STATE_NODES,
        edges: DEFAULT_TRANSITIONS,
        // 边附带的人类可读 label
        edgeLabels: {
          'requirements_gathering->clarify': 'confidence<0.8',
          'team_design->revise_design': 'on_rejection',
          'agent_matching->create_agent_guide': 'no match',
          'human_review->confirm': 'on_approval',
          'human_review->revise_design': 'on_rejection',
        },
      },
    });
  } catch (error: any) {
    console.error('[AiteamStateMachine] Get graph failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/aiteam-state-machine/sessions/:id/reset
 * 重置状态机（开发/调试用）
 */
router.post('/sessions/:id/reset', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = (req as any).user?.id || (req as any).sessionUser?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const initialState: StateMachineSession = {
      sessionId,
      userId,
      currentNodeId: 'requirements_gathering',
      stateData: {},
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await persistStateMachineSession(initialState);

    res.json({ success: true, message: 'State machine reset successfully' });
  } catch (error: any) {
    console.error('[AiteamStateMachine] Reset failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
