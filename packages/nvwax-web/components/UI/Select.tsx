import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** 标签文本 */
  label?: string;
  /** 选项列表 */
  options: SelectOption[];
  /** 错误信息 */
  error?: string;
  /** 占位文本 */
  placeholder?: string;
  /** 帮助文本 */
  helpText?: string;
  /** 是否必填 */
  required?: boolean;
}

/**
 * NvwaX 统一选择框组件
 * 
 * @example
 * ```tsx
 * <Select
 *   label="选择角色"
 *   options={[
 *     { value: 'admin', label: '管理员' },
 *     { value: 'user', label: '普通用户' },
 *   ]}
 *   onChange={(e) => console.log(e.target.value)}
 * />
 * ```
 */
export default function Select({
  label,
  options,
  error,
  placeholder = '请选择...',
  helpText,
  required,
  className = '',
  id,
  ...props
}: SelectProps) {
  // 生成唯一 ID
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="w-full">
      {/* 标签 */}
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* 选择框容器 */}
      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full px-4 py-3 pr-10
            bg-white dark:bg-gray-800 
            border-2 rounded-xl 
            appearance-none cursor-pointer
            ${error 
              ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20' 
              : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20'
            }
            outline-none transition-all duration-200
            text-gray-900 dark:text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined}
          {...props}
        >
          {/* 占位选项 */}
          {(!props.value || props.value === '') && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          
          {/* 选项列表 */}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* 下拉箭头 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
          <ChevronDown size={18} />
        </div>
      </div>
      
      {/* 错误信息 */}
      {error && (
        <p id={`${selectId}-error`} className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      
      {/* 帮助文本 */}
      {helpText && !error && (
        <p id={`${selectId}-help`} className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}
    </div>
  );
}
