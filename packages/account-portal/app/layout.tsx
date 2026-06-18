import type { Metadata } from 'next';
import '@/styles/globals.css';
import { RootShell } from '@/components/RootShell';

/**
 * Root layout for the ProClaw account portal.
 *
 * The HTML lang attribute is synced to the active locale via an inline
 * bootstrap <script> in <head> that runs before first paint. The static
 * export cannot read Accept-Language at build time, so we hydrate it
 * client-side as early as possible.
 */

export const metadata: Metadata = {
  title: 'ProClaw · Account',
  description: 'Sign in, register, or activate your ProClaw account.',
  applicationName: 'ProClaw Account Portal',
  robots: { index: false, follow: false },
  icons: { icon: '/portal/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Inline bootstrap: read pc_locale from cookie / localStorage / navigator and
  // sync <html lang> BEFORE first paint. Static export can't read Accept-Language
  // server-side, so we apply it client-side as early as possible to avoid a
  // wrong-lang flash and to keep assistive tech happy.
  const langBootstrap = `(function(){try{var c=document.cookie.split('; ').find(function(r){return r.indexOf('pc_locale=')===0;});var v=c?c.split('=')[1]:(localStorage.getItem('pc_locale')||(navigator.language||'zh-CN'));if(v!=='en-US'&&v!=='zh-CN')v='zh-CN';document.documentElement.lang=v;}catch(e){document.documentElement.lang='zh-CN';}})();`;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: langBootstrap }} />
      </head>
      <body>
        <RootShell>{children}</RootShell>
      </body>
    </html>
  );
}
