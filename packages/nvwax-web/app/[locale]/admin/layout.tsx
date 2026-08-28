'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shield } from 'lucide-react';
import ProtectedAdminRoute from '@/components/Auth/ProtectedAdminRoute';
import AdminSidebar from '@/components/Admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAdminRoute>
      <AdminContent>{children}</AdminContent>
    </ProtectedAdminRoute>
  );
}

function AdminContent({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin');
  const pathname = usePathname();

  // 登录页不显示侧栏
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // 当前页标题（取自 pathname 末段）
  const currentTitle = (() => {
    const seg = pathname?.split('/').filter(Boolean).pop() ?? '';
    return seg.replace(/-/g, ' ');
  })();

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* v2.3 IDE 风格多级树侧栏 */}
      <AdminSidebar />

      {/* 主区 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="text-blue-600 dark:text-blue-400 shrink-0" size={16} />
            <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {t('layoutTitle')}
            </h1>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate capitalize">
              {currentTitle}
            </span>
          </div>
          <div className="flex-1" />
          <div className="text-[11px] text-gray-400 dark:text-gray-500 hidden md:block">
            {(() => {
              try {
                const v = t('layoutHint');
                return typeof v === 'string' && v.length > 0 ? v : '所有操作记录在审计日志中';
              } catch {
                return '所有操作记录在审计日志中';
              }
            })()}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
