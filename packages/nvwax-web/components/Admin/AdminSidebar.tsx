'use client';

/**
 * AdminSidebar — v2.3 IDE 风格多级树侧栏
 * ----------------------------------------------------------------
 * 取代旧 layout.tsx 里一字排开的 13 项扁平菜单，按业务域分组为 5 个折叠树：
 *
 *   📁 概览
 *     └─ 数据看板
 *   📁 用户与权限
 *     ├─ 用户
 *     ├─ 管理员
 *     └─ 开发者
 *   📁 内容管理
 *     ├─ 项目
 *     ├─ 智能体
 *     ├─ 虚拟公司
 *     └─ 通知
 *   📁 数据与监控
 *     ├─ 爬虫
 *     └─ 审计日志
 *   📁 系统配置
 *     ├─ Token 用量
 *     ├─ 支付设置
 *     ├─ 高级设置
 *     └─ 常规设置
 *
 * 交互：
 * - 当前路径所在的分组自动展开
 * - 其它分组可手动展开/折叠（localStorage 记忆状态）
 * - 窄屏（<lg）可整体折叠为 64px 图标列
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  Shield,
  Code,
  Folder,
  Bot,
  Building2,
  Bell,
  Database,
  FileText,
  Coins,
  PieChart,
  CreditCard,
  Settings2,
  Settings,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  type LucideIcon,
} from 'lucide-react';

/** 单个菜单项 */
interface AdminMenuItem {
  /** i18n key in 'admin' namespace */
  labelKey: string;
  icon: LucideIcon;
  path: string;
}

/** 分组（树节点） */
interface AdminMenuGroup {
  /** i18n key for group title */
  labelKey: string;
  icon: LucideIcon;
  items: AdminMenuItem[];
}

