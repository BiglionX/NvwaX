/**
 * Sprint 2.2.1 Task 8 — 浏览器视角 OIDC 闭环 e2e
 *
 * 从 nvwax-web (port 3000) 视角走完整登录：
 *   1. 打开 /zh/login
 *   2. 真实 user-click `[data-testid=proclaw-login-btn]`（原生 button，绕过 React 19 transition race）
 *   3. 浏览器跳到 http://localhost:3001/oauth/authorize?...
 *   4. 填写 dev 登录表单（dev-test@nvwax.local / DevTest2026!）
 *   5. 提交 → 302 → http://localhost:3000/oauth/callback?code=...
 *   6. CallbackClient 拿到 token → POST /api/auth/session 写 cookie → 跳 returnTo
 *   7. middleware 看到 cookie → 放行 /dashboard
 *
 * 前置：nvwax-server (3001) + nvwax-web (3000) 都在跑
 * 测试用户已 seed（dev-test@nvwax.local / DevTest2026!）
 */

import { test, expect, type Page } from '@playwright/test';

const RP_BASE = 'http://localhost:3000';
const IDP_BASE = 'http://localhost:3001';
const DEV_EMAIL = 'dev-test@nvwax.local';
const DEV_PASSWORD = 'DevTest2026!';

async function attachListeners(page: Page) {
  const errors: string[] = [];
  const logs: string[] = [];
  page.on('console', (msg) => {
    const text = `[console.${msg.type()}] ${msg.text()}`;
    logs.push(text);
    if (msg.type() === 'error') errors.push(text);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => {
    errors.push(`[requestfailed] ${req.method()} ${req.url()} — ${req.failure()?.errorText ?? 'unknown'}`);
  });
  page.on('response', (resp) => {
    if (resp.status() >= 400) {
      errors.push(`[response ${resp.status()}] ${resp.request().method()} ${resp.url()}`);
    }
  });
  return { errors, logs };
}

test('nvwax-web → IdP (nvwax-server) → callback → session cookie → protected route', async ({ page }) => {
  const { errors, logs } = await attachListeners(page);

  // ── 1. 打开登录页 ──
  await page.goto(`${RP_BASE}/zh/login`);
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
  const proclawBtn = page.locator('[data-testid="proclaw-login-btn"]');
  await proclawBtn.waitFor({ state: 'visible', timeout: 15_000 });
  // 等 React 19 hydration 把 onClick handler 装到原生 button 上
  // （避免 SSR HTML visible 但 React 还没 attach handler 导致 click 不触发）
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="proclaw-login-btn"]') as HTMLElement | null;
      if (!btn) return false;
      return Object.keys(btn).some(
        (k) => k.startsWith('__reactFiber') || k.startsWith('__reactProps'),
      );
    },
    null,
    { timeout: 15_000 },
  );

  // ── 2. 真实 user-click ──
  await proclawBtn.click();

  // ── 3. 等跳到 IdP /oauth/authorize ──
  await page.waitForURL(/\/oauth\/authorize/, { timeout: 20_000 });
  expect(page.url()).toContain(`${IDP_BASE}/oauth/authorize`);
  expect(page.url()).toMatch(/client_id=proclaw-web/);
  expect(page.url()).toMatch(/code_challenge_method=S256/);
  expect(page.url()).toMatch(/response_type=code/);

  // ── 4. 填 dev 登录表单 ──
  await page.locator('input[type=email]').fill(DEV_EMAIL);
  await page.locator('input[type=password]').fill(DEV_PASSWORD);
  await page.locator('button[type=submit]').click();

  // ── 5. 等 302 → 回调到 nvwax-web ──
  await page.waitForURL(/\/oauth\/callback/, { timeout: 20_000 });
  expect(page.url()).toContain(`${RP_BASE}/oauth/callback`);
  expect(page.url()).toMatch(/code=[A-Za-z0-9_-]+/);
  expect(page.url()).toMatch(/state=[A-Za-z0-9_-]+/);

  // ── 6. 等 CallbackClient 处理完成（写 cookie + 跳 returnTo） ──
  //    returnTo = /dashboard，所以 URL 应该离开 /oauth/callback 跳到 /dashboard
  try {
    await page.waitForURL((url) => !url.toString().includes('/oauth/callback'), {
      timeout: 20_000,
    });
  } catch (err) {
    // 已知 race：URL 实际已变（diagnostic 显示）但 waitForURL 还在等 'load' 事件
    // 此时直接验证 URL 已离开 /oauth/callback 即可
    const cur = page.url();
    if (cur.includes('/oauth/callback')) {
      const diag = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        bodyText: (document.body.innerText || '').slice(0, 500),
      })).catch(() => ({ url: 'eval-failed' }));
      console.log('[test] callback DOM at timeout:', JSON.stringify(diag));
      console.log('[test] ===== ALL browser console logs =====\n' + logs.join('\n'));
      throw err;
    }
    console.log('[test] step 6: URL already left /oauth/callback:', cur);
  }
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  // 给 callback 客户端 JS 跳转留时间（防止 page.goto 被未完成的 navigation 中断）
  await page.waitForTimeout(500);

  // ── 7. 验证：session cookie 存在且 httpOnly ──
  const cookies = await page.context().cookies();
  if (cookies.length === 0 || !cookies.find((c) => c.name === 'nvwax_oidc_session')) {
    console.log('[test] ===== ALL browser console logs =====\n' + logs.join('\n'));
    console.log('[test] cookies seen:', JSON.stringify(cookies));
    console.log('[test] current URL:', page.url());
  }
  const sessionCookie = cookies.find((c) => c.name === 'nvwax_oidc_session');
  expect(sessionCookie, 'nvwax_oidc_session cookie should exist after login').toBeTruthy();
  expect(sessionCookie!.httpOnly, 'session cookie must be httpOnly').toBe(true);
  expect(sessionCookie!.sameSite).toBe('Lax');

  // ── 8. 验证：受保护路径能进（middleware 放行） ──
  await page.goto(`${RP_BASE}/dashboard`);
  await page.waitForLoadState('networkidle', { timeout: 10_000 });
  expect(page.url(), 'should NOT be redirected back to /login').not.toMatch(/\/login/);

  // ── 9. 验证：/api/auth/session 报 isLoggedIn=true ──
  // 用 page.request 避免 page navigation 中断 evaluate context
  const apiResp = await page.request.get(`${RP_BASE}/api/auth/session`);
  const sessionCheck = { status: apiResp.status(), body: await apiResp.json() };
  expect(sessionCheck.status).toBe(200);
  expect(sessionCheck.body.isLoggedIn).toBe(true);
  expect(sessionCheck.body.userInfo).toBeTruthy();
  expect(sessionCheck.body.userInfo.sub).toBeTruthy();

  // ── 10. 验证：未登录时 middleware 弹回 /login?return= ──
  await page.context().clearCookies();
  // 等 chrome 把 step 9 的 fetch response 消化完（避免 clearCookies 后立即 goto 被 abort）
  await page.waitForTimeout(300);
  await page.goto(`${RP_BASE}/dashboard`);
  await page.waitForURL(/\/login\?return=/, { timeout: 10_000 });
  expect(page.url()).toMatch(/\/login\?return=%2Fdashboard/);

  // ── 11. 整个流程不应有非预期 console error ──
  // 允许的 error：
  //   - MISSING_MESSAGE（next-intl 部分翻译缺失，不影响功能）
  //   - /oauth/callback?error=（由 IdP 返回）
  //   - /api/notifications/unread-count 401（清 cookie 后前端组件 polling，这是预期）
  //   - /login 或 /en/login ERR_ABORTED（step 10 middleware 重定向抢断，原 GET 被 abort）
  const realErrors = errors.filter(
    (e) =>
      !/MISSING_MESSAGE/.test(e) &&
      !/\/oauth\/callback\?error=/.test(e) &&
      !/\/api\/notifications\/unread-count/.test(e) &&
      !/status of 401 \(Unauthorized\)/.test(e) &&
      !/GET .*\/login .*ERR_ABORTED/.test(e) &&
      !/GET .*\/en\/login .*ERR_ABORTED/.test(e),
  );
  if (realErrors.length > 0) {
    console.log('[test] ===== ALL browser console logs =====\n' + logs.join('\n'));
    console.log('[test] ===== UNEXPECTED errors =====\n' + realErrors.join('\n'));
  }
  expect(realErrors, `unexpected browser errors:\n${realErrors.join('\n')}`).toEqual([]);
});
