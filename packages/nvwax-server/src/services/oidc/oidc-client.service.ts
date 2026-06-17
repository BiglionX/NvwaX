/**
 * OIDC RP Client 管理服务（Sprint 2.9）
 *
 * 职责：管理员通过 API/CLI 注册、列表、撤销、轮换 Relying Party 客户端。
 * 数据库表：沿用 Sprint 1 migration 026 的 oidc_clients（已有 is_active 软删列）。
 *
 * 设计要点：
 * - client_id 用 16 字节 base64url（带 rp_ 前缀便于识别），全局唯一
 * - client_secret 用 32 字节 base64url，bcrypt hash 存储
 *   - 明文只在 registerRP / rotateSecret 返回时一次性展示
 * - 默认 token_endpoint_auth_method='client_secret_post'，
 *   allowed_grant_types=['authorization_code','refresh_token']，require_pkce=true
 * - 软删通过 is_active=false；revokeRP/rotateSecret/getRP/listRPs 都尊重 active 过滤（除非 includeRevoked=true）
 *
 * 与 Sprint 1 的 oidc.service.getClient 区别：
 * - oidc.service.getClient：OIDC 协议路径，只查 active（被 /oauth/* 端点调用）
 * - 本服务 getRP/listRPs：管理路径，可查 inactive（供 admin UI 审计）
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { databaseService } from '../database.service.js';

// ──────────── 类型定义 ────────────

export interface RegisterRPInput {
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  /** 可选覆盖；不传则 default */
  allowed_grant_types?: string[];
  require_pkce?: boolean;
  /** 'client_secret_post' (default, confidential) | 'none' (public, PKCE only) */
  token_endpoint_auth_method?: 'client_secret_post' | 'none';
}

export interface RegisteredRP {
  client_id: string;
  client_secret: string; // 明文，仅 register / rotate 时返回一次
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  allowed_grant_types: string[];
  require_pkce: boolean;
  token_endpoint_auth_method: string;
  is_active: boolean;
  created_at: Date;
}

export interface RPRecord {
  client_id: string;
  client_secret_hash: string | null;
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  allowed_grant_types: string[];
  require_pkce: boolean;
  token_endpoint_auth_method: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/** 不含 client_secret_hash 的公开形态（list/get 用） */
export interface RPPublic extends Omit<RPRecord, 'client_secret_hash' | 'updated_at'> {}

export interface ListRPsOptions {
  page?: number;
  limit?: number;
  search?: string;
  includeRevoked?: boolean;
}

export interface ListRPsResult {
  data: RPPublic[];
  total: number;
  page: number;
  limit: number;
}

// ──────────── 错误类 ────────────

export class RPValidationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'RPValidationError';
  }
}

// ──────────── Service ────────────

export class OidcClientService {
  /**
   * 每次方法调用都重新从 databaseService 取 pool（与 oidc.service.ts 模式一致），
   * 便于在 jest 单测中通过 mock databaseService.getPool() 注入假 pool。
   */
  private get pool() {
    return databaseService.getPool();
  }

  // ──────────── 密钥生成 ────────────

  private generateClientId(): string {
    return `rp_${crypto.randomBytes(16).toString('base64url')}`;
  }

