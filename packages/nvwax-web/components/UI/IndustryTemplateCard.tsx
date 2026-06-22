'use client';

import React from 'react';
import { Megaphone, Code2, Headphones, BarChart3, Sparkles, Check } from 'lucide-react';

/**
 * 行业模板类型
 */
export type IndustryType = 'marketing' | 'development' | 'customer-service' | 'data-analysis' | 'custom';

/**
 * 内置行业模板
 */
export interface IndustryTemplate {
  id: IndustryType;
  name: string;
  description: string;
  longDescription?: string;
  icon: React.ReactNode;
  color: string;          // Tailwind color class base, e.g. 'pink', 'blue'
  gradient: string;       // Tailwind gradient class
  capabilities: string[]; // 推荐的 capabilities 标签
  defaultSkills: string[]; // 自动填充的默认 skills
  suggestedRoles: string[]; // 建议的角色
  tags: string[];          // 行业标签
}

/**
 * 预置 4 个行业模板
 */
export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'marketing',
    name: '营销推广',
    description: '内容创作、社媒运营',
    longDescription: '适合小红书、抖音、微信公众号等社交媒体营销场景，包含内容策划、文案撰写、社媒运营、数据分析等核心能力',
    icon: <Megaphone size={24} />,
    color: 'pink',
    gradient: 'from-pink-500 to-rose-500',
    capabilities: ['content_strategy', 'social_media', 'copywriting', 'trend_analysis'],
    defaultSkills: ['content_strategy', 'social_media_posting', 'trend_analysis', 'data_analytics'],
    suggestedRoles: ['内容策划师', '文案专员', '社群运营经理', '数据分析师'],
    tags: ['内容', '社媒', '短视频', '品牌'],
  },
  {
    id: 'development',
    name: '研发开发',
    description: '代码、测试、文档',
    longDescription: '适合 Web / App / 小程序 全栈开发场景，包含需求分析、技术选型、编码实现、测试验证、文档输出等完整流程',
    icon: <Code2 size={24} />,
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-500',
    capabilities: ['frontend', 'backend', 'database', 'testing', 'devops'],
    defaultSkills: ['code_generation', 'code_review', 'unit_testing', 'api_design', 'database_design'],
    suggestedRoles: ['前端工程师', '后端工程师', '测试工程师', '架构师'],
    tags: ['前端', '后端', '测试', 'DevOps'],
  },
  {
    id: 'customer-service',
    name: '客户服务',
    description: '咨询、投诉处理',
    longDescription: '适合电商、SaaS 等需要 7x24 客户服务的场景，包含智能问答、订单查询、投诉处理、情感分析等核心能力',
    icon: <Headphones size={24} />,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    capabilities: ['customer_communication', 'sentiment_analysis', 'problem_solving', 'knowledge_base'],
    defaultSkills: ['intent_recognition', 'faq_matching', 'order_query', 'sentiment_analysis'],
    suggestedRoles: ['客服专员', '问题分析师', '客户成功经理'],
    tags: ['客服', '售前', '售后', '工单'],
  },
  {
    id: 'data-analysis',
    name: '数据分析',
    description: '报表、洞察',
    longDescription: '适合业务数据分析、市场研究、用户画像等场景，包含数据采集、清洗、分析、可视化、洞察输出等全流程',
    icon: <BarChart3 size={24} />,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    capabilities: ['data_analysis', 'sql', 'python', 'visualization', 'business_intelligence'],
    defaultSkills: ['sql_query', 'data_visualization', 'statistical_analysis', 'report_generation'],
    suggestedRoles: ['数据分析师', '数据科学家', '业务分析师', 'BI 工程师'],
    tags: ['数据', '报表', 'BI', '洞察'],
  },
];

