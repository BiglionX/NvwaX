'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Store, Folder, Home, User, LogIn, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const publicMenuItems = [
  { label: '首页', icon: Home, path: '/' },
  { label: 'Agent 搜索', icon: Search, path: '/search' },
  { label: 'Agent 广场', icon: Store, path: '/marketplace' },
  { label: 'Nvwa', icon: Sparkles, path: '/nvwa' }
];

const privateMenuItems = [
  { label: '我的项目', icon: Folder, path: '/projects' },
  { label: '用户中心', icon: User, path: '/profile' }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, userInfo, logout } = useAuth();

  // 处理登出
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 fixed left-0 top-16 bottom-0 overflow-y-auto flex flex-col z-40">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">NvwaX</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI Agent Platform</p>
      </div>

      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {/* 公共菜单 */}
          {publicMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
            
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

          {/* 私有菜单（仅登录后显示） */}
          {isLoggedIn && (
            <>
              <li className="pt-4 pb-2">
                <div className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  个人空间
                </div>
              </li>
              {privateMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                
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
            </>
          )}
        </ul>
      </nav>

      {/* 底部登录/用户信息区域 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {isLoggedIn ? (
          <div className="space-y-3">
            {/* 用户信息 */}
            <div className="px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {userInfo?.name?.charAt(0).toUpperCase() || userInfo?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {userInfo?.name || '用户'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userInfo?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* 登出按钮 */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>退出登录</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200"
          >
            <LogIn size={18} />
            <span>登录 / 注册</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
