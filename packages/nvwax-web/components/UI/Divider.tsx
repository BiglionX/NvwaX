import React from 'react';

export interface DividerProps {
  /** 方向 */
  orientation?: 'horizontal' | 'vertical';
  /** 文本内容 */
  children?: React.ReactNode;
  /** 文本位置（仅水平方向） */
  textAlign?: 'left' | 'center' | 'right';
  /** 虚线样式 */
  dashed?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一分割线组件
 * 
 * @example
 * ```tsx
 * <Divider />
 * <Divider>或</Divider>
 * <Divider orientation="vertical" />
 * <Divider dashed textAlign="left">左侧文本</Divider>
 * ```
 */
export default function Divider({
  orientation = 'horizontal',
  children,
  textAlign = 'center',
  dashed = false,
  className = '',
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        className={`
          inline-block h-6 w-px
          bg-gray-200 dark:bg-gray-700
          mx-2
          ${className}
        `}
      />
    );
  }

  // 水平方向
  if (!children) {
    return (
      <div
        className={`
          w-full border-t
          ${dashed ? 'border-dashed' : 'border-solid'}
          border-gray-200 dark:border-gray-700
          my-4
          ${className}
        `}
      />
    );
  }

  // 带文本的分割线
  const textAlignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div className={`flex items-center w-full my-4 ${textAlignClasses[textAlign]} ${className}`}>
      {/* 左侧线条 */}
      <div
        className={`
          flex-1 border-t
          ${dashed ? 'border-dashed' : 'border-solid'}
          border-gray-200 dark:border-gray-700
        `}
      />

      {/* 文本 */}
      <span className="px-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {children}
      </span>

      {/* 右侧线条 */}
      <div
        className={`
          flex-1 border-t
          ${dashed ? 'border-dashed' : 'border-solid'}
          border-gray-200 dark:border-gray-700
        `}
      />
    </div>
  );
}
