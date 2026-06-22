'use client';

/**
 * AiteamStateGraphView - v2.2.0 状态机可视化视图
 *
 * 集成 StateGraphVisualizer + 节点详情面板 + Checkpoint 提示
 * 用于替代旧的 7 步线性进度条
 *
 * @example
 * ```tsx
 * <AiteamStateGraphView
 *   sessionId="abc123"
 *   onNodeAction={(nodeId, action) => handleAction(nodeId, action)}
 *   onCheckpointRestore={(checkpointId) => restore(checkpointId)}
 * />
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StateGraphVisualizer,
  type StateGraphNode,
  type StateGraphEdge,
} from '@/components/UI';
import {
  getStateMachineState,
  getStateMachineGraph,
  triggerStateMachineEvent,
  approveNode,
  rejectNode,
  proceedNode,
  goBackNode,
  clarifyNode,
  type StateMachineState,
  type StateGraphDefinition,
  type EventName,
  type StateNodeId,
} from '@/lib/api/aiteam-state-machine';
import {
  CheckCircle,
  XCircle,
  PauseCircle,
  AlertTriangle,
  ChevronRight,
  RotateCcw,
  MessageSquare,
  SkipBack,
  Play,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// ============================================================
// 类型
// ============================================================

export interface AiteamStateGraphViewProps {
  /** 状态机 Session ID */
  sessionId: string;
  /** 当前用户 ID（用于初始请求） */
  userId?: string;
  /** 节点操作回调 */
  onNodeAction?: (nodeId: string, action: EventName) => void;
  /** Checkpoint 恢复回调 */
  onCheckpointRestore?: (checkpointId: string) => void;
  /** 状态变更回调 */
  onStateChange?: (state: StateMachineState) => void;
  /** 自动刷新间隔（ms），默认 5000 */
  refreshInterval?: number;
  /** 是否禁用操作（只读模式） */
  readOnly?: boolean;
}

// ============================================================
// 辅助函数
// ============================================================

function getWizardStepStatus(
  nodeStatus: string,
  currentNodeId: string,
  nodeId: string
): 'pending' | 'active' | 'completed' | 'error' | 'skipped' {
  if (nodeStatus === 'failed') return 'error';
  if (nodeStatus === 'completed') return 'completed';
  if (nodeId === currentNodeId) return 'active';
  // 简单推断：如果 history 中包含该节点，视为 completed
  return 'pending';
}

function getNodeIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4" />;
    case 'failed':
      return <XCircle className="h-4 w-4" />;
    case 'paused':
      return <PauseCircle className="h-4 w-4" />;
    default:
      return undefined;
  }
}

// ============================================================
// 组件
// ============================================================

