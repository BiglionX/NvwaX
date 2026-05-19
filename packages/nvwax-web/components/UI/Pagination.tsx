'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  /** 当前页码 */
  current: number;
  /** 总页数 */
  total: number;
  /** 页码改变回调 */
  onChange: (page: number) => void;
  /** 每页显示数量（用于计算） */
  pageSize?: number;
  /** 是否显示首页/末页按钮 */
  showFirstLast?: boolean;
  /** 是否显示跳转输入框 */
  showQuickJumper?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一分页组件
 * 
 * @example
 * ```tsx
 * <Pagination
 *   current={1}
 *   total={100}
 *   onChange={(page) => setCurrent(page)}
 * />
 * ```
 */
export default function Pagination({
  current,
  total,
  onChange,
  pageSize = 10,
  showFirstLast = false,
  showQuickJumper = false,
  className = '',
}: PaginationProps) {
  // 生成页码数组
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5; // 最多显示的页码数
    
    if (total <= maxVisible) {
      // 总页数小于等于最大显示数，显示所有页码
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // 始终显示第一页
      pages.push(1);
      
      if (current > 3) {
        pages.push('...');
      }
      
      // 显示当前页附近的页码
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (current < total - 2) {
        pages.push('...');
      }
      
      // 始终显示最后一页
      if (!pages.includes(total)) {
        pages.push(total);
      }
    }
    
    return pages;
  };
  
  const pageNumbers = getPageNumbers();
  
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= total && page !== current) {
      onChange(page);
    }
  };
  
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {/* 页码信息 */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        第 <span className="font-semibold text-gray-900 dark:text-white">{current}</span> / {total} 页
        {pageSize && (
          <span className="ml-2">
            （共 {total * pageSize} 条）
          </span>
        )}
      </div>
      
      {/* 分页按钮 */}
      <div className="flex items-center gap-2">
        {/* 首页按钮 */}
        {showFirstLast && (
          <button
            onClick={() => handlePageChange(1)}
            disabled={current === 1}
            className={`
              p-2 rounded-lg transition-colors
              ${current === 1
                ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
              }
            `}
            aria-label="首页"
          >
            <ChevronsLeft size={18} />
          </button>
        )}
        
        {/* 上一页按钮 */}
        <button
          onClick={() => handlePageChange(current - 1)}
          disabled={current === 1}
          className={`
            p-2 rounded-lg transition-colors
            ${current === 1
              ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
            }
          `}
          aria-label="上一页"
        >
          <ChevronLeft size={18} />
        </button>
        
        {/* 页码按钮 */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-2 text-gray-400 dark:text-gray-600">...</span>
              ) : (
                <button
                  onClick={() => handlePageChange(page as number)}
                  className={`
                    min-w-9 h-9 px-3 rounded-lg font-medium transition-all duration-200
                    ${page === current
                      ? 'bg-linear-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200/50 dark:shadow-violet-900/30'
                      : 'text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                    }
                  `}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* 下一页按钮 */}
        <button
          onClick={() => handlePageChange(current + 1)}
          disabled={current === total}
          className={`
            p-2 rounded-lg transition-colors
            ${current === total
              ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
            }
          `}
          aria-label="下一页"
        >
          <ChevronRight size={18} />
        </button>
        
        {/* 末页按钮 */}
        {showFirstLast && (
          <button
            onClick={() => handlePageChange(total)}
            disabled={current === total}
            className={`
              p-2 rounded-lg transition-colors
              ${current === total
                ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
              }
            `}
            aria-label="末页"
          >
            <ChevronsRight size={18} />
          </button>
        )}
      </div>
      
      {/* 快速跳转 */}
      {showQuickJumper && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">跳至</span>
          <input
            type="number"
            min={1}
            max={total}
            defaultValue={current}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = parseInt((e.target as HTMLInputElement).value);
                if (value >= 1 && value <= total) {
                  onChange(value);
                }
              }
            }}
            className="w-16 px-2 py-1.5 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-violet-500 dark:focus:border-violet-600 bg-white dark:bg-gray-800"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">页</span>
        </div>
      )}
    </div>
  );
}
