'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Link } from '@/src/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Heart, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  const t = useTranslations();

  // 是否在首页（用于切换暗色星空样式）
  const isHome = pathname === '/' || pathname === '/en';

  const footerLinks = {
    product: [
      { label: t('nav.search'), href: '/search' },
      { label: t('nav.marketplace'), href: '/marketplace' },
      { label: t('nav.projects'), href: '/projects' },
      { label: t('nav.profile'), href: '/profile' },
    ],
    resources: [
      { label: 'Docs', href: 'https://github.com/BigLionX/NvwaX#readme', external: true },
      { label: 'FAQ', href: '/faq', external: false },
      { label: t('common.more'), href: 'https://github.com/BigLionX/NvwaX/tree/main/examples', external: true },
      { label: 'Changelog', href: 'https://github.com/BigLionX/NvwaX/releases', external: true },
    ],
    community: [
      { label: 'GitHub', href: 'https://github.com/BigLionX/NvwaX', external: true },
      { label: 'Issues', href: 'https://github.com/BigLionX/NvwaX/issues', external: true },
      { label: 'Discussions', href: 'https://github.com/BigLionX/NvwaX/discussions', external: true },
      { label: t('common.back'), href: 'mailto:1055603323@qq.com', external: true, icon: Mail },
    ],
    legal: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'License', href: 'https://github.com/BigLionX/NvwaX/blob/main/LICENSE', external: true },
    ],
  };

  return (
    <footer className={`${
      isHome
        ? 'bg-transparent border-t border-white/5'
        : 'bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700'
    } mt-auto transition-colors duration-300`}>
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10">
                <Image
                  src="/logo.png"
                  alt="NvwaX Logo"
                  fill
                  sizes="(max-width: 768px) 40px, 40px"
                  className="object-contain"
                />
              </div>
              <span className={`text-xl font-bold ${
                isHome ? 'text-white' : 'bg-linear-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent'
              }`}>NvwaX</span>
            </Link>
            <p className={`text-sm mb-4 ${
              isHome ? 'text-slate-400' : 'text-gray-600 dark:text-gray-400'
            }`}>
              开源的 AI Agent 搜索、发现和管理平台
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/BigLionX/NvwaX"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a
                href="mailto:1055603323@qq.com"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
              isHome ? 'text-white' : 'text-gray-900 dark:text-white'
            }`}>
              Products
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`text-sm transition-colors ${
                      isHome
                        ? 'text-slate-400 hover:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
              isHome ? 'text-white' : 'text-gray-900 dark:text-white'
            }`}>
              Resources
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className={`text-sm transition-colors ${
                      isHome
                        ? 'text-slate-400 hover:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
              isHome ? 'text-white' : 'text-gray-900 dark:text-white'
            }`}>
              Community
            </h3>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 text-sm transition-colors ${
                        isHome
                          ? 'text-slate-400 hover:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                    >
                      {Icon && <Icon size={16} />}
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`mt-12 pt-8 border-t ${
          isHome ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className={`text-sm ${
              isHome ? 'text-slate-400' : 'text-gray-600 dark:text-gray-400'
            }`}>
              © {currentYear} NvwaX. All rights reserved.
            </div>
            
            <div className="flex items-center gap-6">
              {footerLinks.legal.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  rel={link.external ? 'noopener noreferrer' : undefined}
                  className={`text-sm transition-colors ${
                    isHome
                      ? 'text-slate-400 hover:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className={`flex items-center gap-2 text-sm ${
              isHome ? 'text-slate-400' : 'text-gray-600 dark:text-gray-400'
            }`}>
              <span>Made with</span>
              <Heart size={16} className="text-red-500 fill-current" />
              <span>by Open Source Community</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
