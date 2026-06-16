/**
 * User Activation Service (Sprint 2).
 *
 * Owns the `user_activation_tokens` table:
 *   - issue(userId) → 32-byte base64url token, 24h TTL
 *   - consume(token) → marks `used_at`; returns user_id; throws on miss/expire/reuse
 *   - revokeAllForUser(userId) → invalidates outstanding tokens (e.g. on password change)
 *
 * Activation email link is built by the controller — this service is transport-agnostic.
 */

import { randomBytes } from 'node:crypto';
import { databaseService } from '../database.service.js';

const TOKEN_TTL_HOURS = 24;
const TOKEN_BYTES = 32;

export class ActivationError extends Error {
  code: 'invalid_token' | 'expired' | 'already_used' | 'not_found';
  constructor(code: ActivationError['code'], message: string) {
    super(message);
    this.name = 'ActivationError';
    this.code = code;
  }
}

export type ActivationRecord = {
  token: string;
  userId: string;
  expiresAt: Date;
};

class UserActivationService {
  private pool = databaseService.getPool();

  /**
   * Mint a single-use activation token. Older outstanding tokens for the
   * same user are left intact (they will simply time out) so we don't break
   * a user who clicks an old link.
   */
  async issue(userId: string): Promise<ActivationRecord> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000);
    await this.pool.query(
      `INSERT INTO user_activation_tokens (token, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [token, userId, expiresAt],
    );
    return { token, userId, expiresAt };
  }

  /**
   * Consume a token. Idempotent-ish: a second call with the same token
   * throws `ActivationError('already_used', …)` so the controller can
   * surface a friendly message instead of silently succeeding.
   */
  async consume(token: string): Promise<{ userId: string }> {
    const result = await this.pool.query(
      `SELECT user_id, expires_at, used_at
         FROM user_activation_tokens
         WHERE token = $1
         FOR UPDATE`,
      [token],
    );
    if (result.rowCount === 0) {
      throw new ActivationError('invalid_token', 'activation token not found');
    }
    const row = result.rows[0];
    if (row.used_at) {
      throw new ActivationError('already_used', 'activation token has already been used');
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new ActivationError('expired', 'activation token has expired');
    }
    const update = await this.pool.query(
      `UPDATE user_activation_tokens
          SET used_at = CURRENT_TIMESTAMP
        WHERE token = $1 AND used_at IS NULL
        RETURNING user_id`,
      [token],
    );
    if (update.rowCount === 0) {
      // Race: another request consumed it between SELECT FOR UPDATE and UPDATE.
      throw new ActivationError('already_used', 'activation token has already been used');
    }
    return { userId: update.rows[0].user_id as string };
  }

  /** For password reset / user-initiated revoke. */
  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE user_activation_tokens
          SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );
    return result.rowCount ?? 0;
  }

  /** Used by tests + diagnostics. */
  async getOutstanding(userId: string): Promise<ActivationRecord[]> {
    const result = await this.pool.query(
      `SELECT token, user_id, expires_at
         FROM user_activation_tokens
         WHERE user_id = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows.map((r) => ({
      token: r.token as string,
      userId: r.user_id as string,
      expiresAt: new Date(r.expires_at as string),
    }));
  }
}

export const userActivationService = new UserActivationService();
