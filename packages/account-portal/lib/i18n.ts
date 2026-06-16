/**
 * Tiny i18n helper.
 *
 * Sprint 2: bundle-time only; we ship a JSON lookup + Accept-Language fallback.
 * If we ever need to fetch translations at runtime, swap this for next-intl.
 */

import zhCN from '@/messages/zh-CN.json';
import enUS from '@/messages/en-US.json';

export type Locale = 'zh-CN' | 'en-US';

const BUNDLES: Record<Locale, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export function detectLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return 'zh-CN';
  const lower = acceptLanguage.toLowerCase();
  if (lower.includes('zh')) return 'zh-CN';
  if (lower.includes('en')) return 'en-US';
  return 'zh-CN';
}

export function pickLocale(value: string | null | undefined): Locale {
  if (value === 'en-US' || value === 'zh-CN') return value;
  return 'zh-CN';
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const bundle = BUNDLES[locale] ?? BUNDLES['zh-CN'];
  let template = bundle[key] ?? BUNDLES['zh-CN'][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return template;
}

/** Client-side hook: read locale from cookie / localStorage / navigator. */
export function useLocale(): Locale {
  if (typeof document === 'undefined') return 'zh-CN';
  const fromCookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('pc_locale='))
    ?.split('=')[1];
  if (fromCookie) return pickLocale(fromCookie);
  const fromStorage = typeof localStorage !== 'undefined' ? localStorage.getItem('pc_locale') : null;
  if (fromStorage) return pickLocale(fromStorage);
  if (typeof navigator !== 'undefined') {
    return detectLocale(navigator.language);
  }
  return 'zh-CN';
}

export function setLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') return;
  // 1 year; SameSite=Lax is the default in modern browsers
  document.cookie = `pc_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  try {
    localStorage.setItem('pc_locale', locale);
  } catch {
    // ignore quota errors
  }
}

export const ALL_LOCALES: Locale[] = ['zh-CN', 'en-US'];
