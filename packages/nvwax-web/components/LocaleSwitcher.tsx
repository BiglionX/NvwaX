'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/src/i18n/navigation';
import { useState, useTransition } from 'react';
import { Languages, Check } from 'lucide-react';

const locales = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const isHome = pathname === '/' || pathname === '/en';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-colors text-sm ${
          isHome
            ? 'text-white/80 hover:bg-white/10 hover:text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        aria-label="Switch language"
      >
        <Languages size={16} />
        <span className="hidden sm:inline">
          {locale === 'zh' ? '中文' : 'English'}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute right-0 mt-1 w-32 rounded-lg shadow-lg border py-1 z-50 ${
            isHome
              ? 'bg-[#0c1028]/95 backdrop-blur-xl border-white/10'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}>
            {locales.map((loc) => (
              <button
                key={loc.code}
                onClick={() => {
                  startTransition(() => {
                    router.replace(pathname, { locale: loc.code });
                  });
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                  locale === loc.code
                    ? isHome
                      ? 'text-blue-400 bg-white/10'
                      : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : isHome
                      ? 'text-white/80 hover:bg-white/10'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                } ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
                disabled={isPending}
              >
                <span>{loc.label}</span>
                {locale === loc.code && <Check size={14} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
