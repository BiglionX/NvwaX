'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ModalProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 内容 */
  children: React.ReactNode;
  /** 底部操作区 */
  footer?: React.ReactNode;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 是否点击遮罩关闭 */
  closeOnOverlayClick?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一模态框组件
 * 
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 * 
 * <Modal
 *   open={open}
 *   onClose={() => setOpen(false)}
 *   title="确认操作"
 *   subtitle="此操作不可撤销"
 * >
 *   <p>确定要删除这个项目吗？</p>
 * </Modal>
 * ```
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
}: ModalProps) {
  // ESC 键关闭
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // 禁止背景滚动
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // 尺寸映射
  const sizes = {
    sm: 'max-w-md',      // 448px
    md: 'max-w-lg',      // 512px
    lg: 'max-w-2xl',     // 672px
    xl: 'max-w-4xl',     // 896px
    full: 'max-w-[95vw]', // 95% 视口宽度
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleOverlayClick}
          />
          
          {/* 模态框 */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`
                w-full ${sizes[size]}
                bg-white dark:bg-gray-800
                rounded-2xl shadow-2xl
                border border-gray-200 dark:border-gray-700
                pointer-events-auto
                max-h-[90vh] overflow-hidden
                flex flex-col
                ${className}
              `}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    {title && (
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
                      aria-label="关闭"
                    >
                      <X size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  )}
                </div>
              )}
              
              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {children}
              </div>
              
              {/* Footer */}
              {footer && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
