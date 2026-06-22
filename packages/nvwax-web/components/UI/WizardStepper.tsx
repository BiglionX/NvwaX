'use client';

import React from 'react';
import { Check, AlertCircle, SkipForward, Loader2, Circle } from 'lucide-react';

/**
 * 步骤状态（与 v2.2.0 CreationStateMachine 对齐）
 */
export type WizardStepStatus =
  | 'pending'    // 待开始
  | 'active'     // 进行中
  | 'completed'  // 已完成
  | 'error'      // 失败
  | 'skipped';   // 跳过

export interface WizardStep {
  /** 步骤 ID（用于事件回调）*/
  id: string;
  /** 步骤标题 */
  title: string;
  /** 步骤描述（可选）*/
  description?: string;
  /** 步骤状态 */
  status: WizardStepStatus;
  /** 错误信息（status='error' 时显示）*/
  errorMessage?: string;
  /** 步骤图标（可选，覆盖默认图标）*/
  icon?: React.ReactNode;
  /** 是否可点击（默认：completed 状态可点击用于导航回退）*/
  clickable?: boolean;
  /** 是否可选（true 时显示跳过按钮）*/
  optional?: boolean;
}

export interface WizardStepperProps {
  /** 步骤列表 */
  steps: WizardStep[];
  /** 当前活跃步骤 ID（不传则按 status='active' 自动判断）*/
  currentStepId?: string;
  /** 步骤点击回调 */
  onStepClick?: (step: WizardStep, index: number) => void;
  /** 跳过步骤回调 */
  onSkipStep?: (step: WizardStep, index: number) => void;
  /** 步骤方向 */
  direction?: 'horizontal' | 'vertical';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示描述 */
  showDescription?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 加载态 */
  loading?: boolean;
  /** 加载文案 */
  loadingText?: string;
}

/**
 * WizardStepper - 增强版向导步骤指示器
 *
 * 与 v2.2.0 状态机深度集成：
 * - 5 种步骤状态（pending/active/completed/error/skipped）
 * - 支持点击回退到已完成步骤
 * - 支持可选步骤的跳过
 * - 支持错误状态可视化
 *
 * @example
 * ```tsx
 * <WizardStepper
 *   steps={[
 *     { id: 'identity', title: '身份', status: 'completed' },
 *     { id: 'capability', title: '能力', status: 'active' },
 *     { id: 'test', title: '测试', status: 'pending' },
 *   ]}
 *   onStepClick={(step) => console.log('navigate to', step.id)}
 * />
 * ```
 */
