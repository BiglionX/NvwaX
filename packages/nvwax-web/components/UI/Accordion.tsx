'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AccordionItem {
  /** 唯一标识 */
  id: string;
  /** 标题 */
  title: string;
  /** 内容 */
  content: React.ReactNode;
  /** 是否禁用 */
  disabled?: boolean;
}

export interface AccordionProps {
  /** 折叠项列表 */
  items: AccordionItem[];
  /** 当前展开的项 ID（受控模式） */
  value?: string | string[];
  /** 切换回调 */
  onChange?: (value: string | string[]) => void;
  /** 是否允许多选 */
  multiple?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一折叠面板组件
 * 
 * @example
 * ```tsx
 * // 单选模式
 * <Accordion
 *   items={[
 *     { id: '1', title: '标题1', content: <p>内容1</p> },
 *     { id: '2', title: '标题2', content: <p>内容2</p> },
 *   ]}
 * />
 * 
 * // 多选模式
 * <Accordion
 *   items={items}
 *   multiple
 *   value={['1', '2']}
 *   onChange={setExpanded}
 * />
 * ```
 */
export default function Accordion({
  items,
  value,
  onChange,
  multiple = false,
  className = '',
}: AccordionProps) {
  const [internalValue, setInternalValue] = useState<string | string[]>([]);
  
  // 判断是否为受控模式
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  
  const handleToggle = (id: string) => {
    const item = items.find(item => item.id === id);
    if (item?.disabled) return;
    
    let newValue: string | string[];
    
    if (multiple) {
      // 多选模式
      const currentValues = Array.isArray(currentValue) ? currentValue : [];
      if (currentValues.includes(id)) {
        newValue = currentValues.filter(v => v !== id);
      } else {
        newValue = [...currentValues, id];
      }
    } else {
      // 单选模式
      newValue = currentValue === id ? '' : id;
    }
    
    if (!isControlled) {
      setInternalValue(newValue);
    }
    
    onChange?.(newValue);
  };
  
  const isExpanded = (id: string) => {
    if (Array.isArray(currentValue)) {
      return currentValue.includes(id);
    }
    return currentValue === id;
  };
  
  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => {
        const expanded = isExpanded(item.id);
        
        return (
          <div
            key={item.id}
            className={`
              bg-white dark:bg-gray-800
              border-2 rounded-xl
              transition-all duration-200
              ${item.disabled
                ? 'border-gray-200 dark:border-gray-700 opacity-50'
                : expanded
                  ? 'border-violet-300 dark:border-violet-700 shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'
              }
            `}
          >
            {/* 标题按钮 */}
            <button
              type="button"
              onClick={() => handleToggle(item.id)}
              disabled={item.disabled}
              className={`
                w-full px-6 py-4
                flex items-center justify-between
                text-left
                focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-inset rounded-xl
                ${item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className={`font-medium ${expanded ? 'text-violet-700 dark:text-violet-300' : 'text-gray-900 dark:text-white'}`}>
                {item.title}
              </span>
              
              {/* 箭头图标 */}
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown 
                  size={20} 
                  className={`
                    transition-colors
                    ${expanded 
                      ? 'text-violet-600 dark:text-violet-400' 
                      : 'text-gray-400'
                    }
                  `}
                />
              </motion.div>
            </button>
            
            {/* 内容区域 */}
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
