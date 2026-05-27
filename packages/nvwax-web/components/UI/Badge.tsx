import React from 'react';

export interface BadgeProps {
  /** 徽章文本 */
  children: React.ReactNode;
  /** 徽章变体 */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否可关闭 */
  closable?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一徽章组件
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <Badge>新</Badge>
 * 
 * // 不同变体
 * <Badge variant="success">成功</Badge>
 * <Badge variant="warning">警告</Badge>
 * 
 * // 可关闭
 * <Badge closable onClose={() => console.log('closed')}>
 *   可关闭
 * </Badge>
 * ```
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  closable = false,
  onClose,
  className = '',
}: BadgeProps) {
  // 变体样式
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    primary: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    warning: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  };
  
  // 尺寸样式
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };
  
  return (
    <span className={`
      inline-flex items-center gap-1
      font-medium rounded-md
      ${variants[variant]}
      ${sizes[size]}
      ${className}
    `}>
      {children}
      
      {/* 关闭按钮 */}
      {closable && (
        <button
          onClick={onClose}
          className="ml-1 hover:opacity-70 transition-opacity focus:outline-none"
          aria-label="关闭"
        >
          <svg 
            className="w-3 h-3" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      )}
    </span>
  );
}
