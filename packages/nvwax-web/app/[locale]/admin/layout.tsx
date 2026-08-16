'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Shield, LayoutDashboard, Users, Settings, Database, Folder, Bot, Building2, Bell, FileText, Coins, CreditCard, Code } from 'lucide-react';
import ProtectedAdminRoute from '@/components/Auth/ProtectedAdminRoute';

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
  
  console.log('[AdminLayout] Rendering, pathname:', pathname);

  const menuItems = [
    { label: t('dashboard'), icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: t('users'), icon: Users, path: '/admin/users' },
    { label: t('projects'), icon: Folder, path: '/admin/projects' },
    { label: t('agents'), icon: Bot, path: '/admin/agents' },
    { label: t('menuVirtualCompanies'), icon: Building2, path: '/admin/virtual-companies' },
    { label: t('menuNotifications'), icon: Bell, path: '/admin/notifications' },
    { label: t('auditLogs'), icon: FileText, path: '/admin/audit-logs' },
    { label: t('crawler'), icon: Database, path: '/admin/crawler' },
    { label: t('admins'), icon: Shield, path: '/admin/admins' },
    { label: t('devTitle'), icon: Code, path: '/admin/developers' },
    { label: t('tokens'), icon: Coins, path: '/admin/tokens' },
    { label: t('payment'), icon: CreditCard, path: '/admin/payment-settings' },
    { label: t('settings'), icon: Settings, path: '/admin/settings' }
  ];

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-blue-600 dark:text-blue-400" size={28} />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('layoutTitle')}</h1>
          </div>
          
          {/* 用户状态和退出登录功能已在顶部导航栏提供 */}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-73px)]">
          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
