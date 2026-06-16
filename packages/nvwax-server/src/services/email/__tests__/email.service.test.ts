/**
 * Unit tests: email.service (Sprint 2 / DoD B7 / B8).
 *
 * Mocks nodemailer so we never actually connect to SMTP; asserts the
 * rendered envelope matches ProClaw brand and the body never contains
 * "NvwaX".
 */

import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';

const mockSendMail: jest.Mock = jest.fn(async () => ({ messageId: 'mock-msg-id' }));
const mockVerify: jest.Mock = jest.fn(async () => true);

const mockCreateTransport: jest.Mock = jest.fn(() => ({
  sendMail: mockSendMail,
  verify: mockVerify,
}));

jest.unstable_mockModule('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: mockCreateTransport,
  },
}));

let emailService: typeof import('../../email/email.service.js').emailService;
let renderActivationEmail: typeof import('../../email/templates/activation.js').renderActivationEmail;
let renderWelcomeEmail: typeof import('../../email/templates/welcome.js').renderWelcomeEmail;

beforeAll(async () => {
  const svc = await import('../../email/email.service.js');
  emailService = svc.emailService;
  emailService._setTransporterForTest({
    sendMail: mockSendMail,
    verify: mockVerify,
  } as any);
  renderActivationEmail = (await import('../../email/templates/activation.js')).renderActivationEmail;
  renderWelcomeEmail = (await import('../../email/templates/welcome.js')).renderWelcomeEmail;
});

beforeEach(() => {
  mockSendMail.mockClear();
  // Reset the test transporter so each test gets a fresh call count
  emailService._setTransporterForTest({
    sendMail: mockSendMail,
    verify: mockVerify,
  } as any);
});

describe('emailService.send()', () => {
  it('activation: from is ProClaw and contains no NvwaX', async () => {
    const { messageId } = await emailService.send({
      kind: 'activation',
      to: 'user@proclaw.test',
      activationLink: 'https://account.proclaw.cc/portal/activate/abc/',
      expiresInHours: 24,
      locale: 'zh-CN',
    });
    expect(messageId).toBe('mock-msg-id');
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const call = mockSendMail.mock.calls[0]?.[0] as any;
    expect(call.from).toBe('ProClaw 团队 <noreply@account.proclaw.cc>');
    expect(call.to).toBe('user@proclaw.test');
    expect(call.subject).toContain('ProClaw');
    expect(call.html).toContain('ProClaw');
    expect(call.text).toContain('ProClaw');
    // DoD B8 — no NvwaX in any body
    expect(JSON.stringify(call).toLowerCase()).not.toContain('nvwax');
    // Contains the activation link
    expect(call.html).toContain('https://account.proclaw.cc/portal/activate/abc/');
  });

  it('activation: en-US locale uses English copy', async () => {
    await emailService.send({
      kind: 'activation',
      to: 'user@proclaw.test',
      activationLink: 'https://account.proclaw.cc/portal/activate/xyz/',
      expiresInHours: 24,
      locale: 'en-US',
    });
    const call = mockSendMail.mock.calls[0]?.[0] as any;
    expect(call.subject).toBe('Activate your ProClaw account');
    expect(call.html).toContain('Activate account');
  });

  it('welcome: subject is brand-aligned, no NvwaX', async () => {
    await emailService.send({
      kind: 'welcome',
      to: 'user@proclaw.test',
      displayName: 'Tester',
    });
    const call = mockSendMail.mock.calls[0]?.[0] as any;
    expect(call.subject).toMatch(/欢迎|Welcome/);
    expect(call.html).toContain('ProClaw');
    expect(JSON.stringify(call).toLowerCase()).not.toContain('nvwax');
  });
});

describe('renderActivationEmail()', () => {
  it('scrubs NvwaX (defense-in-depth)', () => {
    const r = renderActivationEmail({
      activationLink: 'https://x',
      expiresInHours: 24,
      locale: 'zh-CN',
    });
    expect(r.html.toLowerCase()).not.toContain('nvwax');
    expect(r.text.toLowerCase()).not.toContain('nvwax');
  });
});

describe('renderWelcomeEmail()', () => {
  it('scrubs NvwaX', () => {
    const r = renderWelcomeEmail({ locale: 'zh-CN' });
    expect(r.html.toLowerCase()).not.toContain('nvwax');
    expect(r.text.toLowerCase()).not.toContain('nvwax');
  });
});
