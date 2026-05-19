'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TooltipProps {
  /** 提示内容 */
  content: string;
  /** 位置 */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** 子元素 */
  children: React.ReactNode;
  /** 延迟显示时间（毫秒） */
  delay?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一工具提示组件
 * 
 * @example
 * ```tsx
 * <Tooltip content="这是提示信息">
 *   <button>悬停我</button>
 * </Tooltip>
 * 
 * <Tooltip content="底部提示" position="bottom">
 *   <button>悬停我</button>
 * </Tooltip>
 * ```
 */
export default function Tooltip({
  content,
  position = 'top',
  children,
  delay = 200,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  let timeoutId: NodeJS.Timeout;

  const handleMouseEnter = () => {
    timeoutId = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutId);
    setIsVisible(false);
  };

  // 位置样式
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  // 箭头样式
  const arrows = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-gray-900 dark:border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-gray-900 dark:border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-gray-900 dark:border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-gray-900 dark:border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 触发元素 */}
      {children}
      
      {/* 提示框 */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`
              absolute z-50
              ${positions[position]}
              px-3 py-2
              bg-gray-900 dark:bg-gray-800
              text-white text-sm
              rounded-lg shadow-lg
              whitespace-nowrap
              pointer-events-none
            `}
          >
            {/* 内容 */}
            {content}
            
            {/* 箭头 */}
            <div 
              className={`
                absolute w-0 h-0 border-4
                ${arrows[position]}
              `}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
