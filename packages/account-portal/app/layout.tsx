import type { Metadata } from 'next';
import '@/styles/globals.css';
import { ProClawLogo } from '@/components/ProClawLogo';
import { Locale, useLocale } from '@/lib/i18n';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

/**
 * Root layout for the ProClaw account portal.
 *
 * The HTML lang attribute is set client-side by `RootShell` after hydration
 * because the static export cannot read the user's Accept-Language header
 * at build time.
 */

export const metadata: Metadata = {
  title: 'ProClaw · Account',
  description: 'Sign in, register, or activate your ProClaw account.',
  applicationName: 'ProClaw Account Portal',
  robots: { index: false, follow: false },
  icons: { icon: '/portal/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  // We deliberately read the locale client-side; SSR can't access browser hints.
  const locale: Locale = typeof document === 'undefined' ? 'zh-CN' : useLocale();
  const year = new Date().getFullYear();
  return (
    <div className="pc-shell">
      <div className="pc-card">
        <header className="pc-card__header">
          <ProClawLogo size={42} />
        </header>
        {children}
        <footer className="pc-footer">
          <span>© {year} ProClaw. All rights reserved.</span>
          <LocaleSwitcher current={locale} />
        </footer>
      </div>
    </div>
  );
}