export interface IndustryTemplateCardProps {
  /** 模板 ID（用于事件回调） */
  templateId: IndustryType;
  /** 选中状态 */
  selected?: boolean;
  /** 点击回调 */
  onClick?: (template: IndustryTemplate) => void;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示详细描述 */
  showLongDescription?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 加载中 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * IndustryTemplateCard - 行业模板卡片
 *
 * 用于 Agent 创建向导的 Step 1 行业选择。
 * 选中后自动填充推荐的 capabilities、skills、roles。
 *
 * @example
 * ```tsx
 * <IndustryTemplateCard
 *   templateId="marketing"
 *   selected={selectedId === 'marketing'}
 *   onClick={(t) => setSelectedId(t.id)}
 * />
 * ```
 */
export default function IndustryTemplateCard({
  templateId,
  selected = false,
  onClick,
  size = 'md',
  showLongDescription = false,
  className = '',
  loading = false,
  disabled = false,
}: IndustryTemplateCardProps) {
  const template = INDUSTRY_TEMPLATES.find(t => t.id === templateId);
  if (!template) return null;

  const sizes = {
    sm: { card: 'p-3', icon: 'w-10 h-10', iconSize: 20, title: 'text-sm', desc: 'text-xs' },
    md: { card: 'p-4', icon: 'w-12 h-12', iconSize: 24, title: 'text-base', desc: 'text-sm' },
    lg: { card: 'p-5', icon: 'w-14 h-14', iconSize: 28, title: 'text-lg', desc: 'text-base' },
  };
  const s = sizes[size];

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick(template);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      aria-busy={loading}
      className={`
        group relative
        ${s.card}
        rounded-xl border-2
        cursor-pointer
        transition-all duration-200
        ${selected
          ? `border-${template.color}-500 bg-${template.color}-50/50 dark:bg-${template.color}-950/30 shadow-lg`
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {/* 选中标识 */}
      {selected && (
        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-br ${template.gradient} text-white flex items-center justify-center shadow-md`}>
          <Check size={14} />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div
          className={`
            ${s.icon} shrink-0 rounded-lg
            bg-gradient-to-br ${template.gradient}
            flex items-center justify-center text-white
            transition-transform duration-200
            ${selected ? 'scale-110' : 'group-hover:scale-105'}
          `}
        >
          {template.icon}
        </div>

        {/* 文本 */}
        <div className="flex-1 min-w-0">
          <h3 className={`${s.title} font-semibold text-gray-900 dark:text-white`}>
            {template.name}
          </h3>
          <p className={`mt-1 ${s.desc} text-gray-600 dark:text-gray-400`}>
            {showLongDescription && template.longDescription
              ? template.longDescription
              : template.description}
          </p>

          {/* 标签（仅在 lg 尺寸显示）*/}
          {size === 'lg' && template.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {template.tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 加载态 */}
          {loading && (
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Sparkles size={12} className="animate-pulse" />
              <span>应用模板中...</span>
            </div>
          )}
        </div>
      </div>

      {/* 底部悬停提示 */}
      {!selected && !disabled && (
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
          点击应用此模板 →
        </div>
      )}
    </div>
  );
}

/**
 * IndustryTemplateGrid - 行业模板网格（一次性展示所有模板）
 */
export interface IndustryTemplateGridProps {
  selectedId?: IndustryType;
  onSelect?: (template: IndustryTemplate) => void;
  size?: 'sm' | 'md' | 'lg';
  showLongDescription?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function IndustryTemplateGrid({
  selectedId,
  onSelect,
  size = 'md',
  showLongDescription = false,
  columns = 2,
  className = '',
}: IndustryTemplateGridProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${columns === 3 ? 'md:grid-cols-3' : ''} ${
        columns === 4 ? 'md:grid-cols-4' : ''
      } gap-3 ${className}`}
      role="radiogroup"
      aria-label="行业模板选择"
    >
      {INDUSTRY_TEMPLATES.map(template => (
        <IndustryTemplateCard
          key={template.id}
          templateId={template.id}
          selected={selectedId === template.id}
          onClick={onSelect}
          size={size}
          showLongDescription={showLongDescription}
        />
      ))}
    </div>
  );
}
