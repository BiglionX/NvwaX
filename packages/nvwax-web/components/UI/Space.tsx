import React from 'react';

export interface SpaceProps {
  /** 间距大小 */
  size?: number | 'small' | 'middle' | 'large';
  /** 方向 */
  direction?: 'horizontal' | 'vertical';
  /** 是否自动换行（仅水平方向） */
  wrap?: boolean;
  /** 对齐方式 */
  align?: 'start' | 'end' | 'center' | 'baseline';
  /** 自定义类名 */
  className?: string;
  /** 子元素 */
  children: React.ReactNode;
}

/**
 * NvwaX 统一间距组件
 * 
 * @example
 * ```tsx
 * <Space size="middle">
 *   <Button>按钮1</Button>
 *   <Button>按钮2</Button>
 * </Space>
 * 
 * <Space direction="vertical" size="large">
 *   <div>内容1</div>
 *   <div>内容2</div>
 * </Space>
 * ```
 */
export default function Space({
  size = 'middle',
  direction = 'horizontal',
  wrap = false,
  align,
  className = '',
  children,
}: SpaceProps) {
  // 尺寸映射
  const sizeMap = {
    small: 8,
    middle: 16,
    large: 24,
  };

  const spacing = typeof size === 'number' ? size : sizeMap[size];

  // 对齐方式映射
  const alignClasses = {
    start: 'items-start',
    end: 'items-end',
    center: 'items-center',
    baseline: 'items-baseline',
  };

  return (
    <div
      className={`
        inline-flex
        ${direction === 'horizontal' ? 'flex-row' : 'flex-col'}
        ${align ? alignClasses[align] : ''}
        ${wrap && direction === 'horizontal' ? 'flex-wrap' : ''}
        ${className}
      `}
      style={{
        gap: `${spacing}px`,
      }}
    >
      {children}
    </div>
  );
}
