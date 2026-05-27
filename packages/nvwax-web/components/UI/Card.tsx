import React from 'react';

export interface CardProps {
  /** 卡片变体 */
  variant?: 'default' | 'clickable' | 'highlighted';
  /** 是否带阴影 */
  shadow?: boolean;
  /** 内边距大小 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
  /** 点击事件（当 variant 为 clickable 时） */
  onClick?: () => void;
  /** 子元素 */
  children: React.ReactNode;
}

/**
 * NvwaX 统一卡片组件
 * 
 * @example
 * ```tsx
 * // 默认卡片
 * <Card padding="md">
 *   <h3>卡片标题</h3>
 *   <p>卡片内容</p>
 * </Card>
 * 
 * // 可点击卡片
 * <Card variant="clickable" onClick={() => console.log('clicked')}>
 *   <p>点击我</p>
 * </Card>
 * ```
 */
export default function Card({
  variant = 'default',
  shadow = true,
  padding = 'md',
  className = '',
  onClick,
  children,
}: CardProps) {
  // 基础样式
  const baseStyles = 'bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 transition-all duration-300';
  
  // 变体样式
  const variants = {
    default: '',
    clickable: 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30 active:scale-[0.98]',
    highlighted: 'border-blue-300 dark:border-blue-700 bg-linear-to-br from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20',
  };
  
  // 阴影样式
  const shadowStyle = shadow ? 'shadow-md' : '';
  
  // 内边距样式
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  // 合并类名
  const combinedClassName = `
    ${baseStyles}
    ${variants[variant]}
    ${shadowStyle}
    ${paddings[padding]}
    ${className}
  `.trim();
  
  // 如果是可点击的，使用 button 元素
  if (variant === 'clickable' && onClick) {
    return (
      <button
        className={combinedClassName}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    );
  }
  
  return (
    <div className={combinedClassName}>
      {children}
    </div>
  );
}
