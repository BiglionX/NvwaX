import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export interface ErrorStateProps {
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 错误对象或消息 */
  error?: unknown;
  /** 重试回调 */
  onRetry?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 统一错误/失败状态组件（含可选重试按钮）
 *
 * @example
 * ```tsx
 * <ErrorState error={error} onRetry={() => refetch()} />
 * ```
 */
export default function ErrorState({
  title = '数据加载失败',
  description = '暂时无法获取数据，请检查网络后重试',
  error,
  onRetry,
  className = '',
}: ErrorStateProps) {
  const errorMsg = error instanceof Error ? error.message : (typeof error === 'string' ? error : null);

  return (
    <div className={`text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-red-200 dark:border-red-900/50 ${className}`}>
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
        <AlertTriangle size={26} className="text-red-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 max-w-md mx-auto">
        {description}
      </p>
      {errorMsg && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-5 font-mono" title={errorMsg}>
          {errorMsg.length > 80 ? errorMsg.slice(0, 80) + '…' : errorMsg}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" icon={<RefreshCw size={16} />}>
          重试
        </Button>
      )}
    </div>
  );
}