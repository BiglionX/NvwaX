import React from 'react';

export interface ContainerProps {
  /** 容器尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 自定义类名 */
  className?: string;
  /** 子元素 */
  children: React.ReactNode;
}

/**
 * NvwaX 统一容器组件
 * 
 * 用于包裹页面内容，提供一致的左右边距和最大宽度
 * 
 * @example
 * ```tsx
 * <Container size="lg" className="py-8">
 *   <h1>页面标题</h1>
 *   <p>页面内容</p>
 * </Container>
 * ```
 */
export default function Container({
  size = 'lg',
  className = '',
  children,
}: ContainerProps) {
  // 不同尺寸的最大宽度
  const sizes = {
    sm: 'max-w-5xl',      // 1024px
    md: 'max-w-6xl',      // 1152px
    lg: 'max-w-7xl',      // 1280px
    xl: 'max-w-screen-xl', // 1280px
    full: 'w-full',       // 100%
  };
  
  // 响应式内边距
  const padding = 'px-4 sm:px-6 lg:px-8';
  
  return (
    <div className={`${sizes[size]} mx-auto ${padding} ${className}`}>
      {children}
    </div>
  );
}
