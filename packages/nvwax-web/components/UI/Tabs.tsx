'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  /** 标签值 */
  value: string;
  /** 标签文本 */
  label: string;
  /** 图标（可选） */
  icon?: React.ReactNode;
  /** 是否禁用 */
  disabled?: boolean;
}

export interface TabsProps {
  /** 标签列表 */
  tabs: TabItem[];
  /** 当前选中的标签值 */
  value: string;
  /** 切换回调 */
  onChange: (value: string) => void;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 变体 */
  variant?: 'default' | 'pills' | 'underline';
  /** 自定义类名 */
  className?: string;
  /** 内容区域类名 */
  contentClassName?: string;
  /** 子元素 */
  children?: React.ReactNode;
}

/**
 * NvwaX 统一标签页组件
 * 
 * @example
 * ```tsx
 * const [activeTab, setActiveTab] = useState('tab1');
 * 
 * <Tabs
 *   tabs={[
 *     { value: 'tab1', label: '标签1' },
 *     { value: 'tab2', label: '标签2' },
 *   ]}
 *   value={activeTab}
 *   onChange={setActiveTab}
 * >
 *   {activeTab === 'tab1' && <div>内容1</div>}
 *   {activeTab === 'tab2' && <div>内容2</div>}
 * </Tabs>
 * ```
 */
export default function Tabs({
  tabs,
  value,
  onChange,
  size = 'md',
  variant = 'default',
  className = '',
  contentClassName = '',
  children,
}: TabsProps) {
  // 尺寸样式
  const sizes = {
    sm: {
      tab: 'px-3 py-2 text-sm',
      gap: 'gap-1',
    },
    md: {
      tab: 'px-4 py-3 text-base',
      gap: 'gap-2',
    },
    lg: {
      tab: 'px-6 py-4 text-lg',
      gap: 'gap-3',
    },
  };

  return (
    <div className={className}>
      {/* 标签栏 */}
      <div 
        className={`
          flex ${sizes[size].gap}
          ${variant === 'default' ? 'bg-gray-100 dark:bg-gray-800 p-1 rounded-xl' : ''}
          ${variant === 'pills' ? 'bg-gray-100 dark:bg-gray-800 p-1 rounded-full' : ''}
          ${variant === 'underline' ? 'border-b-2 border-gray-200 dark:border-gray-700' : ''}
        `}
      >
        {tabs.map((tab) => {
          const isActive = tab.value === value;
          
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => !tab.disabled && onChange(tab.value)}
              disabled={tab.disabled}
              className={`
                relative flex items-center gap-2 font-medium transition-all duration-200
                ${sizes[size].tab}
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${variant === 'default' || variant === 'pills' ? 'rounded-lg' : 'rounded-none'}
                ${isActive
                  ? variant === 'default'
                    ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm'
                    : variant === 'pills'
                      ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm rounded-full'
                      : 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
            >
              {/* 图标 */}
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              
              {/* 标签文本 */}
              <span>{tab.label}</span>
              
              {/* 下划线动画（underline 变体） */}
              {variant === 'underline' && isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
      
      {/* 内容区域 */}
      {children && (
        <div className={`mt-4 ${contentClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}
