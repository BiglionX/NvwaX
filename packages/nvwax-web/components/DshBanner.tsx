'use client';

import { Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * DeepSeek Harness (DSH) 集成广告横幅
 *
 * 原为营销落地页 HomeClient 的一部分；首页改为产品工作台后，
 * 将其抽出为独立组件，展示在首页（及 /nvwa）工作台底部，避免丢失。
 * 边框加粗（border-2）提升可见度，配色适配浅色工作台背景。
 */
export default function DshBanner() {
  const t = useTranslations('homepage');

  return (
    <Link
      href="/dsh"
      className="group block w-full max-w-3xl mx-auto text-left overflow-hidden rounded-2xl border-2 border-violet-500/50 bg-linear-to-r from-violet-100/80 via-blue-100/70 to-sky-100/80 dark:from-violet-900/30 dark:via-blue-900/30 dark:to-sky-900/30 hover:border-violet-500 hover:from-violet-200/80 hover:via-blue-200/70 hover:to-sky-200/80 dark:hover:from-violet-900/50 dark:hover:via-blue-900/50 dark:hover:to-sky-900/50 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 active:scale-[0.99]"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
        {/* 左侧图标 */}
        <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-xl bg-linear-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-500/30 ring-1 ring-white/20">
          <Zap size={28} className="text-white" />
        </div>
        {/* 中部文案 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/40 text-violet-600 dark:text-violet-300 text-[11px] font-semibold uppercase tracking-wider">
              {t('dshBannerBadge')}
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">DeepSeek Harness</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug">
            {t('dshBannerTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300/90 mt-1 leading-relaxed">
            {t('dshBannerDesc')}
          </p>
        </div>
        {/* 右侧 CTA */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-linear-to-r from-violet-600 to-blue-600 group-hover:from-violet-500 group-hover:to-blue-500 text-white text-sm font-semibold transition-colors">
          {t('dshBannerCta')}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
