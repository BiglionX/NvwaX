'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { User as UserIcon, Folder, Award, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function UserCenterLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const menuItems = [
    { label: '个人信息', icon: UserIcon, path: '/profile' },
    { label: '我的Agent仓库', icon: Folder, path: '/agent-repository' },
    { label: '我的悬赏', icon: Award, path: '/my-bounties' },
    { label: '账号设置', icon: Settings, path: '/settings' }
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧 - 导航菜单 */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4 sticky top-6">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <UserIcon className="text-blue-600 dark:text-blue-400" size={20} />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">用户中心</h2>
            </div>
            
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all"
              >
                <LogOut size={18} />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>

        {/* 右侧 - 内容区域 */}
        <div className="lg:col-span-8">
          {children}
        </div>
      </div>
    </div>
  );
}
