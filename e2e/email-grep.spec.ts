/**
 * E2E: email content validation.
 *
 * Pulls the most recent message from MailPit and asserts:
 *   - sender = "ProClaw 团队 <noreply@account.proclaw.cc>"
 *   - recipient matches the registration email
 *   - subject matches the localized activation template
 *   - body (HTML + text) does NOT contain "NvwaX"  (DoD B8)
 */

import { test, expect, request } from '@playwright/test';

const MAILPIT = process.env.MAILPIT_URL || 'http://localhost:8025';
const PORTAL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';

test.describe('Activation email (Sprint 2 / DoD B7 / B8)', () => {
  test('register → activation email arrives from ProClaw sender, no NvwaX mention', async () => {
    const api = await request.newContext({ baseURL: PORTAL });
    const email = `mail-${Date.now()}@proclaw.test`;
    const password = 'Prower1234!';

    const reg = await api.post('/api/portal/register', {
      data: { email, password, locale: 'zh-CN' },
    });
    expect([201, 409]).toContain(reg.status());

    // Wait for the message to land in MailPit
    const mail = await request.newContext({ baseURL: MAILPIT });
    let message: any = null;
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const list = await mail.get('/api/v1/messages');
      const body = await list.json();
      const found = (body.messages || []).find((m: any) => m.To?.[0]?.Address === email);
      if (found) {
        message = found;
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    expect(message, 'activation email arrived in MailPit').toBeTruthy();

    // Pull full body
    const detail = await mail.get(`/api/v1/message/${message.ID}`);
    const full = await detail.json();
    expect(full.From.Address).toBe('noreply@account.proclaw.cc');
    expect(full.From.Name).toMatch(/ProClaw/);
    expect(full.To[0].Address).toBe(email);
    expect(full.Subject).toMatch(/激活你的 ProClaw 账户|Activate your ProClaw account/);

    // DoD B8 — no "NvwaX" in either text body
    const allBody = JSON.stringify({
      text: full.Text,
      html: full.HTML,
      subject: full.Subject,
    });
    expect(allBody.toLowerCase()).not.toContain('nvwax');

    await api.dispose();
    await mail.dispose();
  });
});
