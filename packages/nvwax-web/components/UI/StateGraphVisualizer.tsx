'use client';

import React, { useMemo } from 'react';
import {
  Check,
  AlertCircle,
  Circle,
  Loader2,
  Pause,
  SkipForward,
  GitBranch,
} from 'lucide-react';
import type { WizardStepStatus } from './WizardStepper';

/**
 * 状态机节点定义
 */
export interface StateGraphNode {
  id: string;
  label: string;
  description?: string;
  status: WizardStepStatus;
  /** 节点层级（用于垂直分层布局） */
  layer?: number;
  /** 节点分组（用于颜色编码） */
  group?: 'main' | 'auxiliary' | 'terminal';
  /** 错误信息 */
  errorMessage?: string;
}

/**
 * 状态机边定义
 */
export interface StateGraphEdge {
  from: string;
  to: string;
  /** 边的标签（如条件表达式） */
  label?: string;
  /** 边的样式 */
  type?: 'primary' | 'secondary' | 'conditional';
}

/**
 * 预定义布局：v2.2.0 CreationStateMachine 节点
 */
export const DEFAULT_STATE_MACHINE_NODES: StateGraphNode[] = [
  // 主流程
  { id: 'requirements_gathering', label: '需求收集', status: 'completed', layer: 0, group: 'main' },
  { id: 'team_design', label: '团队设计', status: 'active', layer: 0, group: 'main' },
  { id: 'agent_matching', label: 'Agent 匹配', status: 'pending', layer: 0, group: 'main' },
  { id: 'skill_matching', label: 'Skill 匹配', status: 'pending', layer: 0, group: 'main' },
  { id: 'ceo_generation', label: 'CEO 生成', status: 'pending', layer: 0, group: 'main' },
  { id: 'document_generation', label: '文档生成', status: 'pending', layer: 0, group: 'main' },
  { id: 'human_review', label: '人工审核', status: 'pending', layer: 0, group: 'main' },
  { id: 'confirm', label: '确认', status: 'pending', layer: 0, group: 'main' },
  // 辅助节点
  { id: 'clarify', label: '需求澄清', status: 'pending', layer: 1, group: 'auxiliary' },
  { id: 'revise_design', label: '修订设计', status: 'pending', layer: 1, group: 'auxiliary' },
  { id: 'create_agent_guide', label: '创建 Agent', status: 'pending', layer: 1, group: 'auxiliary' },
  // 终态
  { id: 'complete', label: '完成', status: 'pending', layer: 0, group: 'terminal' },
  { id: 'failed', label: '失败', status: 'pending', layer: 0, group: 'terminal' },
];

/**
 * 预定义边
 */
export const DEFAULT_STATE_MACHINE_EDGES: StateGraphEdge[] = [
  { from: 'requirements_gathering', to: 'team_design', type: 'primary' },
  { from: 'requirements_gathering', to: 'clarify', label: 'confidence<0.8', type: 'conditional' },
  { from: 'clarify', to: 'requirements_gathering', type: 'secondary' },
  { from: 'team_design', to: 'agent_matching', type: 'primary' },
  { from: 'team_design', to: 'revise_design', label: 'on_rejection', type: 'conditional' },
  { from: 'revise_design', to: 'team_design', type: 'secondary' },
  { from: 'agent_matching', to: 'skill_matching', type: 'primary' },
  { from: 'agent_matching', to: 'create_agent_guide', label: '无匹配', type: 'conditional' },
  { from: 'create_agent_guide', to: 'skill_matching', type: 'secondary' },
  { from: 'skill_matching', to: 'ceo_generation', type: 'primary' },
  { from: 'ceo_generation', to: 'document_generation', type: 'primary' },
  { from: 'document_generation', to: 'human_review', type: 'primary' },
  { from: 'human_review', to: 'confirm', type: 'primary' },
  { from: 'human_review', to: 'revise_design', label: 'on_rejection', type: 'conditional' },
  { from: 'confirm', to: 'complete', type: 'primary' },
];

export interface StateGraphVisualizerProps {
  /** 节点列表（默认使用预定义的 v2.2.0 节点） */
  nodes?: StateGraphNode[];
  /** 边列表 */
  edges?: StateGraphEdge[];
  /** 当前活跃节点 ID（高亮） */
  activeNodeId?: string;
  /** 节点点击回调 */
  onNodeClick?: (node: StateGraphNode) => void;
  /** 显示图例 */
  showLegend?: boolean;
  /** 紧凑模式（用于弹窗或侧边栏） */
  compact?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 标题 */
  title?: string;
  /** 视图模式：horizontal（水平流程图） / layered（分层布局） */
  viewMode?: 'horizontal' | 'layered';
}

/**
 * 节点样式映射
 */
