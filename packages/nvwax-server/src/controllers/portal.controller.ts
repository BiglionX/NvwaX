/**
 * Portal Controller (Sprint 2).
 *
 * Backs the white-label account-portal at /api/portal/*.
 *
 *   POST /api/portal/register   { email, password, locale? }   → 201, sends activation email
 *   POST /api/portal/activate   { token }                      → 200, sets pc_session cookie
 *   POST /api/portal/login      { email, password, redirectTo? }→ 200, sets pc_session cookie
 *   POST /api/portal/logout                                      → 200, clears pc_session cookie
 *   GET  /api/portal/ping                                         → 200 { ok: true }
 *
 * The endpoints are intentionally JSON-only and rate-limited; they
 * never expose OIDC fields. Auth flows go through the parallel
 * /oauth/* endpoints (Sprint 1, frozen by ADR-004).
 */

import type { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { userActivationService, ActivationError } from '../services/user-activation.service.js';
import { emailService } from '../services/email/email.service.js';
import { pcSessionService } from '../middleware/pc-session.middleware.js';
import { oidcTokenService } from '../services/oidc/oidc-token.service.js';

const PASSWORD_MIN = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACTIVATION_TTL_HOURS = 24;

function isStrongEnough(pw: string): boolean {
  if (typeof pw !== 'string') return false;
  if (pw.length < PASSWORD_MIN) return false;
  if (!/[a-zA-Z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

function buildActivationLink(token: string, req: Request): string {
  const issuer = oidcTokenService.getIssuer();
  return `${issuer}/portal/activate/${token}/`;
}

function pickLocale(raw: unknown): 'zh-CN' | 'en-US' {
  if (raw === 'en-US' || raw === 'zh-CN') return raw;
  return 'zh-CN';
}

class PortalController {
  // ───────── ping ─────────
  ping = async (_req: Request, res: Response): Promise<void> => {
    res.json({ ok: true });
  };

  // ───────── register ─────────
  register = async (req: Request, res: Response): Promise<void> => {
    const { email, password, locale } = req.body || {};
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      res.status(400).json({ code: 'invalid_email', message: 'Please enter a valid email address.' });
      return;
    }
    if (!isStrongEnough(password)) {
      res.status(400).json({
        code: 'weak_password',
        message: 'Password must be at least 10 characters and contain a number.',
      });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();

    let userId: string;
    try {
      const created = await userService.registerUser(normalizedEmail, password);
      userId = created.user.id;
      // 注册后默认未激活，激活后由 activate() 置为 TRUE
      await userService.markUserInactive(userId);
    } catch (err: any) {
      if (typeof err?.message === 'string' && err.message.toLowerCase().includes('already')) {
        res.status(409).json({ code: 'email_taken', message: 'This email is already registered.' });
        return;
      }
      res.status(500).json({ code: 'server_error', message: 'Could not create account.' });
      return;
    }

    // Issue activation token + email
    try {
      const { token } = await userActivationService.issue(userId);
      const link = buildActivationLink(token, req);
      await emailService.send({
        kind: 'activation',
        to: normalizedEmail,
        activationLink: link,
        expiresInHours: ACTIVATION_TTL_HOURS,
        locale: pickLocale(locale),
      });
    } catch (err) {
      // Don't fail the register call — log and let the user request a resend.
      // eslint-disable-next-line no-console
      console.error('[portal.register] activation email failed:', (err as Error).message);
    }

    res.status(201).json({ ok: true });
  };

  // ───────── activate ─────────
  activate = async (req: Request, res: Response): Promise<void> => {
    const token = (req.params?.token || req.body?.token || '').toString().trim();
    if (!token) {
      res.status(400).json({ code: 'invalid_request', message: 'activation token is required' });
      return;
    }
    let userId: string;
    try {
      const result = await userActivationService.consume(token);
      userId = result.userId;
    } catch (err) {
      if (err instanceof ActivationError) {
        if (err.code === 'already_used') {
          res.status(409).json({ code: 'already_activated', message: err.message });
          return;
        }
        if (err.code === 'expired') {
          res.status(410).json({ code: 'token_expired', message: err.message });
          return;
        }
        res.status(404).json({ code: err.code, message: err.message });
        return;
      }
      res.status(500).json({ code: 'server_error', message: 'Could not activate.' });
      return;
    }

    // Mark user as active (idempotent)
    try {
      await userService.markUserActive(userId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[portal.activate] markUserActive failed:', (err as Error).message);
    }

    // Set pc_session cookie
    const user = await userService.getUserById(userId);
    await pcSessionService.issue(res, userId);

    // Fire-and-forget welcome email
    if (user?.email) {
      emailService
        .send({
          kind: 'welcome',
          to: user.email,
          displayName: user.name ?? undefined,
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error('[portal.activate] welcome email failed:', err?.message);
        });
    }

    res.json({ ok: true, redirectTo: '/portal/' });
  };

  // ───────── login ─────────
  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password, redirectTo } = req.body || {};
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      res.status(400).json({ code: 'invalid_request', message: 'email and password are required' });
      return;
    }
    if (typeof password !== 'string' || password.length === 0) {
      res.status(400).json({ code: 'invalid_request', message: 'email and password are required' });
      return;
    }

    const result = await userService.login(email.toLowerCase().trim(), password);
    if (!result) {
      res.status(401).json({ code: 'invalid_credentials', message: 'Email or password is incorrect.' });
      return;
    }

    await pcSessionService.issue(res, result.user.id);

    // redirectTo must be a relative path to defend against open-redirect
    const safeRedirect = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/portal/';
    res.json({ ok: true, redirectTo: safeRedirect });
  };

  // ───────── logout ─────────
  logout = async (_req: Request, res: Response): Promise<void> => {
    pcSessionService.clear(res);
    res.json({ ok: true });
  };
}

export const portalController = new PortalController();
