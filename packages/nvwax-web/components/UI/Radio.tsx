'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface RadioProps {
  /** 是否选中 */
  checked: boolean;
  /** 状态改变回调 */
  onChange: () => void;
  /** 标签文本 */
  label?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一单选框组件
 * 
 * @example
 * ```tsx
 * const [selected, setSelected] = useState('option1');
 * 
 * <Radio
 *   checked={selected === 'option1'}
 *   onChange={() => setSelected('option1')}
 *   label="选项1"
 * />
 * ```
 */
export default function Radio({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}: RadioProps) {
  const handleClick = () => {
    if (!disabled && !checked) {
      onChange();
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
      {/* 单选框 */}
      <div
        role="radio"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          relative w-5 h-5
          rounded-full border-2
          flex items-center justify-center
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
          ${checked
            ? 'border-violet-600'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-violet-400'
          }
          ${disabled ? 'cursor-not-allowed' : ''}
        `}
      >
        {/* 选中标记 */}
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="w-2.5 h-2.5 bg-linear-to-br from-violet-500 to-purple-600 rounded-full"
          />
        )}
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
