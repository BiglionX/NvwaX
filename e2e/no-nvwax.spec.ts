/**
 * E2E: the account-portal static export must not contain the word "NvwaX".
 *
 * Runs against the locally built static export under
 * packages/account-portal/out/, OR against a running portal via PLAYWRIGHT_BASE_URL.
 *
 * DoD B5 / B8 enforcement.
 */

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const PORTAL_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
const STATIC_DIR = path.resolve(__dirname, '..', 'packages', 'account-portal', 'out');

test.describe('No NvwaX in account-portal (Sprint 2 / DoD B5 / B8)', () => {
  test('static export directory does not contain "NvwaX"', () => {
    if (!fs.existsSync(STATIC_DIR)) {
      test.skip(true, 'No static export at packages/account-portal/out (run `pnpm --filter account-portal build` first)');
      return;
    }
    const offenders: string[] = [];
    const visit = (dir: string) => {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          visit(full);
          continue;
        }
        if (!/\.(html|js|css|json|svg|txt|xml)$/.test(name)) continue;
        const content = fs.readFileSync(full, 'utf8');
        if (/nvwax/i.test(content)) {
          offenders.push(full);
        }
      }
    };
    visit(STATIC_DIR);
    expect(offenders, `Found NvwaX reference(s) in: ${offenders.join('\n')}`).toEqual([]);
  });

  test('live /portal/login page does not contain "NvwaX" in rendered HTML', async ({ page }) => {
    const res = await page.goto(`${PORTAL_BASE}/portal/login/`);
    expect(res, 'portal login page is reachable').toBeTruthy();
    const html = await page.content();
    expect(html.toLowerCase(), 'portal HTML contains "nvwax"').not.toContain('nvwax');
    // Brand assertion (DoD B4)
    expect(html).toContain('ProClaw');
  });
});
