'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  /** 标签文本 */
  label: string;
  /** 链接地址 */
  href?: string;
  /** 图标（可选） */
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps {
  /** 面包屑项列表 */
  items: BreadcrumbItem[];
  /** 分隔符（默认 ChevronRight） */
  separator?: React.ReactNode;
  /** 是否显示首页图标 */
  showHomeIcon?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * NvwaX 统一面包屑导航组件
 * 
 * @example
 * ```tsx
 * <Breadcrumbs
 *   items={[
 *     { label: '首页', href: '/' },
 *     { label: '用户中心', href: '/user' },
 *     { label: '个人资料' },
 *   ]}
 * />
 * ```
 */
export default function Breadcrumbs({
  items,
  separator,
  showHomeIcon = true,
  className = '',
}: BreadcrumbsProps) {
  return (
    <nav aria-label="面包屑导航" className={className}>
      <ol className="flex items-center flex-wrap gap-2">
        {/* 首页图标 */}
        {showHomeIcon && items.length > 0 && (
          <>
            <li>
              <Link
                href="/"
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                <Home size={18} />
              </Link>
            </li>
            
            {/* 分隔符 */}
            <li className="text-gray-400 dark:text-gray-600">
              {separator || <ChevronRight size={16} />}
            </li>
          </>
        )}
        
        {/* 面包屑项 */}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <React.Fragment key={index}>
              <li>
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-1.5
                      text-sm font-medium
                      ${isLast
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400'
                      }
                      transition-colors
                    `}
                  >
                    {/* 图标 */}
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    
                    {/* 标签 */}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span
                    className={`
                      flex items-center gap-1.5
                      text-sm font-medium
                      ${isLast
                        ? 'text-violet-700 dark:text-violet-300'
                        : 'text-gray-600 dark:text-gray-400'
                      }
                    `}
                  >
                    {/* 图标 */}
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    
                    {/* 标签 */}
                    <span>{item.label}</span>
                  </span>
                )}
              </li>
              
              {/* 分隔符（非最后一项） */}
              {!isLast && (
                <li className="text-gray-400 dark:text-gray-600">
                  {separator || <ChevronRight size={16} />}
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