const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [
  {
    labelKey: 'groupOverview',
    icon: LayoutDashboard,
    items: [
      { labelKey: 'dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    ],
  },
  {
    labelKey: 'groupUserAccess',
    icon: Users,
    items: [
      { labelKey: 'users', icon: Users, path: '/admin/users' },
      { labelKey: 'admins', icon: Shield, path: '/admin/admins' },
      { labelKey: 'devTitle', icon: Code, path: '/admin/developers' },
    ],
  },
  {
    labelKey: 'groupContent',
    icon: Folder,
    items: [
      { labelKey: 'projects', icon: Folder, path: '/admin/projects' },
      { labelKey: 'agents', icon: Bot, path: '/admin/agents' },
      { labelKey: 'menuVirtualCompanies', icon: Building2, path: '/admin/virtual-companies' },
      { labelKey: 'menuNotifications', icon: Bell, path: '/admin/notifications' },
    ],
  },
  {
    labelKey: 'groupDataMonitor',
    icon: Activity,
    items: [
      { labelKey: 'crawler', icon: Database, path: '/admin/crawler' },
      { labelKey: 'auditOverview', icon: PieChart, path: '/admin/audit-overview' },
      { labelKey: 'auditLogs', icon: FileText, path: '/admin/audit-logs' },
    ],
  },
  {
    labelKey: 'groupSystem',
    icon: Settings2,
    items: [
      { labelKey: 'tokens', icon: Coins, path: '/admin/tokens' },
      { labelKey: 'payment', icon: CreditCard, path: '/admin/payment-settings' },
      { labelKey: 'advancedSettings', icon: Settings2, path: '/admin/advanced-settings' },
      { labelKey: 'settings', icon: Settings, path: '/admin/settings' },
    ],
  },
];

/** i18n fallback 映射（缺失 namespace 键时使用） */
const LABEL_FALLBACK: Record<string, string> = {
  // group
  groupOverview: '概览',
  groupUserAccess: '用户与权限',
  groupContent: '内容管理',
  groupDataMonitor: '数据与监控',
  groupSystem: '系统配置',
  // items
  dashboard: '数据看板',
  users: '用户',
  admins: '管理员',
  devTitle: '开发者',
  projects: '项目',
  agents: '智能体',
  menuVirtualCompanies: '虚拟公司',
  menuNotifications: '通知',
  crawler: '爬虫',
  auditLogs: '审计日志',
  auditOverview: '审计概览',
  tokens: 'Token 用量',
  payment: '支付设置',
  advancedSettings: '高级设置',
  settings: '常规设置',
};

const STORAGE_KEY = 'admin-sidebar-expanded';

function safeTranslate(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
  try {
    const v = t(key);
    return typeof v === 'string' && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

interface AdminSidebarProps {
  /** 强制折叠（窄屏） */
  forceCollapsed?: boolean;
}

export default function AdminSidebar({ forceCollapsed = false }: AdminSidebarProps) {
  const t = useTranslations('admin');
  const pathname = usePathname();

  // 当前激活路径所在的分组 key
  const activeGroupKey = useMemo(() => {
    for (const g of ADMIN_MENU_GROUPS) {
      if (g.items.some((it) => pathname === it.path || pathname?.startsWith(it.path + '/'))) {
        return g.labelKey;
      }
    }
    return null;
  }, [pathname]);

  // 已展开的分组集合（持久化到 localStorage）
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  // 从 localStorage 恢复
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr)) setExpandedKeys(new Set(arr));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // 当 active group 变化时，确保它被展开
  useEffect(() => {
    if (!hydrated || !activeGroupKey) return;
    setExpandedKeys((prev) => {
      if (prev.has(activeGroupKey)) return prev;
      const next = new Set(prev);
      next.add(activeGroupKey);
      return next;
    });
  }, [hydrated, activeGroupKey]);

  // 持久化
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedKeys)));
    } catch {
      /* ignore */
    }
  }, [expandedKeys, hydrated]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // 内部 collapsed 状态（用户手动控制）
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = forceCollapsed || internalCollapsed;

  // 已折叠模式：只显示图标列
  if (collapsed) {
    return (
      <aside
        className="w-16 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col py-3 shrink-0"
        aria-label="Admin 侧栏"
      >
        <div className="flex justify-center mb-2">
          <button
            onClick={() => setInternalCollapsed(false)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="展开侧栏"
            title="展开侧栏"
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>
        {ADMIN_MENU_GROUPS.map((g) => {
          const Icon = g.icon;
          const isActive = activeGroupKey === g.labelKey;
          // 折叠模式：点击图标展开并跳转到该组第一个菜单项
          const firstItem = g.items[0];
          return (
            <Link
              key={g.labelKey}
              href={firstItem.path}
              className={`relative w-10 h-10 mx-auto my-0.5 rounded-lg flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              title={safeTranslate(t, g.labelKey, LABEL_FALLBACK[g.labelKey] ?? g.labelKey)}
              aria-label={safeTranslate(t, g.labelKey, LABEL_FALLBACK[g.labelKey] ?? g.labelKey)}
            >
              <Icon size={18} />
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-600 dark:bg-blue-400 rounded-r" />
              )}
            </Link>
          );
        })}
      </aside>
    );
  }

  return (
    <aside
      className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0"
      aria-label="Admin 侧栏"
    >
      {/* Header: Logo + 折叠按钮 */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
            <Shield className="text-white" size={14} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {safeTranslate(t, 'layoutTitle', 'Admin Console')}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
              v2.3 IDE
            </div>
          </div>
        </div>
        <button
          onClick={() => setInternalCollapsed(true)}
          className="w-7 h-7 rounded flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0"
          aria-label="折叠侧栏"
          title="折叠侧栏"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      {/* Tree */}
      <nav className="flex-1 overflow-y-auto py-2">
        {ADMIN_MENU_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          const isExpanded = expandedKeys.has(group.labelKey);
          const isActiveGroup = activeGroupKey === group.labelKey;
          const groupLabel = safeTranslate(t, group.labelKey, LABEL_FALLBACK[group.labelKey] ?? group.labelKey);

          return (
            <div key={group.labelKey} className="mb-0.5">
              {/* 分组标题（点击切换展开） */}
              <button
                onClick={() => toggleGroup(group.labelKey)}
                aria-expanded={isExpanded}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                  isActiveGroup
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {isExpanded ? (
                  <ChevronDown size={12} className="shrink-0 text-gray-400" />
                ) : (
                  <ChevronRight size={12} className="shrink-0 text-gray-400" />
                )}
                <GroupIcon size={13} className="shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
                  {groupLabel}
                </span>
              </button>

              {/* 子项 */}
              {isExpanded && (
                <ul className="mt-0.5 mb-2">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                    const itemLabel = safeTranslate(t, item.labelKey, LABEL_FALLBACK[item.labelKey] ?? item.labelKey);

                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center gap-2 pl-9 pr-3 py-1.5 mx-2 rounded-md text-sm transition-colors ${
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <ItemIcon size={14} className="shrink-0" />
                          <span className="truncate">{itemLabel}</span>
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer: 版本信息 */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>{safeTranslate(t, 'adminReady', '系统就绪')}</span>
        </div>
      </div>
    </aside>
  );
}
