import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> {
  /** 标签文本 */
  label?: string;
  /** 错误信息 */
  error?: string;
  /** 是否显示成功状态 */
  success?: boolean;
  /** 前置图标 */
  prefix?: React.ReactNode;
  /** 后置图标 */
  suffix?: React.ReactNode;
  /** 帮助文本 */
  helpText?: string;
  /** 是否必填 */
  required?: boolean;
}

/**
 * NvwaX 统一输入框组件
 * 
 * @example
 * ```tsx
 * // 基础用法
 * <Input placeholder="请输入..." />
 * 
 * // 带标签和错误
 * <Input 
 *   label="邮箱地址"
 *   error="请输入有效的邮箱地址"
 *   type="email"
 * />
 * 
 * // 带图标
 * <Input 
 *   prefix={<Search />}
 *   suffix={<ClearIcon />}
 *   placeholder="搜索..."
 * />
 * ```
 */
const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  success,
  prefix,
  suffix,
  helpText,
  required,
  className = '',
  id,
  ...props
}, ref) => {
  // 生成唯一 ID
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  // 状态样式
  const getStatusStyles = () => {
    if (error) {
      return 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20';
    }
    if (success) {
      return 'border-green-300 dark:border-green-700 focus:border-green-500 focus:ring-green-500/20';
    }
    return 'border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20';
  };
  
  return (
    <div className="w-full">
      {/* 标签 */}
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* 输入框容器 */}
      <div className="relative">
        {/* 前置图标 */}
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {prefix}
          </div>
        )}
        
        {/* 输入框 */}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-3 bg-white dark:bg-gray-800 
            border-2 rounded-xl 
            ${getStatusStyles()}
            outline-none transition-all duration-200
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${prefix ? 'pl-10' : ''}
            ${suffix ? 'pr-10' : ''}
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
          {...props}
        />
        
        {/* 后置图标 */}
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {suffix}
          </div>
        )}
        
        {/* 成功/错误图标 */}
        {success && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle size={18} className="text-green-500" />
          </div>
        )}
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <AlertCircle size={18} className="text-red-500" />
          </div>
        )}
      </div>
      
      {/* 错误信息 */}
      {error && (
        <p id={`${inputId}-error`} className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
          {error}
        </p>
      )}
      
      {/* 帮助文本 */}
      {helpText && !error && (
        <p id={`${inputId}-help`} className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
