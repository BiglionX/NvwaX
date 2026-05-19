import { Loader2 } from 'lucide-react';

export interface LoadingProps {
  /** 是否全屏显示 */
  fullScreen?: boolean;
  /** 加载文本 */
  text?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一加载组件
 * 
 * @example
 * ```tsx
 * // 全屏加载
 * <Loading fullScreen text="加载中..." />
 * 
 * // 局部加载
 * <Loading text="正在保存..." />
 * ```
 */
export default function Loading({
  fullScreen = false,
  text = '加载中...',
  className = '',
}: LoadingProps) {
  if (fullScreen) {
    return (
      <div className={`fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
        <div className="text-center">
          <div className="relative inline-block">
            {/* 外圈 */}
            <div className="w-16 h-16 border-4 border-violet-200 dark:border-violet-900 rounded-full"></div>
            {/* 内圈旋转 */}
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          {text && (
            <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{text}</p>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-violet-600 dark:text-violet-400 mx-auto" />
        {text && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{text}</p>
        )}
      </div>
    </div>
  );
}
