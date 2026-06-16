/**
 * Email service (Sprint 2).
 *
 * Wraps nodemailer with:
 *  - SMTP transport from env (AWS SES in production; MailPit in dev/test)
 *  - White-label `from` address (DoD B7): "ProClaw 团队 <noreply@account.proclaw.cc>"
 *  - Template render helpers (templates/*.ts)
 *  - MailPit-friendly envelope for local e2e (http://localhost:8025)
 *
 * No PII is logged. Errors include the SMTP response code/message but
 * redact the body subject to avoid leaking activation tokens.
 */

import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../config/index.js';
import { renderActivationEmail } from './templates/activation.js';
import { renderWelcomeEmail } from './templates/welcome.js';

export type EmailJob =
  | {
      kind: 'activation';
      to: string;
      activationLink: string;
      expiresInHours: number;
      locale?: 'zh-CN' | 'en-US';
    }
  | {
      kind: 'welcome';
      to: string;
      displayName?: string;
      locale?: 'zh-CN' | 'en-US';
    };

export class EmailService {
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;
  private readonly smtpHost: string;
  private readonly smtpPort: number;
  private readonly smtpUser: string;
  private readonly smtpPass: string;

  constructor() {
    this.fromAddress =
      process.env.SMTP_FROM || 'ProClaw 团队 <noreply@account.proclaw.cc>';
    this.smtpHost = process.env.SMTP_HOST || 'localhost';
    this.smtpPort = parseInt(process.env.SMTP_PORT || '1025', 10); // MailPit default
    this.smtpUser = process.env.SMTP_USER || '';
    this.smtpPass = process.env.SMTP_PASS || '';
  }

  /** Lazy-init the transporter; cheap to recreate, never blocks startup. */
  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    // MailPit / dev: no auth
    if (config.nodeEnv === 'test' || this.smtpHost === 'localhost' || this.smtpHost === 'mailpit') {
      this.transporter = nodemailer.createTransport({
        host: this.smtpHost === 'mailpit' ? 'localhost' : this.smtpHost,
        port: this.smtpPort,
        secure: false,
        ignoreTLS: true,
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpPort === 465,
        auth: {
          user: this.smtpUser,
          pass: this.smtpPass,
        },
      });
    }
    return this.transporter;
  }

  /** Smoke-test the SMTP connection. */
  async verify(): Promise<boolean> {
    try {
      await this.getTransporter().verify();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a transactional email. Returns the SMTP message-id for tracing.
   * Throws on failure so callers can surface a 502 to the portal.
   */
  async send(job: EmailJob): Promise<{ messageId: string }> {
    let subject: string;
    let html: string;
    let text: string;

    if (job.kind === 'activation') {
      const rendered = renderActivationEmail({
        activationLink: job.activationLink,
        expiresInHours: job.expiresInHours,
        locale: job.locale ?? 'zh-CN',
      });
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    } else {
      const rendered = renderWelcomeEmail({
        displayName: job.displayName,
        locale: job.locale ?? 'zh-CN',
      });
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    }

    const info = await this.getTransporter().sendMail({
      from: this.fromAddress,
      to: job.to,
      subject,
      text,
      html,
      // Brand header (helps receivers bucket it correctly)
      headers: {
        'X-ProClaw-Job': job.kind,
      },
    });

    return { messageId: info.messageId };
  }

  /** Exposed for the unit test; the transport factory itself is what we want to mock. */
  _setTransporterForTest(t: Transporter | null) {
    this.transporter = t;
  }
}

export const emailService = new EmailService();
