/**
 * E2E: full OIDC flow against a running ProClaw IdP.
 *
 *   1. Authorize (gets redirected through the IdP login UI)
 *   2. Token exchange (authorization_code grant)
 *   3. UserInfo
 *   4. Refresh token rotation
 *   5. Logout
 *
 * Assumes:
 *   - `pnpm dev` is running on PLAYWRIGHT_BASE_URL (default http://localhost:3001)
 *   - A registered user exists (env E2E_USERNAME / E2E_PASSWORD) — fixture
 *     creates one via /api/portal/register before the test runs.
 */

import { test, expect, request, APIRequestContext } from '@playwright/test';

const CLIENT_ID = 'proclaw-web';
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';
const SCOPE = 'openid profile email';

async function provisionUser(): Promise<{ email: string; password: string }> {
  const api = await request.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001' });
  const email = `e2e-${Date.now()}@proclaw.test`;
  const password = 'Prower1234!';
  const res = await api.post('/api/portal/register', {
    data: { email, password, locale: 'en-US' },
  });
  // 201 created OR 409 already exists
  expect([201, 409]).toContain(res.status());
  // Activate via MailPit (we assume the test harness pulls the message
  // and exposes its activation link via the `ACTIVATE_URL` env var)
  if (process.env.ACTIVATE_URL) {
    const activate = await api.post(process.env.ACTIVATE_URL);
    expect([200, 409]).toContain(activate.status());
  }
  await api.dispose();
  return { email, password };
}

test.describe('OIDC full flow (Sprint 2)', () => {
  test('authorize → token → userinfo → refresh → logout', async ({ page }) => {
    const { email, password } = await provisionUser();

    // 1. Authorize via the browser — this exercises the cookie path.
    const verifier = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
    const challenge = 'challenge-not-validated-by-e2e'; // IdP will validate in real flow; this is a stub
    // For a proper PKCE flow we'd compute base64url(sha256(verifier)); for the
    // e2e harness we use plain so the IdP accepts the literal.
    const authUrl = `/oauth/authorize?response_type=code&client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(SCOPE)}&state=xyz` +
      `&code_challenge=${challenge}&code_challenge_method=plain`;

    await page.goto(authUrl);
    // If user is already logged in via pc_session cookie we'll land on redirect_uri.
    // Otherwise we need to fill the login form. Both are valid in the e2e harness.
    if (page.url().startsWith(REDIRECT_URI)) {
      // SSO fast-path — nothing more to do for step 1.
    } else {
      await page.fill('input[type=email]', email);
      await page.fill('input[type=password]', password);
      await page.click('button[type=submit]');
      await page.waitForURL(/^http:\/\/localhost:3000\/oauth\/callback/);
    }

    const url = new URL(page.url());
    const code = url.searchParams.get('code');
    expect(code, 'authorization code should be present').toBeTruthy();

    // 2. Token exchange (POST /oauth/token)
    const api: APIRequestContext = await request.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    });
    const tokenRes = await api.post('/oauth/token', {
      form: {
        grant_type: 'authorization_code',
        code: code!,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: verifier,
      },
    });
    expect(tokenRes.status(), 'token endpoint returns 200').toBe(200);
    const tokenJson = await tokenRes.json();
    expect(tokenJson.access_token, 'access_token present').toBeTruthy();
    expect(tokenJson.id_token, 'id_token present').toBeTruthy();
    expect(tokenJson.refresh_token, 'refresh_token present').toBeTruthy();
    expect(tokenJson.token_type).toBe('Bearer');

    // 3. UserInfo
    const userinfoRes = await api.get('/oauth/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    expect(userinfoRes.status()).toBe(200);
    const userinfo = await userinfoRes.json();
    expect(userinfo.sub).toBeTruthy();
    expect(userinfo.email).toBe(email);

    // 4. Refresh
    const refreshRes = await api.post('/oauth/token', {
      form: {
        grant_type: 'refresh_token',
        refresh_token: tokenJson.refresh_token,
        client_id: CLIENT_ID,
      },
    });
    expect(refreshRes.status()).toBe(200);
    const refreshed = await refreshRes.json();
    expect(refreshed.access_token).toBeTruthy();
    expect(refreshed.refresh_token).not.toEqual(tokenJson.refresh_token); // rotation

    // 5. Logout
    const logoutRes = await api.post('/oauth/logout', {
      form: { refresh_token: refreshed.refresh_token },
    });
    expect(logoutRes.status()).toBe(200);

    await api.dispose();
  });
});
