import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export interface EmptyStateProps {
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 图标（可选，默认使用 Inbox） */
  icon?: React.ReactNode;
  /** 操作按钮文本 */
  actionText?: string;
  /** 操作按钮点击事件 */
  onAction?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一空状态组件
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   title="暂无数据"
 *   description="这里还没有任何内容"
 *   actionText="创建第一个"
 *   onAction={() => console.log('create')}
 * />
 * ```
 */
export default function EmptyState({
  title,
  description,
  icon,
  actionText,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 ${className}`}>
      {/* 图标 */}
      <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
        {icon || <Inbox size={40} className="text-gray-400 dark:text-gray-500" />}
      </div>
      
      {/* 标题 */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      {/* 描述 */}
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      
      {/* 操作按钮 */}
      {actionText && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionText}
        </Button>
      )}
    </div>
  );
}
