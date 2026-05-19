import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps {
  /** 警告类型 */
  type: AlertType;
  /** 标题 */
  title?: string;
  /** 消息内容 */
  message: string;
  /** 是否可关闭 */
  closable?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一警告提示组件
 * 
 * @example
 * ```tsx
 * <Alert type="success" message="操作成功" />
 * <Alert type="error" title="错误" message="操作失败，请重试" closable onClose={handleClose} />
 * ```
 */
export default function Alert({
  type,
  title,
  message,
  closable = false,
  onClose,
  className = '',
}: AlertProps) {
  // 图标和颜色配置
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      iconColor: 'text-green-600 dark:text-green-400',
      titleColor: 'text-green-800 dark:text-green-200',
      textColor: 'text-green-700 dark:text-green-300',
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-800 dark:text-red-200',
      textColor: 'text-red-700 dark:text-red-300',
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      iconColor: 'text-orange-600 dark:text-orange-400',
      titleColor: 'text-orange-800 dark:text-orange-200',
      textColor: 'text-orange-700 dark:text-orange-300',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-800 dark:text-blue-200',
      textColor: 'text-blue-700 dark:text-blue-300',
    },
  };

  const { icon: Icon, bgColor, borderColor, iconColor, titleColor, textColor } = config[type];

  return (
    <div
      className={`
        flex items-start gap-3
        ${bgColor}
        border-2 ${borderColor}
        rounded-xl p-4
        ${className}
      `}
    >
      {/* 图标 */}
      <Icon size={24} className={`${iconColor} shrink-0 mt-0.5`} />
      
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`font-semibold text-sm ${titleColor} mb-1`}>
            {title}
          </h4>
        )}
        <p className={`text-sm ${textColor}`}>
          {message}
        </p>
      </div>
      
      {/* 关闭按钮 */}
      {closable && onClose && (
        <button
          onClick={onClose}
          className={`
            shrink-0 p-1 
            hover:bg-white/50 dark:hover:bg-gray-800/50 
            rounded-lg transition-colors 
            focus:outline-none focus:ring-2 focus:ring-offset-2
          `}
          aria-label="关闭"
        >
          <X size={16} className={textColor} />
        </button>
      )}
    </div>
  );
}
