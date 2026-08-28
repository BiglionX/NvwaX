import { test, expect } from '@playwright/test';

/**
 * Marketplace e2e smoke tests (nvwax-web, public routes only).
 *
 * What this covers:
 *   - `/[locale]/marketplace` listing page renders + category filter buttons work
 *   - `/[locale]/marketplace/team-skills/[id]` detail page (happy + fallback)
 *   - i18n routing: English locale path works
 *
 * What this intentionally does NOT cover:
 *   - `/marketplace/aiteams/[id]` and `/marketplace/agents/[id]` — these route
 *     segments don't exist in this app. Links to `/marketplace/aiteams/[id]`
 *     appear in the listing card when an aiteam is published, but the
 *     destination directory has no `page.tsx`. Skipped on purpose.
 *   - `/marketplace/plugins/[id]` — same reason, no route.
 *   - 404 assertions on the detail page — the detail view renders a fallback
 *     in zh-CN instead of calling `notFound()`, so the HTTP status stays 200.
 *
 * Mock data:
 *   - The `detail page renders` happy-path test stubs the team-skill API
 *     response with `e2e/fixtures/mockTeamSkill.json` via Playwright's
 *     `page.route()`. No real backend needed for that single assertion.
 */

const FIXTURE_PATH = '**/api/team-skills/*';

test.describe('Marketplace Pages', () => {
  test.describe('Listing page', () => {
    test('English marketplace loads and shows category filters', async ({ page }) => {
      await page.goto('/en/marketplace');

      // H1 from next-intl `t('title')` → "AI Team Market"
      await expect(page.locator('h1').first()).toContainText(/market/i);

      // Category filter buttons. They are <button>, not <a> links, so use role + name.
      // Labels come from `t('all' | 'agents' | 'aiteams' | ...)` in messages/en.json.
      await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /ai partners/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /ai companies/i })).toBeVisible();
    });

    test('default locale (zh) marketplace renders without /en prefix', async ({ page }) => {
      // routing.ts: defaultLocale='zh', localePrefix='as-needed' → `/marketplace` is zh.
      await page.goto('/marketplace');

      await expect(page.locator('h1').first()).toBeVisible();
      // The zh H1 comes from messages/zh.json `marketplace.title` ("AI 团队市场")
      // — match loosely so future copy tweaks don't break this smoke check.
      await expect(page.locator('h1').first()).not.toBeEmpty();
    });

    test('invalid locale segment falls back gracefully (no crash)', async ({ page }) => {
      // /zh-CN/marketplace is NOT a registered locale. next-intl will either
      // rewrite or render a not-found. Either way the page must not 500.
      const response = await page.goto('/zh-CN/marketplace');
      expect(response, 'navigation response').not.toBeNull();
      // Acceptable: 200 (rewrite to /zh or /) or 404 (clean not-found).
      const status = response!.status();
      expect([200, 404]).toContain(status);
    });
  });

  test.describe('Team-skill detail page', () => {
    test('falls back to "not found" UI for missing id (200, not 404)', async ({ page }) => {
      // The detail page does NOT call notFound() — it renders a hardcoded
      // zh-CN fallback heading. HTTP status remains 200.
      const response = await page.goto('/en/marketplace/team-skills/nonexistent-id-12345');
      expect(response?.status()).toBe(200);
      // Fallback heading is hardcoded in TeamSkillDetailView.tsx (zh-CN text).
      await expect(page.getByText('未找到团队技能')).toBeVisible();
      // Should also offer a link back to the listing.
      await expect(page.getByRole('link', { name: /返回 AI 团队市场/i })).toBeVisible();
    });

    test('renders skill detail when API returns data (mocked)', async ({ page }) => {
      // Stub the team-skill API so the detail view has data to render.
      // Pattern matches both `/team-skills/<id>` and any query string variants.
      await page.route(FIXTURE_PATH, async (route) => {
        const fixture = await import('./fixtures/mockTeamSkill.json');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: fixture.default }),
        });
      });

      await page.goto('/en/marketplace/team-skills/agent-test-123');

      // H1 is `skill.name` → "Test Marketing Bot"
      await expect(page.getByRole('heading', { name: 'Test Marketing Bot', level: 1 })).toBeVisible();
      // Category badge shows when skill.category === 'virtual-company'.
      await expect(page.getByText('AI 公司')).toBeVisible();
    });
  });
});