export default function AiteamStateGraphView({
  sessionId,
  userId,
  onNodeAction,
  onCheckpointRestore,
  onStateChange,
  refreshInterval = 5000,
  readOnly = false,
}: AiteamStateGraphViewProps) {
  const [graph, setGraph] = useState<StateGraphDefinition | null>(null);
  const [state, setState] = useState<StateMachineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    getStateMachineGraph()
      .then((data) => {
        setGraph(data);
        setError(null);
      })
      .catch((err) => {
        setError('重试失败: ' + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 加载图定义
  useEffect(() => {
    let cancelled = false;
    getStateMachineGraph()
      .then((data) => {
        if (!cancelled) setGraph(data);
      })
      .catch((err) => {
        if (!cancelled) setError('加载状态机定义失败: ' + err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 定时拉取状态
  useEffect(() => {
    if (!sessionId) return;

    const fetchState = () => {
      getStateMachineState(sessionId)
        .then((data) => {
          setState(data);
          setError(null);
          onStateChange?.(data);
        })
        .catch((err) => {
          setError('获取状态失败: ' + err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    };

    fetchState();
    const interval = setInterval(fetchState, refreshInterval);
    return () => clearInterval(interval);
  }, [sessionId, refreshInterval, onStateChange]);

  // 处理节点操作
  const handleAction = useCallback(
    async (action: EventName) => {
      if (!state || readOnly) return;

      setActionLoading(true);
      try {
        const result = await triggerStateMachineEvent(sessionId, { type: action });
        setState(result.state);
        onNodeAction?.(result.toNode, action);
      } catch (err: any) {
        setError('操作失败: ' + err.message);
      } finally {
        setActionLoading(false);
      }
    },
    [state, sessionId, readOnly, onNodeAction]
  );

  // 将后端节点转换为 StateGraphVisualizer 格式
  const visualizerNodes: StateGraphNode[] = (graph?.nodes || []).map((n) => ({
    id: n.id,
    label: n.label,
    description: n.description,
    status: getWizardStepStatus(
      state?.status || 'active',
      state?.currentNode || '',
      n.id
    ),
    group: n.group,
    layer: n.layer,
    errorMessage:
      state?.lastError && n.id === state?.currentNode ? state.lastError : undefined,
  }));

  const visualizerEdges: StateGraphEdge[] = (graph?.edges || []).map((e) => ({
    from: e.from,
    to: e.to,
    label: e.condition.type === 'on_data' ? e.condition.expression : undefined,
    type: e.condition.type === 'always' ? 'primary' : 'conditional',
  }));

  // 当前节点信息
  const currentNode = graph?.nodes.find((n) => n.id === state?.currentNode);
  const requiresApproval = currentNode?.requiresHumanApproval;

  if (loading && !graph) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">加载状态机...</span>
      </div>
    );
  }

  if (error && !graph) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive mb-2">{error}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-md bg-destructive/20 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/30 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 顶部状态栏 */}
      {state && (
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                state.status === 'completed'
                  ? 'bg-green-500'
                  : state.status === 'failed'
                    ? 'bg-red-500'
                    : state.status === 'paused'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500 animate-pulse'
              }`}
            />
            <span className="text-sm font-medium">
              {state.status === 'completed'
                ? '已完成'
                : state.status === 'failed'
                  ? '失败'
                  : state.status === 'paused'
                    ? '已暂停'
                    : '进行中'}
            </span>
            {state.currentNode && (
              <span className="text-sm text-muted-foreground">
                当前节点: {currentNode?.label || state.currentNode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">进度</span>
            <div className="h-2 w-24 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <span className="text-xs font-medium">{state.progress}%</span>
          </div>
        </div>
      )}

      {/* 状态机图可视化 */}
      {graph && (
        <StateGraphVisualizer
          nodes={visualizerNodes}
          edges={visualizerEdges}
        />
      )}

      {/* 当前节点操作面板 */}
      {state && state.status === 'active' && !readOnly && (
        <div className="rounded-lg border bg-card p-4">
          <h4 className="mb-3 text-sm font-semibold">
            {requiresApproval ? '人工审批' : '节点操作'}
          </h4>

          <div className="flex flex-wrap gap-2">
            {requiresApproval && (
              <>
                <button
                  onClick={() => handleAction('APPROVE')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {actionLoading ? '处理中...' : '批准'}
                </button>
                <button
                  onClick={() => handleAction('REJECT')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {actionLoading ? '处理中...' : '拒绝'}
                </button>
              </>
            )}

            {!requiresApproval && (
              <button
                onClick={() => handleAction('PROCEED')}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {actionLoading ? '处理中...' : '继续'}
              </button>
            )}

            <button
              onClick={() => handleAction('CLARIFY')}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              <MessageSquare className="h-4 w-4" />
              请求澄清
            </button>

            <button
              onClick={() => handleAction('GO_BACK')}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              <SkipBack className="h-4 w-4" />
              回退
            </button>
          </div>

          {/* 错误提示 */}
          {state.lastError && (
            <div className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{state.lastError}</p>
            </div>
          )}
        </div>
      )}

      {/* 历史记录 */}
      {state && state.history.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h4 className="mb-3 text-sm font-semibold">历史记录</h4>
          <div className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {state.history
              .slice()
              .reverse()
              .map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <ChevronRight className="h-3 w-3" />
                  <span>
                    {h.from} → {h.to}
                  </span>
                  <span className="text-xs">({h.event})</span>
                  {h.message && <span className="text-xs italic">- {h.message}</span>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
