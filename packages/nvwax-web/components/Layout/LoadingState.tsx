'use client';

/**
 * 统一的加载状态组件
 * 用于用户中心各个子页面的加载状态显示
 */

interface LoadingStateProps {
  /** 加载文本，默认"加载中..." */
  text?: string;
  /** 是否显示为全屏居中，默认 true */
  fullScreen?: boolean;
  /** 自定义容器样式类 */
  containerClassName?: string;
}

export default function LoadingState({
  text = '加载中...',
  fullScreen = true,
  containerClassName,
}: LoadingStateProps) {
  const containerClasses = fullScreen
    ? 'flex items-center justify-center py-12'
    : 'py-8';

  return (
    <div className={containerClassName || containerClasses}>
      <div className="text-center">
        {/* 旋转加载动画 */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        {/* 加载文本 */}
        <p className="text-gray-600 dark:text-gray-400">{text}</p>
      </div>
    </div>
  );
}
