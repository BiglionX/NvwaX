'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import React from 'react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'onDrag'> {
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 加载状态 */
  loading?: boolean;
  /** 左侧图标 */
  icon?: React.ReactNode;
  /** 右侧图标 */
  rightIcon?: React.ReactNode;
  /** 是否全宽 */
  fullWidth?: boolean;
  /** 是否作为子元素渲染（用于与 Link 等组件配合） */
  asChild?: boolean;
  /** 按钮内容 */
  children?: React.ReactNode;
}

/**
 * NvwaX 统一按钮组件
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="md">
 *   点击我
 * </Button>
 * 
 * <Button variant="outline" icon={<Search />} loading={isLoading}>
 *   搜索
 * </Button>
 * ```
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  rightIcon,
  fullWidth = false,
  asChild = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  // 基础样式
  const baseStyles = 'font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20';
  
  // 变体样式
  const variants = {
    primary: 'bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-300/50 dark:hover:shadow-blue-900/50 active:scale-[0.98]',
    
    secondary: 'bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-300/50 dark:hover:shadow-blue-900/50 active:scale-[0.98]',
    
    outline: 'border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 active:scale-[0.98]',
    
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white active:scale-[0.98]',
    
    danger: 'bg-linear-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-200/50 dark:shadow-red-900/30 hover:shadow-xl hover:shadow-red-300/50 dark:hover:shadow-red-900/50 active:scale-[0.98]',
  };
  
  // 尺寸样式
  const sizes = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-4 text-lg gap-2.5',
  };
  
  // 宽度样式
  const widthStyle = fullWidth ? 'w-full' : '';
  
  // 如果 asChild 为 true，则渲染子元素并传递按钮的样式和行为
  if (asChild) {
    const childElement = React.Children.only(children);
    return React.cloneElement(
      childElement as React.ReactElement<{ className?: string; disabled?: boolean }>,
      {
        className: `
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${widthStyle}
          ${className}
        `,
        disabled: disabled || loading,
        ...props,
      }
    );
  }
  
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${widthStyle}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {/* 加载状态 */}
      {loading ? (
        <>
          <Loader2 size={size === 'sm' ? 14 : size === 'md' ? 18 : 22} className="animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {/* 左侧图标 */}
          {icon && <span className="shrink-0">{icon}</span>}
          
          {/* 按钮文本 */}
          <span>{children}</span>
          
          {/* 右侧图标 */}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
}
