'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shield, LayoutDashboard, Users, Settings, LogOut, User, Database, Folder, Bot, Building2, Bell, FileText } from 'lucide-react';
import ProtectedAdminRoute from '@/components/Auth/ProtectedAdminRoute';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedAdminRoute>
      <AdminContent>{children}</AdminContent>
    </ProtectedAdminRoute>
  );
}

function AdminContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  console.log('[AdminLayout] Rendering, pathname:', pathname);
  
  // Lazily get admin username from localStorage (only runs on client)
  const [adminUsername] = useState(() => {
    if (typeof window === 'undefined') return 'Admin';
    try {
      const info = localStorage.getItem('admin_info');
      if (info) {
        const parsed = JSON.parse(info);
        return parsed.username || 'Admin';
      }
    } catch {
      // Ignore parse errors
    }
    return 'Admin';
  });

  const handleLogout = () => {
    // 清除所有认证状态
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    localStorage.removeItem('token');
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('userInfo');
    router.push('/admin/login');
  };

  const menuItems = [
    { label: '数据看板', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: '用户管理', icon: Users, path: '/admin/users' },
    { label: '项目管理', icon: Folder, path: '/admin/projects' },
    { label: 'Agent 管理', icon: Bot, path: '/admin/agents' },
    { label: '虚拟公司', icon: Building2, path: '/admin/virtual-companies' },
    { label: '通知中心', icon: Bell, path: '/admin/notifications' },
    { label: '审计日志', icon: FileText, path: '/admin/audit-logs' },
    { label: '爬虫管理', icon: Database, path: '/admin/crawler' },
    { label: '管理员管理', icon: Shield, path: '/admin/admins' },
    { label: '系统设置', icon: Settings, path: '/admin/settings' }
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">NvwaX 管理后台</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <User size={20} />
              <span className="font-medium">{adminUsername}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              退出登录
            </button>
          </div>
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
