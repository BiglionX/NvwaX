import React from 'react';

export interface SkeletonProps {
  /** 骨架屏类型 */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** 宽度 */
  width?: string | number;
  /** 高度 */
  height?: string | number;
  /** 是否动画 */
  animated?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一骨架屏组件
 * 
 * @example
 * ```tsx
 * // 文本骨架屏
 * <Skeleton variant="text" />
 * 
 * // 圆形头像骨架屏
 * <Skeleton variant="circular" width={40} height={40} />
 * 
 * // 矩形卡片骨架屏
 * <Skeleton variant="rectangular" width="100%" height={200} />
 * 
 * // 圆角骨架屏
 * <Skeleton variant="rounded" width="100%" height={100} />
 * ```
 */
export default function Skeleton({
  variant = 'text',
  width,
  height,
  animated = true,
  className = '',
}: SkeletonProps) {
  // 变体样式
  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };
  
  // 默认尺寸
  const defaultSizes = {
    text: { width: '100%', height: '1rem' },
    circular: { width: '2.5rem', height: '2.5rem' },
    rectangular: { width: '100%', height: '8rem' },
    rounded: { width: '100%', height: '4rem' },
  };
  
  const size = defaultSizes[variant];
  
  return (
    <div
      className={`
        bg-gray-200 dark:bg-gray-700
        ${variants[variant]}
        ${animated ? 'animate-pulse' : ''}
        ${className}
      `}
      style={{
        width: width ?? size.width,
        height: height ?? size.height,
      }}
    />
  );
}

/**
 * 复合骨架屏组件 - 用于常见布局场景
 */
export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 space-y-4">
      {/* 标题 */}
      <Skeleton variant="text" height="1.5rem" />
      
      {/* 描述 */}
      <div className="space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
      </div>
      
      {/* 底部操作区 */}
      <div className="flex gap-3 pt-2">
        <Skeleton variant="rounded" width="100px" height="40px" />
        <Skeleton variant="rounded" width="100px" height="40px" />
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
          {/* 头像 */}
          <Skeleton variant="circular" width={48} height={48} />
          
          {/* 内容 */}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" height="1rem" />
            <Skeleton variant="text" width="40%" height="0.875rem" />
          </div>
          
          {/* 操作按钮 */}
          <Skeleton variant="rounded" width="80px" height="36px" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* 表头 */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant="text" width="80px" height="1rem" />
        ))}
      </div>
      
      {/* 表格行 */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 px-6 py-4">
            {[...Array(4)].map((_, j) => (
              <Skeleton key={j} variant="text" height="1rem" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
