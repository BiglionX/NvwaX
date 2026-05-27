'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface SwitchProps {
  /** 是否选中 */
  checked: boolean;
  /** 状态改变回调 */
  onChange: (checked: boolean) => void;
  /** 标签文本 */
  label?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一开关组件
 * 
 * @example
 * ```tsx
 * const [enabled, setEnabled] = useState(false);
 * 
 * <Switch
 *   checked={enabled}
 *   onChange={setEnabled}
 *   label="启用通知"
 * />
 * ```
 */
export default function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className = '',
}: SwitchProps) {
  // 尺寸配置
  const sizes = {
    sm: {
      track: 'w-9 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-4',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7',
    },
  };

  const currentSize = sizes[size];

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <label
      className={`
        inline-flex items-center gap-3
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {/* 开关轨道 */}
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          relative ${currentSize.track}
          rounded-full
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${checked
            ? 'bg-linear-to-r from-blue-600 to-blue-700'
            : 'bg-gray-300 dark:bg-gray-600'
          }
          ${disabled ? 'cursor-not-allowed' : ''}
        `}
      >
        {/* 开关滑块 */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`
            absolute top-0.5 left-0.5
            ${currentSize.thumb}
            bg-white rounded-full shadow-md
            ${checked ? currentSize.translate : 'translate-x-0'}
          `}
        />
      </div>

      {/* 标签文本 */}
      {label && (
        <span className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
          {label}
        </span>
      )}
    </label>
  );
}
