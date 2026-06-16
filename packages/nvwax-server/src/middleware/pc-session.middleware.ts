/**
 * pc-session middleware (Sprint 2).
 *
 * Cross-subdomain session cookie shared by all ProClaw apps.
 *
 * DoD C9:
 *   - Name:        pc_session
 *   - Domain:      .proclaw.cc  (set via PC_SESSION_COOKIE_DOMAIN, default .proclaw.cc)
 *   - Path:        /
 *   - HttpOnly:    yes (no JS access)
 *   - Secure:      yes (when not in dev) — required for cross-site sends
 *   - SameSite:    Lax (allows top-level cross-origin GET navigations from RP)
 *   - Max-Age:     86400 (24 hours) or follow JWT exp
 *
 * The payload is a HS256-signed JWT:
 *   { sub: <userId>, csrf: <16-byte hex>, iat, exp }
 *
 * `PC_SESSION_SECRET` is a 32-byte random secret; rotated independently of
 * `JWT_SECRET` so a leak in one doesn't compromise the other.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'pc_session';
const DEFAULT_TTL_SECONDS = 24 * 3600;
const CSRF_HEADER = 'x-pc-csrf';

export type PcSessionPayload = {
  sub: string; // userId
  csrf: string; // 32 hex chars
};

export type SessionUser = {
  id: string;
  csrf: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    sessionUser?: SessionUser;
  }
}

function getSecret(): Uint8Array {
  const secret = process.env.PC_SESSION_SECRET;
  if (!secret) {
    // In dev we auto-generate one to keep startup smooth, but log loudly.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: PC_SESSION_SECRET is required in production.');
    }
    // Synchronous fallback — never persisted.
    return new TextEncoder().encode(
      'dev-only-pc-session-secret-do-not-use-in-prod-' + Math.random().toString(36).slice(2),
    );
  }
  return new TextEncoder().encode(secret);
}

function getCookieDomain(): string {
  return process.env.PC_SESSION_COOKIE_DOMAIN || '.proclaw.cc';
}

function isSecureRequest(req: Request): boolean {
  if (req.secure) return true;
  if (req.headers['x-forwarded-proto'] === 'https') return true;
  return process.env.NODE_ENV === 'production';
}

function randomCsrf(): string {
  // 16 bytes → 32 hex chars
  const bytes = new Uint8Array(16);
  // crypto.getRandomValues is available in Node 20+ globally
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export class PcSessionService {
  /** Issue a fresh cookie. `res` must already have the cookie scope set (Secure etc). */
  async issue(res: Response, userId: string): Promise<string> {
    const csrf = randomCsrf();
    const token = await new SignJWT({ csrf })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(`${DEFAULT_TTL_SECONDS}s`)
      .sign(getSecret());

    this.writeCookie(res, token);
    return csrf;
  }

  /** Read & verify the cookie. Mutates `req.sessionUser` on success. */
  async read(req: Request): Promise<SessionUser | null> {
    const token = this.readCookie(req);
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
      if (typeof payload.sub !== 'string' || typeof (payload as any).csrf !== 'string') {
        return null;
      }
      const user: SessionUser = {
        id: payload.sub,
        csrf: (payload as any).csrf,
      };
      req.sessionUser = user;
      return user;
    } catch {
      return null;
    }
  }

  /** Build an Express middleware. */
  middleware(): RequestHandler {
    return async (req: Request, _res: Response, next: NextFunction) => {
      try {
        await this.read(req);
      } catch {
        // ignore — anonymous request
      }
      next();
    };
  }

  /**
   * Express middleware that REQUIRES a valid session.
   * Returns 401 JSON on failure so the portal SPA can render a friendly error.
   */
  requireSession(): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = await this.read(req);
      if (!user) {
        res.status(401).json({ code: 'unauthorized', message: 'pc_session is missing or invalid' });
        return;
      }
      next();
    };
  }

  /**
   * CSRF guard for state-changing requests. Browser must echo the cookie's
   * `csrf` claim in the `X-Pc-Csrf` header.
   */
  requireCsrf(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = req.sessionUser;
      const provided = (req.headers[CSRF_HEADER] as string | undefined) ?? '';
      if (!user || !provided || provided !== user.csrf) {
        res.status(403).json({ code: 'csrf_mismatch', message: 'CSRF token missing or invalid' });
        return;
      }
      next();
    };
  }

  /** Clear the cookie (logout). */
  clear(res: Response): void {
    res.clearCookie(COOKIE_NAME, {
      domain: getCookieDomain(),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  }

  /** Set the cookie on the response. */
  private writeCookie(res: Response, token: string): void {
    res.cookie(COOKIE_NAME, token, {
      domain: getCookieDomain(),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: DEFAULT_TTL_SECONDS * 1000,
    });
  }

  private readCookie(req: Request): string | null {
    // Express cookie parser (if mounted) populates req.cookies; otherwise
    // parse the header ourselves.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookies = (req as any).cookies as Record<string, string> | undefined;
    if (cookies && typeof cookies[COOKIE_NAME] === 'string') {
      return cookies[COOKIE_NAME];
    }
    const header = req.headers.cookie || '';
    for (const part of header.split(';')) {
      const [k, v] = part.split('=');
      if (k && k.trim() === COOKIE_NAME && v) {
        return decodeURIComponent(v.trim());
      }
    }
    return null;
  }
}

export const pcSessionService = new PcSessionService();
export const PC_SESSION_COOKIE_NAME = COOKIE_NAME;
