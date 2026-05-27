import React from 'react';

export interface ProgressProps {
  /** 进度值（0-100） */
  value: number;
  /** 最大值（默认100） */
  max?: number;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 变体 */
  variant?: 'default' | 'success' | 'warning' | 'danger';
  /** 是否显示百分比文本 */
  showText?: boolean;
  /** 是否条纹动画 */
  striped?: boolean;
  /** 是否动画 */
  animated?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一进度条组件
 * 
 * @example
 * ```tsx
 * <Progress value={75} />
 * <Progress value={50} variant="success" showText />
 * <Progress value={30} striped animated />
 * ```
 */
export default function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showText = false,
  striped = false,
  animated = false,
  className = '',
}: ProgressProps) {
  // 计算百分比
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // 尺寸样式
  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };
  
  // 变体颜色
  const variants = {
    default: 'bg-linear-to-r from-blue-600 to-blue-700',
    success: 'bg-linear-to-r from-green-500 to-emerald-600',
    warning: 'bg-linear-to-r from-orange-500 to-amber-600',
    danger: 'bg-linear-to-r from-red-500 to-rose-600',
  };
  
  return (
    <div className={className}>
      {/* 进度条容器 */}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizes[size]}`}>
        {/* 进度条填充 */}
        <div
          className={`
            ${variants[variant]}
            rounded-full transition-all duration-500 ease-out
            ${striped ? 'bg-size-[1rem_1rem]' : ''}
            ${striped && animated ? 'animate-stripes' : ''}
          `}
          style={{
            width: `${percentage}%`,
            backgroundImage: striped
              ? 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)'
              : undefined,
          }}
        />
      </div>
      
      {/* 百分比文本 */}
      {showText && (
        <div className="mt-2 flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            进度
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}