const NODE_STYLES: Record<WizardStepStatus, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  iconColor: string;
  ring: string;
}> = {
  pending: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-500 dark:text-gray-400',
    iconBg: 'bg-gray-200 dark:bg-gray-700',
    iconColor: 'text-gray-400 dark:text-gray-500',
    ring: '',
  },
  active: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-500 dark:border-blue-400',
    text: 'text-blue-700 dark:text-blue-300',
    iconBg: 'bg-blue-600',
    iconColor: 'text-white',
    ring: 'ring-4 ring-blue-200 dark:ring-blue-900/50',
  },
  completed: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-500 dark:border-green-600',
    text: 'text-green-700 dark:text-green-300',
    iconBg: 'bg-green-500',
    iconColor: 'text-white',
    ring: '',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-500 dark:border-red-600',
    text: 'text-red-700 dark:text-red-300',
    iconBg: 'bg-red-500',
    iconColor: 'text-white',
    ring: 'ring-4 ring-red-200 dark:ring-red-900/50',
  },
  skipped: {
    bg: 'bg-gray-50 dark:bg-gray-800/30',
    border: 'border-gray-300 dark:border-gray-600 border-dashed',
    text: 'text-gray-400 dark:text-gray-500',
    iconBg: 'bg-gray-300 dark:bg-gray-600',
    iconColor: 'text-gray-500',
    ring: '',
  },
};

/**
 * 节点图标
 */
function getNodeIcon(status: WizardStepStatus, size = 16) {
  switch (status) {
    case 'completed':
      return <Check size={size} />;
    case 'active':
      return <Loader2 size={size} className="animate-spin" />;
    case 'error':
      return <AlertCircle size={size} />;
    case 'skipped':
      return <SkipForward size={size} />;
    default:
      return <Circle size={size} />;
  }
}

/**
 * StateGraphVisualizer - 状态机可视化组件
 *
 * 灵感来自 LangGraph Studio，展示 CreationStateMachine 的节点和边。
 * 支持水平流程图和分层布局两种视图。
 *
 * @example
 * ```tsx
 * <StateGraphVisualizer
 *   activeNodeId="team_design"
 *   onNodeClick={(node) => console.log('clicked', node.id)}
 * />
 * ```
 */
