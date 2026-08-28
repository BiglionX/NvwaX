import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e configuration for nvwax-web.
 *
 * Scope:
 *   - Public marketplace pages only (`/marketplace`, `/marketplace/team-skills/[id]`).
 *   - Detail pages under `/dashboard`, `/projects`, etc. are excluded by design —
 *     they require OIDC session cookies and belong to integration tests.
 *
 * Running:
 *   - `pnpm e2e`            headless against http://localhost:3000 (assumes dev server is up)
 *   - `pnpm e2e:ui`         same, with Playwright Inspector
 *   - `PLAYWRIGHT_NO_SERVER=1 pnpm e2e`  skip `webServer` (CI already started dev)
 *
 * Caveats (Sprint 2.5):
 *   - The detail page does NOT call `notFound()` for missing skills — it renders a
 *     fallback UI in zh-CN. Do NOT assert HTTP 404 against this route; assert on
 *     the rendered fallback heading instead.
 *   - Tab buttons use the i18n label `t('agents')` → "AI Partners" (en) /
 *     "智能体" (zh). Tests below match against the visible text, not the i18n key.
 *   - Locales are ['zh', 'en'] with defaultLocale 'zh' and `localePrefix: 'as-needed'`,
 *     so `/marketplace` is Chinese and `/en/marketplace` is English.
 *     `/zh-CN/marketplace` will NOT match — use `/marketplace` or `/zh/marketplace`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
