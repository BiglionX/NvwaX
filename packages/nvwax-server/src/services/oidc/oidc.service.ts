/**
 * OIDC 业务逻辑服务
 *
 * 职责：
 * - 客户端查询（RP 注册表）
 * - 授权码签发 / 一次性消费（PKCE 校验）
 * - 刷新令牌签发 / 链式轮换 / 撤销
 * - scope 校验
 *
 * 数据库表：
 * - oidc_clients
 * - oidc_authorization_codes
 * - oidc_refresh_tokens
 */

import { randomBytes, createHash } from 'node:crypto';
import { databaseService } from '../database.service.js';
import { oidcConfig } from '../../config/index.js';
import { verifyCodeChallenge } from './pkce.util.js';
import { OidcError } from './oidc-error.js';

export interface OidcClient {
  client_id: string;
  client_secret_hash: string | null;
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  allowed_grant_types: string[];
  require_pkce: boolean;
  token_endpoint_auth_method: string;
  is_active: boolean;
}

export interface AuthorizationCodeParams {
  userId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256' | 'plain';
  nonce?: string;
}

export interface ConsumedCode {
  userId: string;
  scope: string;
  redirectUri: string;
  nonce: string | null;
}

export interface RefreshTokenRecord {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RotatedRefreshToken extends RefreshTokenRecord {
  userId: string;
  clientId: string;
  scope: string;
}

class OidcService {
  // ──────────── 客户端 ────────────

  async getClient(clientId: string): Promise<OidcClient | null> {
    const { rows } = await databaseService.getPool().query(
      `SELECT client_id, client_secret_hash, name, redirect_uris,
              allowed_scopes, allowed_grant_types, require_pkce,
              token_endpoint_auth_method, is_active
       FROM oidc_clients
       WHERE client_id = $1 AND is_active = TRUE`,
      [clientId],
    );
    if (rows.length === 0) return null;
    return this.formatClient(rows[0]);
  }

  private formatClient(row: any): OidcClient {
    return {
      client_id: row.client_id,
      client_secret_hash: row.client_secret_hash,
      name: row.name,
      redirect_uris: row.redirect_uris ?? [],
      allowed_scopes: row.allowed_scopes ?? [],
      allowed_grant_types: row.allowed_grant_types ?? [],
      require_pkce: row.require_pkce,
      token_endpoint_auth_method: row.token_endpoint_auth_method,
      is_active: row.is_active,
    };
  }

  // ──────────── 授权码 ────────────

  /**
   * 签发一次性 authorization code。
   * 默认 10 分钟过期（oidcConfig.authCodeTtl）。
   */
  async issueAuthorizationCode(params: AuthorizationCodeParams): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + oidcConfig.authCodeTtl * 1000);

