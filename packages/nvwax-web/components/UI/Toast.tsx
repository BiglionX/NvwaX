'use client';

import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  /** 消息类型 */
  type: ToastType;
  /** 标题 */
  title?: string;
  /** 消息内容 */
  message: string;
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 自动关闭时间（毫秒），0 表示不自动关闭 */
  duration?: number;
}

/**
 * NvwaX 统一消息提示组件
 * 
 * @example
 * ```tsx
 * const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });
 * 
 * <Toast
 *   type={toast.type}
 *   message={toast.message}
 *   visible={toast.visible}
 *   onClose={() => setToast({ ...toast, visible: false })}
 *   duration={3000}
 * />
 * ```
 */
export default function Toast({
  type,
  title,
  message,
  visible,
  onClose,
  duration = 3000,
}: ToastProps) {
  // 自动关闭
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

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
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`
            fixed top-4 right-4 z-100
            max-w-md w-full
            ${bgColor}
            border-2 ${borderColor}
            rounded-xl shadow-lg
            p-4
          `}
        >
          <div className="flex items-start gap-3">
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
            <button
              onClick={onClose}
              className="shrink-0 p-1 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors focus:outline-none"
              aria-label="关闭"
            >
              <X size={16} className={textColor} />
            </button>
          </div>
          
          {/* 进度条（自动关闭时显示） */}
          {duration > 0 && (
            <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                className={`h-full ${iconColor.replace('text-', 'bg-')}`}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
