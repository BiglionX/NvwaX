'use client';

import { useMemo } from 'react';
import { ProClawLogo } from '@/components/ProClawLogo';
import { Locale, useLocale, translate } from '@/lib/i18n';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

/**
 * Client-side shell wrapping the auth portal pages.
 *
 * Reads the locale cookie / localStorage / navigator at hydration time and
 * passes it to the localized children. Renders the shared card chrome
 * (logo + footer + locale switcher).
 *
 * Note: we intentionally inline the cookie read here instead of using
 * useEffect so the first render after hydration already shows the correct
 * locale and avoids a one-frame English flash.
 */
export function RootShell({ children }: { children: React.ReactNode }) {
  const locale: Locale = useLocale();
  const year = useMemo(() => new Date().getFullYear(), []);
  return (
    <div className="pc-shell">
      <div className="pc-card">
        <header className="pc-card__header">
          <ProClawLogo size={42} />
        </header>
        {children}
        <footer className="pc-footer">
          <span>{translate(locale, 'footer.copyright', { year })}</span>
          <LocaleSwitcher current={locale} />
        </footer>
      </div>
    </div>
  );
}

export default RootShell;
