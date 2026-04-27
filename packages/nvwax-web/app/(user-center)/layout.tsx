'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { User as UserIcon, Folder, Award, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Footer from '@/components/Layout/Footer';

export default function UserCenterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userInfo, logout } = useAuth();

  const menuItems = [
    { label: '个人信息', icon: UserIcon, path: '/profile' },
    { label: '我的项目', icon: Folder, path: '/projects' },
    { label: '我的悬赏', icon: Award, path: '/my-bounties' },
    { label: '我的 AiTeam', icon: Users, path: '/my-aiteam' },
    { label: '账号设置', icon: Settings, path: '/settings' }
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserIcon className="text-blue-600 dark:text-blue-400" size={20} />
            <h1 className="text-base font-semibold text-gray-900 dark:text-white">用户中心</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">{userInfo?.name || userInfo?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <LogOut size={14} />
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-44 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shrink-0">
          <nav className="p-2">
            <ul className="space-y-0.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                
                return (
                  <li key={item.path}>
                    <Link
                      href={item.path}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon size={15} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
