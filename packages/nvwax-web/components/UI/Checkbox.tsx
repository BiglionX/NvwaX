'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  /** 是否选中 */
  checked: boolean;
  /** 状态改变回调 */
  onChange: (checked: boolean) => void;
  /** 标签文本 */
  label?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否不确定状态 */
  indeterminate?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一复选框组件
 * 
 * @example
 * ```tsx
 * const [checked, setChecked] = useState(false);
 * 
 * <Checkbox
 *   checked={checked}
 *   onChange={setChecked}
 *   label="同意条款"
 * />
 * ```
 */
export default function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  indeterminate = false,
  className = '',
}: CheckboxProps) {
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
      {/* 复选框 */}
      <div
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          relative w-5 h-5
          rounded-md border-2
          flex items-center justify-center
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${checked || indeterminate
            ? 'bg-linear-to-br from-blue-600 to-blue-700 border-blue-600'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400'
          }
          ${disabled ? 'cursor-not-allowed' : ''}
        `}
      >
        {/* 选中标记 */}
        {(checked || indeterminate) && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {indeterminate ? (
              <div className="w-2.5 h-0.5 bg-white rounded-full" />
            ) : (
              <Check size={14} className="text-white" strokeWidth={3} />
            )}
          </motion.div>
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
