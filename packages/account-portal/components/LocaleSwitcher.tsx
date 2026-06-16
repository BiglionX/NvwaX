'use client';

import { Locale, setLocaleCookie, ALL_LOCALES, translate } from '@/lib/i18n';

type Props = {
  current: Locale;
};

const LABELS: Record<Locale, string> = {
  'zh-CN': '中文',
  'en-US': 'EN',
};

export function LocaleSwitcher({ current }: Props) {
  return (
    <span className="pc-locale-switcher" aria-label="Language">
      {ALL_LOCALES.map((loc, idx) => (
        <span key={loc}>
          <a
            href="#"
            aria-current={current === loc ? 'true' : undefined}
            onClick={(e) => {
              e.preventDefault();
              setLocaleCookie(loc);
              window.location.reload();
            }}
          >
            {LABELS[loc]}
          </a>
          {idx < ALL_LOCALES.length - 1 ? <span aria-hidden="true"> · </span> : null}
        </span>
      ))}
    </span>
  );
}

// Re-export translate so server components in /app/* can import from one place.
export { translate };
