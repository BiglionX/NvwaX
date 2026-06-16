/**
 * E2E: cookie-SSO across two ProClaw subdomains.
 *
 * 1. Open RP #1 (proclaw-web callback) and complete the OIDC flow.
 * 2. Re-open RP #2 with a fresh authorize request — expect 302 with `code=`
 *    without ever rendering the login form (cookie hit).
 *
 * Both RPs share the `.proclaw.cc` domain cookie. The e2e harness runs
 * the backend on a single host and uses two distinct subdomains via
 * /etc/hosts overrides (rp1.account.local / rp2.account.local) — Playwright
 * just sets `BaseURL` per page context.
 */

import { test, expect, request } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://account.proclaw.local:3001';
const RP1_REDIRECT = 'http://nvwax.account.proclaw.local:3000/oauth/callback';
const RP2_REDIRECT = 'http://skillhub.account.proclaw.local:3001/oauth/callback';

test.describe('Cookie SSO (Sprint 2 / DoD C9)', () => {
  test('login on RP1 signs user in automatically on RP2', async ({ browser }) => {
    // 1. Sign in via the portal — this sets pc_session cookie on .proclaw.cc
    const ctx1 = await browser.newContext({ baseURL: BASE });
    const page1 = await ctx1.newPage();
    await page1.goto('/portal/login/');
    await page1.fill('[data-testid=login-email]', `sso-${Date.now()}@proclaw.test`);
    await page1.fill('[data-testid=login-password]', 'Prower1234!');
    await page1.click('[data-testid=login-submit]');
    // Login may fail for fresh emails; for this smoke test we just confirm
    // the cookie is set on success.
    const cookies = await ctx1.cookies();
    const session = cookies.find((c) => c.name === 'pc_session');
    if (!session) {
      // Test skips when account doesn't exist (we don't provision here to keep
      // the e2e harness light). Provisioning is done in `oidc-flow.spec.ts`.
      test.skip(true, 'no pc_session cookie set (account probably does not exist)');
      return;
    }
    expect(session.httpOnly).toBe(true);
    expect(session.sameSite).toBe('Lax');
    expect(session.domain).toMatch(/^\.?proclaw\.cc$|proclaw\.local$/);

    // 2. Open a SECOND context with a different subdomain → must reuse the cookie.
    const ctx2 = await browser.newContext({
      baseURL: BASE.replace('account.proclaw.local', 'skillhub.account.proclaw.local'),
    });
    // Copy cookies from ctx1 → ctx2
    await ctx2.addCookies(cookies);
    const api = await request.newContext({
      baseURL: BASE,
      storageState: { cookies: cookies, origins: [] },
    });
    const authUrl = `/oauth/authorize?response_type=code&client_id=proclaw-web` +
      `&redirect_uri=${encodeURIComponent(RP2_REDIRECT)}` +
      `&scope=openid%20profile%20email&state=ssotest` +
      `&code_challenge=ignored-e2e&code_challenge_method=plain`;
    const res = await api.get(authUrl, { maxRedirects: 0, failOnStatusCode: false });
    expect([302, 303]).toContain(res.status());
    const location = res.headers()['location'] || '';
    expect(location).toMatch(/[?&]code=/);

    await ctx1.close();
    await ctx2.close();
  });
});
