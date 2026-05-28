'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Link } from '@/src/i18n/navigation';
import { useRouter } from '@/src/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Home, User, LogIn, LogOut, Menu, X, Award, ClipboardList, Sparkles, Store } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAiSearch } from '@/contexts/AiSearchContext';
import { useState } from 'react';
import NotificationDropdown from '../notification-dropdown';
import LocaleSwitcher from '../LocaleSwitcher';

const getNavItems = (t: (key: string) => string) => [
  { label: t('nav.home'), icon: Home, path: '/' },
  { label: t('nav.nvwa'), icon: Sparkles, path: '/nvwa' },
  { label: t('nav.marketplace'), icon: Store, path: '/marketplace' },
  { label: t('nav.bounties'), icon: Award, path: '/bounties' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const { isLoggedIn, userInfo, logout } = useAuth();
  const { openAiSearch } = useAiSearch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 是否在首页（用于切换透明毛玻璃样式）
  const isHome = pathname === '/' || pathname === '/en';
  const navItems = getNavItems(t);

  // 处理登出
  const handleLogout = () => {
    logout();
    router.push('/login');
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`${
      isHome
        ? 'bg-transparent border-b border-white/10'
        : 'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'
    } sticky top-0 z-50 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-7 h-7">
                <Image
                  src="/logo.png"
                  alt="NvwaX Logo"
                  fill
                  sizes="(max-width: 768px) 28px, 28px"
                  className="object-contain"
                  priority
                />
              </div>
              <span className={`text-xl font-bold ${
                isHome
                  ? 'text-white'
                  : 'bg-linear-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent'
              }`}>NvwaX</span>
            </Link>
          </div>

          {/* AI 搜索按钮 - Logo 右侧 */}
          <div className="hidden lg:flex items-center ml-4">
            <button
              onClick={() => openAiSearch()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all text-sm font-medium shadow-sm hover:shadow-md whitespace-nowrap"
              title={t('nav.aiSearch')}
            >
              <Sparkles size={16} className="text-yellow-300" />
              <span>{t('nav.aiSearch')}</span>
            </button>
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
                      ? isHome
                        ? 'bg-white/15 text-white'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : isHome
                        ? 'text-white/80 hover:bg-white/10 hover:text-white'
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
            <LocaleSwitcher />
            {isLoggedIn ? (
              <>
                {/* 通知下拉组件 */}
                <NotificationDropdown />
                
                <Link
                  href="/my-bounties"
                  className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 text-sm whitespace-nowrap"
                >
                  <ClipboardList size={16} />
                  <span className="font-medium">{t('nav.myBounties')}</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm whitespace-nowrap"
                >
                  <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {userInfo?.name?.charAt(0).toUpperCase() || userInfo?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="font-medium text-gray-700 dark:text-gray-300 max-w-30 truncate">
                    {userInfo?.name || userInfo?.email || t('nav.defaultUser')}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  <LogOut size={16} />
                  <span>{t('nav.logout')}</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-all duration-200 ${
                  isHome
                    ? 'border border-white/30 text-white hover:bg-white/10'
                    : 'bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                }`}
              >
                <LogIn size={18} />
                <span>{t('nav.login')}</span>
              </Link>
            )}
          </div>

          {/* Mobile: AI 搜索 + 菜单按钮 */}
          <div className="lg:hidden flex items-center gap-1">
            <button
              onClick={() => openAiSearch()}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              title={t('nav.aiSearch')}
            >
              <Sparkles size={20} />
            </button>
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
        <div className={`lg:hidden border-t ${
          isHome
            ? 'border-white/10 bg-[#0c1028]/95 backdrop-blur-xl'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }`}>
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
                      ? isHome
                        ? 'bg-white/15 text-white'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : isHome
                        ? 'text-white/80 hover:bg-white/10'
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
                  <span className="font-medium">{t('nav.profile')}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <LogOut size={20} />
                  <span className="font-medium">{t('nav.logout')}</span>
                </button>
              </>
            )}

            {!isLoggedIn && (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-lg mt-4 ${
                  isHome
                    ? 'border border-white/30 text-white'
                    : 'bg-linear-to-r from-blue-600 to-blue-700 text-white'
                }`}
              >
                <LogIn size={20} />
                <span>{t('nav.login')} / {t('nav.register')}</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
