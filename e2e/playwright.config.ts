/**
 * Playwright config for ProClaw account portal e2e.
 *
 * The base URL points at the public IdP. In CI, run a dev stack (MailPit +
 * backend + static portal export) and set PLAYWRIGHT_BASE_URL=http://account.proclaw.cc
 * (or whatever the local hostname is).
 */

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';

export default defineConfig({
  testDir: './',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,                 // portal flows share the same mailbox
  workers: 1,                           // serial to avoid colliding on MailPit
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
