import React from 'react';
import { X } from 'lucide-react';

export interface TagProps {
  /** 标签文本 */
  children: React.ReactNode;
  /** 变体 */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否可关闭 */
  closable?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
  /** 是否可选中 */
  selectable?: boolean;
  /** 是否选中 */
  selected?: boolean;
  /** 选择回调 */
  onSelect?: (selected: boolean) => void;
  /** 图标 */
  icon?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一标签组件
 * 
 * @example
 * ```tsx
 * <Tag variant="primary">主要</Tag>
 * <Tag closable onClose={() => console.log('closed')}>可关闭</Tag>
 * <Tag selectable selected={selected} onSelect={setSelected}>可选中标签</Tag>
 * ```
 */
export default function Tag({
  children,
  variant = 'default',
  size = 'md',
  closable = false,
  onClose,
  selectable = false,
  selected = false,
  onSelect,
  icon,
  className = '',
}: TagProps) {
  // 变体样式
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
    warning: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  };

  // 尺寸样式
  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(!selected);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose?.();
  };

  return (
    <span
      onClick={handleClick}
      className={`
        inline-flex items-center
        font-medium rounded-md border
        transition-all duration-200
        ${variants[variant]}
        ${sizes[size]}
        ${selectable ? 'cursor-pointer hover:shadow-md' : ''}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
        ${className}
      `}
    >
      {/* 图标 */}
      {icon && <span className="shrink-0">{icon}</span>}

      {/* 文本 */}
      <span>{children}</span>

      {/* 关闭按钮 */}
      {closable && (
        <button
          onClick={handleClose}
          className="ml-1 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors focus:outline-none"
          aria-label="关闭"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}