    await databaseService.getPool().query(
      `INSERT INTO oidc_authorization_codes
         (code, client_id, user_id, redirect_uri, scope,
          code_challenge, code_challenge_method, nonce, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        code,
        params.clientId,
        params.userId,
        params.redirectUri,
        params.scope,
        params.codeChallenge,
        params.codeChallengeMethod,
        params.nonce ?? null,
        expiresAt,
      ],
    );

    return code;
  }

  /**
   * 消费 authorization code（一次性 + PKCE 校验）。
   *
   * @throws OidcError('invalid_grant') 重放 / 过期 / 客户端不匹配 / PKCE 失败
   */
  async consumeAuthorizationCode(
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier: string,
  ): Promise<ConsumedCode> {
    // 原子操作：UPDATE used=TRUE WHERE 未用且未过期 → 行受影响 = 0 即失败
    const { rows, rowCount } = await databaseService.getPool().query(
      `UPDATE oidc_authorization_codes
         SET used = TRUE
       WHERE code = $1
         AND client_id = $2
         AND redirect_uri = $3
         AND used = FALSE
         AND expires_at > NOW()
       RETURNING user_id, scope, nonce, code_challenge, code_challenge_method`,
      [code, clientId, redirectUri],
    );

    if (!rowCount || rowCount === 0) {
      throw new OidcError('invalid_grant', 'authorization code is invalid, expired, or already used');
    }

    const row = rows[0];

    // PKCE 校验（必填：Sprint 1 强制 PKCE）
    const method = (row.code_challenge_method || 'S256') as 'S256' | 'plain';
    const ok = verifyCodeChallenge(codeVerifier, row.code_challenge, method);
    if (!ok) {
      // 注意：code 已标 used，但 PKCE 失败 → 视为整体失败，调用方不应继续签 token
      throw new OidcError('invalid_grant', 'PKCE code_verifier does not match code_challenge');
    }

    return {
      userId: row.user_id,
      scope: row.scope,
      redirectUri: row.redirect_uri ?? redirectUri,
      nonce: row.nonce,
    };
  }

  // ──────────── 刷新令牌 ────────────

  /**
   * 签发新的 refresh token。
   * 返回明文 token（仅给客户端一次）+ 数据库存储用的 hash。
   */
  async issueRefreshToken(
    userId: string,
    clientId: string,
    scope: string,
    rotatedFrom?: string,
  ): Promise<RefreshTokenRecord> {
    const token = randomBytes(48).toString('base64url');
    const tokenHash = this.hashRefreshToken(token);
    const expiresAt = new Date(Date.now() + oidcConfig.refreshTokenTtl * 1000);

    await databaseService.getPool().query(
      `INSERT INTO oidc_refresh_tokens
         (token_hash, client_id, user_id, scope, expires_at, rotated_from)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tokenHash, clientId, userId, scope, expiresAt, rotatedFrom ?? null],
    );

    return { token, tokenHash, expiresAt };
  }

  /**
   * 链式轮换 refresh token：
   * 1. 校验旧 token 未撤销、未过期
   * 2. 签发新 token
   * 3. 撤销旧 token，记录 rotated_from 指向新 hash
   */
  async rotateRefreshToken(
    oldToken: string,
    clientId: string,
  ): Promise<RotatedRefreshToken> {
    const oldHash = this.hashRefreshToken(oldToken);

    // 原子：UPDATE revoked=TRUE WHERE 未撤销且未过期且 client 匹配 → RETURNING
    const { rows, rowCount } = await databaseService.getPool().query(
      `UPDATE oidc_refresh_tokens
         SET revoked = TRUE
       WHERE token_hash = $1
         AND client_id = $2
         AND revoked = FALSE
         AND expires_at > NOW()
       RETURNING user_id, scope`,
      [oldHash, clientId],
    );

    if (!rowCount || rowCount === 0) {
      throw new OidcError('invalid_grant', 'refresh_token is invalid, expired, or revoked');
    }

    const row = rows[0];

    // 签发新 token，记录 rotated_from
    const newRecord = await this.issueRefreshToken(
      row.user_id,
      clientId,
      row.scope,
      oldHash,
    );

    return {
      ...newRecord,
      userId: row.user_id,
      clientId,
      scope: row.scope,
    };
  }

  /**
   * 撤销 refresh token（logout 用）
   */
  async revokeRefreshToken(token: string): Promise<boolean> {
    const hash = this.hashRefreshToken(token);
    const { rowCount } = await databaseService.getPool().query(
      `UPDATE oidc_refresh_tokens
         SET revoked = TRUE
       WHERE token_hash = $1 AND revoked = FALSE`,
      [hash],
    );
    return (rowCount || 0) > 0;
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // ──────────── Scope 校验 ────────────

  /**
   * 校验客户端请求的 scope 与客户端允许的 scope 交集。
   * 强制要求包含 'openid'（OIDC 必备）。
   *
   * @returns 通过校验的 scope 字符串（空格分隔）
   * @throws OidcError('invalid_scope')
   */
  verifyScope(requested: string, allowedScopes: string[]): string {
    if (!requested || typeof requested !== 'string') {
      throw new OidcError('invalid_scope', 'scope is required');
    }

    const requestedList = requested.trim().split(/\s+/).filter(Boolean);

    // 必须包含 'openid'
    if (!requestedList.includes('openid')) {
      throw new OidcError('invalid_scope', "scope must include 'openid'");
    }

    // 交集：requested ∩ allowed
    const allowedSet = new Set(allowedScopes);
    const effective = requestedList.filter((s) => allowedSet.has(s));

    if (effective.length === 0) {
      throw new OidcError('invalid_scope', 'requested scope is not allowed for this client');
    }

    // 至少 'openid' 必须命中
    if (!effective.includes('openid')) {
      throw new OidcError('invalid_scope', "scope must include 'openid' which is allowed for this client");
    }

    return effective.join(' ');
  }
}

export const oidcService = new OidcService();
