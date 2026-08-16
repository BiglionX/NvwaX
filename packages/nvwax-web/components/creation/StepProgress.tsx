'use client';

import { Check, AlertCircle, Loader2 } from 'lucide-react';

/**
 * 统一创建进度步骤组件
 *
 * 供 Agent（对话式向导）与 AiTeam（会话式向导）共用，
 * 视觉语言统一：圆形数字 + 竖线连接 + 总体进度条。
 */

export interface StepItem {
  stepNumber: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
}

interface StepProgressProps {
  steps: StepItem[];
  percentage: number;
  /** 进度卡标题（默认不显示） */
  title?: string;
  /** 等待开始文案 */
  waitingLabel?: string;
  /** 已完成文案 */
  completedLabel?: string;
  /** 处理中文案 */
  processingLabel?: string;
  /** 总体进度文案 */
  overallLabel?: string;
  className?: string;
}

export default function StepProgress({
  steps,
  percentage,
  title,
  waitingLabel = '等待开始',
  completedLabel = '已完成',
  processingLabel = '处理中...',
  overallLabel = '总体进度',
  className = '',
}: StepProgressProps) {
  return (
    <div className={className}>
      {title && (
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <Loader2
              className={`w-4 h-4 text-indigo-600 dark:text-indigo-400 ${percentage > 0 && percentage < 100 ? 'animate-spin' : ''}`}
            />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
      )}

      {/* 步骤列表 */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isDone = step.status === 'completed';
          const isActive = step.status === 'in_progress';
          const isFailed = step.status === 'failed';

          return (
            <div key={step.stepNumber} className="flex items-start gap-3 group">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 shadow-sm
                    ${isDone
                      ? 'bg-linear-to-br from-green-500 to-emerald-500 text-white scale-110'
                      : isActive
                        ? 'bg-linear-to-br from-blue-500 to-indigo-600 text-white animate-pulse scale-110'
                        : isFailed
                          ? 'bg-red-500 text-white shadow-sm shadow-red-500/30'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}
                  `}
                >
                  {isDone ? (
                    <Check size={15} strokeWidth={3} />
                  ) : isFailed ? (
                    <AlertCircle size={14} />
                  ) : (
                    step.stepNumber
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-0.5 h-10 transition-all duration-500 ${
                      isDone ? 'bg-linear-to-b from-green-500 to-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>

              <div className="flex-1 pt-1.5">
                <p
                  className={`text-sm font-semibold transition-colors duration-300 ${
                    isDone
                      ? 'text-green-600 dark:text-green-400'
                      : isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : isFailed
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-500'
                  }`}
                >
                  {step.name}
                </p>
                {step.message && step.message !== waitingLabel && step.message !== completedLabel && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{step.message}</p>
                )}
                {isActive && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="font-medium">{processingLabel}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 总体进度条 */}
      <div className="mt-6 pt-5 border-t border-gray-200/60 dark:border-gray-700/60">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span className="font-medium">{overallLabel}</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base tabular-nums">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-linear-to-r from-blue-500 via-indigo-500 to-blue-700 h-2 rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