export default function WizardStepper({
  steps,
  currentStepId,
  onStepClick,
  onSkipStep,
  direction = 'horizontal',
  size = 'md',
  showDescription = true,
  className = '',
  loading = false,
  loadingText = '处理中...',
}: WizardStepperProps) {
  // 尺寸配置
  const sizes = {
    sm: { circle: 'w-8 h-8', fontSize: 'text-xs', titleSize: 'text-sm', descSize: 'text-xs' },
    md: { circle: 'w-10 h-10', fontSize: 'text-sm', titleSize: 'text-base', descSize: 'text-sm' },
    lg: { circle: 'w-12 h-12', fontSize: 'text-base', titleSize: 'text-lg', descSize: 'text-base' },
  };
  const s = sizes[size];

  /**
   * 根据状态获取圆圈样式
   */
  const getCircleStyle = (status: WizardStepStatus): string => {
    const base = `${s.circle} rounded-full flex items-center justify-center font-semibold transition-all duration-300 relative z-10`;
    switch (status) {
      case 'completed':
        return `${base} bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200/50 dark:shadow-green-900/30`;
      case 'active':
        return `${base} bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 ring-4 ring-blue-100 dark:ring-blue-900/30`;
      case 'error':
        return `${base} bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-200/50 dark:shadow-red-900/30 ring-4 ring-red-100 dark:ring-red-900/30`;
      case 'skipped':
        return `${base} bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-400 dark:border-gray-500`;
      default: // pending
        return `${base} bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500`;
    }
  };

  /**
   * 根据状态获取步骤图标
   */
  const getStepIcon = (step: WizardStep, index: number) => {
    if (step.icon) return step.icon;
    if (loading && step.status === 'active') {
      return <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />;
    }
    switch (step.status) {
      case 'completed':
        return <Check size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />;
      case 'error':
        return <AlertCircle size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />;
      case 'skipped':
        return <SkipForward size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />;
      case 'active':
        return <span>{index + 1}</span>;
      default:
        return <Circle size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} />;
    }
  };

  /**
   * 根据状态获取连接线样式
   */
  const getLineStyle = (prev: WizardStepStatus, curr: WizardStepStatus): string => {
    if (prev === 'completed' && curr !== 'pending') {
      return 'bg-gradient-to-r from-green-500 to-blue-500';
    }
    if (prev === 'completed') return 'bg-green-500';
    if (prev === 'skipped' || curr === 'skipped') return 'bg-gray-300 dark:bg-gray-600';
    return 'bg-gray-200 dark:bg-gray-700';
  };

  /**
   * 标题文字颜色
   */
  const getTitleStyle = (status: WizardStepStatus): string => {
    if (status === 'error') return 'text-red-600 dark:text-red-400 font-semibold';
    if (status === 'active') return 'text-blue-600 dark:text-blue-400 font-semibold';
    if (status === 'completed') return 'text-gray-900 dark:text-white font-semibold';
    if (status === 'skipped') return 'text-gray-400 dark:text-gray-500 line-through';
    return 'text-gray-400 dark:text-gray-500';
  };

  /**
   * 是否可点击
   */
  const isClickable = (step: WizardStep): boolean => {
    if (step.clickable !== undefined) return step.clickable;
    // 默认：已完成、错误、可跳过的步骤可点击
    return step.status === 'completed' || step.status === 'error' || step.status === 'skipped';
  };

  /**
   * 渲染单个步骤
   */
  const renderStep = (step: WizardStep, index: number) => {
    const isLast = index === steps.length - 1;
    const clickable = isClickable(step);
    const showSkipButton = step.optional && step.status === 'pending' && onSkipStep;

    return (
      <div key={step.id} className={`flex-1 flex items-start ${direction === 'vertical' ? 'flex-col' : ''}`}>
        <div
          className={`flex ${direction === 'vertical' ? 'flex-row' : 'flex-col'} items-center flex-1 ${
            clickable ? 'cursor-pointer' : ''
          }`}
          onClick={() => clickable && onStepClick?.(step, index)}
          role={clickable ? 'button' : undefined}
          tabIndex={clickable ? 0 : undefined}
          onKeyDown={(e) => {
            if (clickable && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onStepClick?.(step, index);
            }
          }}
          aria-label={`步骤 ${index + 1}: ${step.title}`}
        >
          {/* 圆圈 */}
          <div className={getCircleStyle(step.status)}>{getStepIcon(step, index)}</div>

          {/* 标题和描述 */}
          <div className={`${direction === 'vertical' ? 'ml-4 flex-1' : 'mt-3 text-center'}`}>
            <h4 className={`${s.titleSize} ${getTitleStyle(step.status)}`}>
              {step.title}
              {step.optional && (
                <span className="ml-1 text-xs text-gray-400 font-normal">(可选)</span>
              )}
            </h4>
            {showDescription && step.description && (
              <p className={`mt-1 ${s.descSize} text-gray-500 dark:text-gray-400`}>
                {step.description}
              </p>
            )}
            {step.status === 'error' && step.errorMessage && (
              <p className={`mt-1 ${s.descSize} text-red-500 dark:text-red-400`}>
                {step.errorMessage}
              </p>
            )}
            {showSkipButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSkipStep?.(step, index);
                }}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
              >
                跳过此步
              </button>
            )}
          </div>
        </div>

        {/* 连接线（水平方向）*/}
        {!isLast && direction === 'horizontal' && (
          <div className="flex-1 flex items-center pt-5">
            <div className={`h-0.5 w-full ${getLineStyle(step.status, steps[index + 1].status)}`} />
          </div>
        )}

        {/* 连接线（垂直方向）*/}
        {!isLast && direction === 'vertical' && (
          <div className="ml-5 h-8 w-0.5">
            <div className={`h-full w-full ${getLineStyle(step.status, steps[index + 1].status)}`} />
          </div>
        )}
      </div>
    );
  };

  // 加载覆盖层
  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Loader2 className="animate-spin" size={20} />
            <span className="font-medium">{loadingText}</span>
          </div>
        </div>
        {/* 渲染基础结构 */}
        <div className={direction === 'vertical' ? 'space-y-0' : 'flex items-start'}>
          {steps.map((step, i) => renderStep(step, i))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${direction === 'vertical' ? 'space-y-0' : 'flex items-start'} ${className}`}
      role="navigation"
      aria-label="向导步骤"
    >
      {steps.map((step, i) => renderStep(step, i))}
    </div>
  );
}
