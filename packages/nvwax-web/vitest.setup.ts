import { vi } from 'vitest';

// 默认测试环境变量（happy-dom 下没有 next-intl 等）
process.env.NEXT_PUBLIC_OIDC_ISSUER ||= 'https://idp.test';
process.env.NEXT_PUBLIC_OIDC_CLIENT_ID ||= 'nvwax-web';
process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI ||= 'https://app.test/oauth/callback';
process.env.NEXT_PUBLIC_SITE_URL ||= 'https://app.test';

// cookie-crypto 单测需要 32 字节 base64 secret（tests 中也会重置）
if (!process.env.OIDC_SESSION_SECRET) {
  process.env.OIDC_SESSION_SECRET = Buffer.from('a'.repeat(32)).toString('base64');
}

// route.ts proxy 转发目标（tests 中也会重置）
if (!process.env.NEXT_PUBLIC_API_URL) {
  process.env.NEXT_PUBLIC_API_URL = 'http://upstream.test/api';
}

// React 19 act 环境标志：让 happy-dom 下 useEffect/useState 在 act() 中正常 flush
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.resetModules();
