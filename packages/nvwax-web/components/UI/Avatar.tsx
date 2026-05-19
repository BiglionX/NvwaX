import React from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';

export interface AvatarProps {
  /** 头像 URL */
  src?: string;
  /** 备用文本（当图片加载失败时显示） */
  alt?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 形状 */
  shape?: 'circle' | 'square';
  /** 背景色（当无图片时） */
  bgColor?: string;
  /** 文字颜色（当无图片时） */
  textColor?: string;
  /** 自定义类名 */
  className?: string;
  /** 点击事件 */
  onClick?: () => void;
}

/**
 * NvwaX 统一头像组件
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <Avatar src="/avatar.jpg" alt="用户名" />
 * 
 * // 不同尺寸
 * <Avatar size="sm" />
 * <Avatar size="md" />
 * <Avatar size="lg" />
 * 
 * // 带文字
 * <Avatar alt="张三" /> // 显示 "张"
 * 
 * // 可点击
 * <Avatar onClick={() => console.log('clicked')} />
 * ```
 */
export default function Avatar({
  src,
  alt,
  size = 'md',
  shape = 'circle',
  bgColor = 'bg-gradient-to-br from-violet-500 to-purple-600',
  textColor = 'text-white',
  className = '',
  onClick,
}: AvatarProps) {
  // 尺寸样式
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };
  
  // 形状样式
  const shapes = {
    circle: 'rounded-full',
    square: 'rounded-xl',
  };
  
  // 获取首字母
  const getInitials = () => {
    if (!alt) return '?';
    return alt.charAt(0).toUpperCase();
  };
  
  // 点击处理
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };
  
  // 图片加载失败处理
  const [hasError, setHasError] = React.useState(false);
  
  const handleError = () => {
    setHasError(true);
  };
  
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center
        ${sizes[size]}
        ${shapes[shape]}
        ${src && !hasError ? '' : bgColor}
        ${src && !hasError ? '' : textColor}
        ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}
        ${className}
      `}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {src && !hasError ? (
        <div className={`relative w-full h-full ${shapes[shape]}`}>
          <Image
            src={src}
            alt={alt || 'Avatar'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={handleError}
          />
        </div>
      ) : (
        <>
          {alt ? (
            <span className="font-semibold">{getInitials()}</span>
          ) : (
            <User className="w-1/2 h-1/2 opacity-70" />
          )}
        </>
      )}
    </Component>
  );
}