  private generateClientSecret(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  // ──────────── 输入校验 ────────────

  private validateInput(input: RegisterRPInput): void {
    const { name, redirect_uris, allowed_scopes } = input;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new RPValidationError('INVALID_NAME', 'name is required and must be a non-empty string');
    }
    if (name.length > 100) {
      throw new RPValidationError('INVALID_NAME', 'name must not exceed 100 characters');
    }

    if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
      throw new RPValidationError('INVALID_REDIRECT_URIS', 'redirect_uris must be a non-empty array');
    }
    for (const uri of redirect_uris) {
      if (typeof uri !== 'string') {
        throw new RPValidationError('INVALID_REDIRECT_URIS', 'each redirect_uri must be a string');
      }
      // 必须是合法 http(s) URL；非 https 的 URI 必须指向 localhost 或 127.0.0.1（OIDC 强约束）
      let parsed: URL;
      try {
        parsed = new URL(uri);
      } catch {
        throw new RPValidationError('INVALID_REDIRECT_URIS', `redirect_uri "${uri}" is not a valid URL`);
      }
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new RPValidationError('INVALID_REDIRECT_URIS', `redirect_uri "${uri}" must use http(s) protocol`);
      }
      if (parsed.protocol === 'http:') {
        const host = parsed.hostname.toLowerCase();
        if (host !== 'localhost' && host !== '127.0.0.1') {
          throw new RPValidationError(
            'INVALID_REDIRECT_URIS',
            `redirect_uri "${uri}" uses http but host is not localhost/127.0.0.1`,
          );
        }
      }
    }

    if (!Array.isArray(allowed_scopes) || allowed_scopes.length === 0) {
      throw new RPValidationError('INVALID_SCOPES', 'allowed_scopes must be a non-empty array');
    }
    if (!allowed_scopes.includes('openid')) {
      throw new RPValidationError('INVALID_SCOPES', "allowed_scopes must include 'openid'");
    }
    // 允许白名单（OIDC 标准 + Sprint 2.9 扩展 admin）
    const KNOWN_SCOPES = new Set(['openid', 'profile', 'email', 'admin']);
    for (const s of allowed_scopes) {
      if (!KNOWN_SCOPES.has(s)) {
        throw new RPValidationError(
          'INVALID_SCOPES',
          `scope "${s}" is not recognized (allowed: ${[...KNOWN_SCOPES].join(', ')})`,
        );
      }
    }
  }

  // ──────────── CRUD ────────────

  /**
   * 注册新 RP 客户端。返回的 client_secret 明文仅此一次。
   * @throws RPValidationError | Error(UNIQUE 冲突)
   */
  async registerRP(input: RegisterRPInput): Promise<RegisteredRP> {
    this.validateInput(input);

    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const hash = await bcrypt.hash(clientSecret, 10);

    const allowedGrantTypes = input.allowed_grant_types ?? ['authorization_code', 'refresh_token'];
    const requirePkce = input.require_pkce ?? true;
    const tokenEndpointAuthMethod = input.token_endpoint_auth_method ?? 'client_secret_post';

    const { rows } = await this.pool.query(
      `INSERT INTO oidc_clients
         (client_id, client_secret_hash, name,
          redirect_uris, allowed_scopes, allowed_grant_types,
          require_pkce, token_endpoint_auth_method, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING client_id, client_secret_hash, name, redirect_uris,
                 allowed_scopes, allowed_grant_types, require_pkce,
                 token_endpoint_auth_method, is_active, created_at, updated_at`,
      [
        clientId,
        hash,
        input.name.trim(),
        input.redirect_uris,
        input.allowed_scopes,
        allowedGrantTypes,
        requirePkce,
        tokenEndpointAuthMethod,
      ],
    );

    const row = rows[0];
    return {
      client_id: row.client_id,
      client_secret: clientSecret,
      name: row.name,
      redirect_uris: row.redirect_uris ?? [],
      allowed_scopes: row.allowed_scopes ?? [],
      allowed_grant_types: row.allowed_grant_types ?? [],
      require_pkce: row.require_pkce,
      token_endpoint_auth_method: row.token_endpoint_auth_method,
      is_active: row.is_active,
      created_at: row.created_at,
    };
  }

  /**
   * 列表查询，支持分页 + 模糊搜索 + 可选包含已撤销。
   */
  async listRPs(opts: ListRPsOptions = {}): Promise<ListRPsResult> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;
    const search = opts.search?.trim() ?? '';
    const includeRevoked = opts.includeRevoked ?? false;

    const conditions: string[] = [];
    const params: any[] = [];
    if (!includeRevoked) {
      params.push(true);
      conditions.push(`is_active = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(name ILIKE $${idx} OR client_id ILIKE $${idx})`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // 总数
    const totalResult = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM oidc_clients ${whereClause}`,
      params,
    );
    const total: number = totalResult.rows[0]?.total ?? 0;

    // 数据
    const dataParams = [...params, limit, offset];
    const dataResult = await this.pool.query(
      `SELECT client_id, name, redirect_uris, allowed_scopes, allowed_grant_types,
              require_pkce, token_endpoint_auth_method, is_active, created_at
       FROM oidc_clients
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams,
    );

    return {
      data: dataResult.rows.map((row) => this.toPublic(row)),
      total,
      page,
      limit,
    };
  }

  /**
   * 查询单个 RP 记录（含 client_secret_hash，admin 内部用）。
   * 不区分 active/inactive（管理路径）。
   */
  async getRP(clientId: string): Promise<RPRecord | null> {
    const { rows } = await this.pool.query(
      `SELECT client_id, client_secret_hash, name, redirect_uris,
              allowed_scopes, allowed_grant_types, require_pkce,
              token_endpoint_auth_method, is_active, created_at, updated_at
       FROM oidc_clients
       WHERE client_id = $1`,
      [clientId],
    );
    if (rows.length === 0) return null;
    return this.toRecord(rows[0]);
  }

  /**
   * 撤销 RP（软删，is_active=false）。仅 active → inactive 才返回 true。
   */
  async revokeRP(clientId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `UPDATE oidc_clients
         SET is_active = FALSE
       WHERE client_id = $1 AND is_active = TRUE`,
      [clientId],
    );
    return (rowCount || 0) > 0;
  }

  /**
   * 轮换 client_secret。返回新明文 secret（仅此一次）。
   * 对已撤销的 RP 允许轮换（运维场景：恢复前先重置凭证）。
   * @throws Error('RP not found')
   */
  async rotateSecret(clientId: string): Promise<{ client_id: string; client_secret: string; rotated_at: Date }> {
    const newSecret = this.generateClientSecret();
    const newHash = await bcrypt.hash(newSecret, 10);

    const { rows } = await this.pool.query(
      `UPDATE oidc_clients
         SET client_secret_hash = $1
       WHERE client_id = $2
       RETURNING client_id, updated_at`,
      [newHash, clientId],
    );
    if (rows.length === 0) {
      throw new Error('RP not found');
    }
    return {
      client_id: rows[0].client_id,
      client_secret: newSecret,
      rotated_at: rows[0].updated_at,
    };
  }

  // ──────────── 格式化 ────────────

  private toPublic(row: any): RPPublic {
    return {
      client_id: row.client_id,
      name: row.name,
      redirect_uris: row.redirect_uris ?? [],
      allowed_scopes: row.allowed_scopes ?? [],
      allowed_grant_types: row.allowed_grant_types ?? [],
      require_pkce: row.require_pkce,
      token_endpoint_auth_method: row.token_endpoint_auth_method,
      is_active: row.is_active,
      created_at: row.created_at,
    };
  }

  private toRecord(row: any): RPRecord {
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
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const oidcClientService = new OidcClientService();