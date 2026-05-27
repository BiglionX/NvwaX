'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface DropdownProps {
  /** 选项列表 */
  options: DropdownOption[];
  /** 当前选中值 */
  value?: string;
  /** 选择回调 */
  onChange: (value: string) => void;
  /** 占位文本 */
  placeholder?: string;
  /** 标签 */
  label?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 错误信息 */
  error?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一下拉菜单组件
 * 
 * @example
 * ```tsx
 * <Dropdown
 *   options={[
 *     { value: 'option1', label: '选项1' },
 *     { value: 'option2', label: '选项2' },
 *   ]}
 *   value={selectedValue}
 *   onChange={(value) => setSelectedValue(value)}
 * />
 * ```
 */
export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = '请选择...',
  label,
  disabled = false,
  error,
  className = '',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (option: DropdownOption) => {
    if (option.disabled || disabled) return;
    
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 标签 */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3
          bg-white dark:bg-gray-800
          border-2 rounded-xl
          flex items-center justify-between
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${error 
            ? 'border-red-300 dark:border-red-700 hover:border-red-400' 
            : isOpen
              ? 'border-blue-500 dark:border-blue-600 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className={`text-left truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
          {displayText}
        </span>
        <ChevronDown 
          size={20} 
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 错误信息 */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* 下拉菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="
              absolute z-50 mt-2 w-full
              bg-white dark:bg-gray-800
              border-2 border-gray-200 dark:border-gray-700
              rounded-xl shadow-xl
              max-h-64 overflow-y-auto
              py-2
            "
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                暂无选项
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  disabled={option.disabled}
                  className={`
                    w-full px-4 py-3
                    flex items-center gap-3
                    text-left
                    transition-colors duration-150
                    focus:outline-none
                    ${option.value === value
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : option.disabled
                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {/* 图标 */}
                  {option.icon && (
                    <span className="shrink-0">
                      {option.icon}
                    </span>
                  )}
                  
                  {/* 标签 */}
                  <span className="flex-1 truncate">{option.label}</span>
                  
                  {/* 选中标记 */}
                  {option.value === value && (
                    <svg 
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  )}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
