'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Home, User, LogIn, LogOut, Menu, X, Award, ClipboardList, Sparkles, Store } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import NotificationDropdown from '../notification-dropdown';

const navItems = [
  { label: '首页', icon: Home, path: '/' },
  { label: 'Nvwa', icon: Sparkles, path: '/nvwa' },
  { label: 'Agent广场', icon: Store, path: '/marketplace' },
  { label: '悬赏', icon: Award, path: '/bounties' },
  // { label: 'API', icon: FileText, path: '/api/docs' }, // API 文档页面暂未实现
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, userInfo, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 处理登出
  const handleLogout = () => {
    logout();
    router.push('/login');
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <Image
                  src="/logo.png"
                  alt="NvwaX Logo"
                  fill
                  sizes="(max-width: 768px) 40px, 40px"
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">NvwaX</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1 flex-1 justify-center min-w-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-colors text-sm whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Actions */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {isLoggedIn ? (
              <>
                {/* 通知下拉组件 */}
                <NotificationDropdown />
                
                <Link
                  href="/my-bounties"
                  className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 text-sm whitespace-nowrap"
                >
                  <ClipboardList size={16} />
                  <span className="font-medium">我的悬赏</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm whitespace-nowrap"
                >
                  <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {userInfo?.name?.charAt(0).toUpperCase() || userInfo?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="font-medium text-gray-700 dark:text-gray-300 max-w-30 truncate">
                    {userInfo?.name || userInfo?.email || '用户'}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  <LogOut size={16} />
                  <span>退出</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200"
              >
                <LogIn size={18} />
                <span>登录</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}

            {isLoggedIn && (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <User size={20} />
                  <span className="font-medium">用户中心</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <LogOut size={20} />
                  <span className="font-medium">退出登录</span>
                </button>
              </>
            )}

            {!isLoggedIn && (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg mt-4"
              >
                <LogIn size={20} />
                <span>登录 / 注册</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