export default function StateGraphVisualizer({
  nodes = DEFAULT_STATE_MACHINE_NODES,
  edges = DEFAULT_STATE_MACHINE_EDGES,
  activeNodeId,
  onNodeClick,
  showLegend = true,
  compact = false,
  className = '',
  title = '状态机视图',
  viewMode = 'horizontal',
}: StateGraphVisualizerProps) {
  /**
   * 根据 activeNodeId 推断所有节点状态
   */
  const processedNodes = useMemo(() => {
    return nodes.map(node => {
      // 如果显式传入了 activeNodeId，强制该节点为 active
      if (activeNodeId && node.id === activeNodeId) {
        return { ...node, status: 'active' as WizardStepStatus };
      }
      return node;
    });
  }, [nodes, activeNodeId]);

  /**
   * 获取节点位置（水平模式）
   */
  const getHorizontalNodePosition = (index: number, total: number) => {
    return `${(index / Math.max(total - 1, 1)) * 100}%`;
  };

  /**
   * 渲染水平流程图
   */
  const renderHorizontalView = () => {
    const mainNodes = processedNodes.filter(n => n.group === 'main' || n.group === 'terminal');
    const auxNodes = processedNodes.filter(n => n.group === 'auxiliary');

    return (
      <div className="space-y-6">
        {/* 主流程 */}
        <div className="relative">
          {/* 节点 */}
          <div className="flex items-center justify-between relative z-10">
            {mainNodes.map((node, index) => {
              const style = NODE_STYLES[node.status];
              return (
                <button
                  key={node.id}
                  onClick={() => onNodeClick?.(node)}
                  disabled={!onNodeClick}
                  className={`
                    group flex flex-col items-center gap-2
                    ${onNodeClick ? 'cursor-pointer' : 'cursor-default'}
                    transition-transform hover:scale-105
                  `}
                  aria-label={`节点 ${node.label}`}
                  aria-current={node.id === activeNodeId ? 'step' : undefined}
                >
                  {/* 图标圆圈 */}
                  <div
                    className={`
                      ${compact ? 'w-9 h-9' : 'w-11 h-11'}
                      rounded-full border-2 ${style.border} ${style.iconBg} ${style.iconColor}
                      flex items-center justify-center
                      ${style.ring}
                      transition-all
                    `}
                  >
                    {getNodeIcon(node.status, compact ? 16 : 18)}
                  </div>
                  {/* 标签 */}
                  <div className="text-center">
                    <div className={`text-xs font-medium ${style.text}`}>{node.label}</div>
                    {!compact && node.description && (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-[80px]">
                        {node.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {/* 连接线 */}
          <svg
            className="absolute top-0 left-0 w-full h-12 pointer-events-none z-0"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            {mainNodes.slice(0, -1).map((node, index) => {
              const x1 = getHorizontalNodePosition(index, mainNodes.length);
              const x2 = getHorizontalNodePosition(index + 1, mainNodes.length);
              const style = NODE_STYLES[node.status];
              const nextStyle = NODE_STYLES[mainNodes[index + 1].status];
              const isCompleted = style.bg.includes('green') || nextStyle.bg.includes('green');
              return (
                <line
                  key={`line-${node.id}-${mainNodes[index + 1].id}`}
                  x1={x1}
                  y1="50"
                  x2={x2}
                  y2="50"
                  stroke={isCompleted ? '#10b981' : '#d1d5db'}
                  strokeWidth="2"
                  strokeDasharray="2,2"
                />
              );
            })}
          </svg>
        </div>

        {/* 辅助节点分支 */}
        {auxNodes.length > 0 && (
          <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
              <GitBranch size={12} />
              辅助分支
            </div>
            <div className="flex flex-wrap gap-2">
              {auxNodes.map(node => {
                const style = NODE_STYLES[node.status];
                return (
                  <button
                    key={node.id}
                    onClick={() => onNodeClick?.(node)}
                    disabled={!onNodeClick}
                    className={`
                      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                      border ${style.border} ${style.bg} ${style.text}
                      text-xs
                      ${onNodeClick ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'}
                      transition-all
                    `}
                  >
                    {getNodeIcon(node.status, 12)}
                    <span>{node.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * 渲染分层布局（节点按 layer 分组）
   */
  const renderLayeredView = () => {
    const layers: Record<number, StateGraphNode[]> = {};
    processedNodes.forEach(node => {
      const layer = node.layer ?? 0;
      if (!layers[layer]) layers[layer] = [];
      layers[layer].push(node);
    });

    return (
      <div className="space-y-4">
        {Object.entries(layers).map(([layer, layerNodes]) => (
          <div key={layer} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
              Layer {layer} {layer === '0' ? '· 主流程' : '· 辅助'}
            </div>
            <div className="flex flex-wrap gap-2">
              {layerNodes.map(node => {
                const style = NODE_STYLES[node.status];
                return (
                  <button
                    key={node.id}
                    onClick={() => onNodeClick?.(node)}
                    disabled={!onNodeClick}
                    className={`
                      inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
                      border ${style.border} ${style.bg} ${style.text}
                      text-xs font-medium
                      ${style.ring}
                      ${onNodeClick ? 'cursor-pointer hover:shadow-md' : 'cursor-default'}
                      transition-all
                    `}
                  >
                    {getNodeIcon(node.status, 12)}
                    <span>{node.label}</span>
                    {node.errorMessage && (
                      <AlertCircle size={10} className="text-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 ${className}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <GitBranch size={16} className="text-blue-600 dark:text-blue-400" />
          {title}
        </h3>
        {showLegend && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <LegendDot status="completed" />
            <LegendDot status="active" />
            <LegendDot status="error" />
            <LegendDot status="pending" />
          </div>
        )}
      </div>

      {/* 主视图 */}
      {viewMode === 'horizontal' ? renderHorizontalView() : renderLayeredView()}

      {/* 当前节点信息 */}
      {activeNodeId && (
        <CurrentNodeInfo
          node={processedNodes.find(n => n.id === activeNodeId)}
          edges={edges.filter(e => e.from === activeNodeId || e.to === activeNodeId)}
        />
      )}
    </div>
  );
}

/**
 * 图例小圆点
 */
function LegendDot({ status }: { status: WizardStepStatus }) {
  const colors: Record<WizardStepStatus, string> = {
    pending: 'bg-gray-300 dark:bg-gray-600',
    active: 'bg-blue-600',
    completed: 'bg-green-500',
    error: 'bg-red-500',
    skipped: 'bg-gray-400 dark:bg-gray-500',
  };
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className="text-[10px]">{status === 'active' ? '进行中' : status === 'completed' ? '完成' : status === 'error' ? '错误' : status === 'skipped' ? '跳过' : '待办'}</span>
    </div>
  );
}

/**
 * 当前节点信息卡片
 */
function CurrentNodeInfo({ node, edges }: { node?: StateGraphNode; edges: StateGraphEdge[] }) {
  if (!node) return null;
  const style = NODE_STYLES[node.status];

  return (
    <div className={`mt-4 p-3 rounded-lg border ${style.border} ${style.bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <Pause size={12} className={style.text} />
        <span className={`text-xs font-semibold ${style.text}`}>
          当前节点: {node.label}
        </span>
      </div>
      {node.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400">{node.description}</p>
      )}
      {node.errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">⚠️ {node.errorMessage}</p>
      )}
      {edges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">可转换到:</span>
          {edges.map(edge => (
            <span
              key={`${edge.from}-${edge.to}`}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
            >
              → {edge.to}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
