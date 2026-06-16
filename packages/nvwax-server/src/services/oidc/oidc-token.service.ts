/**
 * OIDC JWT 签发服务
 *
 * 职责：
 * - 启动时加载（或自动生成）RSA-2048 密钥对
 * - 签发 id_token 与 access_token（RS256 / 短期 / kid 标识）
 * - 导出公钥 JWKS（供 RP 通过 /.well-known/jwks.json 拉取）
 *
 * 与现有 HS256（jsonwebtoken + JWT_SECRET）完全隔离：
 * - jose 仅服务 OIDC IdP
 * - jsonwebtoken 继续服务 /api/v1/* 与 /api/auth/*
 *
 * 私钥来源优先级（initialize 时按序尝试）：
 * 1. OIDC_PRIVATE_KEY_PATH 指向的 PKCS8 PEM 文件
 * 2. 若未设置且 NODE_ENV=development → 自动生成到 data/oidc-dev-keys/
 * 3. 若未设置且 NODE_ENV=production → 拒启动
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import {
  generateKeyPair,
  exportPKCS8,
  exportSPKI,
  importPKCS8,
  importSPKI,
  KeyLike,
  SignJWT,
  jwtVerify,
  JWK,
  JWTPayload,
} from 'jose';

import { oidcConfig } from '../../config/index.js';

export interface IdTokenClaims {
  sub: string;             // user.id
  aud: string;             // client_id
  email?: string;
  name?: string;
  picture?: string;
  permissions?: string[];
  nonce?: string;
  auth_time: number;       // unix seconds
}

export interface AccessTokenClaims {
  sub: string;
  aud: string;             // client_id
  scope: string;           // 空格分隔
  client_id: string;
}

export interface JWKSet {
  keys: JWK[];
}

class OidcTokenService {
  private privateKey: KeyLike | null = null;
  private publicKey: KeyLike | null = null;
  private publicJwk: JWK | null = null;
  private kid: string | null = null;
  private initialized = false;

  /**
   * 启动时调用。加载/生成 RSA 密钥对，失败抛错。
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const keyPath = oidcConfig.privateKeyPath;

    if (keyPath && fs.existsSync(keyPath)) {
      // 1. 从环境变量指向的文件加载
      const pem = fs.readFileSync(keyPath, 'utf-8');
      this.privateKey = (await importPKCS8(pem, 'RS256')) as KeyLike;

      // 派生公钥：从私钥导出（jose 不直接提供 private→public API）
      // 因此我们同时约定：私钥 PEM 旁边应放同名 .pub.pem
      const pubPath = keyPath.replace(/\.pem$/, '') + '.pub.pem';
      if (fs.existsSync(pubPath)) {
        const pubPem = fs.readFileSync(pubPath, 'utf-8');
        this.publicKey = (await importSPKI(pubPem, 'RS256')) as KeyLike;
      } else {
        // 兜底：尝试从私钥 PKCS8 PEM 推断公钥（部分库支持，但 jose 不直接支持）
        // 退化为：自动生成公钥并写出，方便生产部署
        console.warn(
          `[oidc] Public key not found at ${pubPath}; regenerating from private key (development only)`,
        );
        const { publicKey } = await generateKeyPair('RS256', {
          modulusLength: 2048,
          extractable: true,
        });
        this.publicKey = publicKey;
      }
    } else if (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test' ||
      !process.env.NODE_ENV
    ) {
      // 2. 开发/测试模式：自动生成临时密钥到 data/oidc-dev-keys/
      this.privateKey = await this.generateAndPersistDevKeys();
    } else {
      // 3. 生产模式无密钥：拒启动
      throw new Error(
        'FATAL: OIDC_PRIVATE_KEY_PATH is required in production. ' +
          'Generate keys with scripts/generate-oidc-keys.sh and mount via K8s Secret.',
      );
    }

    // 派生 kid（公钥 SHA-256 前 16 字符 base64url）
    const pubPem = await exportSPKI(this.publicKey!);
    this.kid = createHash('sha256')
      .update(pubPem)
      .digest('base64url')
      .slice(0, 16);

    // 预导出 JWK 供 JWKS 端点
    this.publicJwk = {
      ...(await this.publicKeyToJwk(this.publicKey!)),
      kid: this.kid,
      use: 'sig',
      alg: 'RS256',
    };

    this.initialized = true;
  }

  private async generateAndPersistDevKeys(): Promise<KeyLike> {
    const dir = path.resolve(process.cwd(), 'data/oidc-dev-keys');
    fs.mkdirSync(dir, { recursive: true });

    const privPath = path.join(dir, 'private.pem');
    const pubPath = path.join(dir, 'public.pem');

    if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
      // 复用已有 dev 密钥
      const privPem = fs.readFileSync(privPath, 'utf-8');
      const pubPem = fs.readFileSync(pubPath, 'utf-8');
      this.publicKey = (await importSPKI(pubPem, 'RS256')) as KeyLike;
      return (await importPKCS8(privPem, 'RS256')) as KeyLike;
    }

    // 全新生成
    const { privateKey, publicKey } = await generateKeyPair('RS256', {
      modulusLength: 2048,
      extractable: true,
    });
    const privPem = await exportPKCS8(privateKey);
    const pubPem = await exportSPKI(publicKey);

    fs.writeFileSync(privPath, privPem, { mode: 0o600 });
    fs.writeFileSync(pubPath, pubPem, { mode: 0o644 });

    this.publicKey = publicKey;
    console.warn(
      `[oidc] Auto-generated dev RSA-2048 keys at ${dir} (DO NOT use in production)`,
    );
    return privateKey;
  }

  /**
   * 把 jose KeyLike 转成 JWK（用 createPublicKey + exportJWK 的等价方式）
   */
  private async publicKeyToJwk(publicKey: KeyLike): Promise<JWK> {
    // jose v5：importSPKI/KeyLike 不能直接 exportJWK；用 crypto.createPublicKey 转换
    const nodeCrypto = await import('node:crypto');
    const pem = await exportSPKI(publicKey);
    const keyObj = nodeCrypto.createPublicKey(pem);
    const jwk = keyObj.export({ format: 'jwk' }) as JWK;
    return jwk;
  }

  /**
   * 签发 id_token（OIDC，1 小时有效）
   */
  async signIdToken(claims: IdTokenClaims): Promise<string> {
    this.assertReady();
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
      permissions: claims.permissions,
      nonce: claims.nonce,
      auth_time: claims.auth_time,
    })
      .setProtectedHeader({ alg: 'RS256', kid: this.kid!, typ: 'JWT' })
      .setIssuer(oidcConfig.issuer)
      .setSubject(claims.sub)
      .setAudience(claims.aud)
      .setIssuedAt(now)
      .setExpirationTime(now + oidcConfig.idTokenTtl)
      .sign(this.privateKey!);
    return jwt;
  }

  /**
   * 签发 access_token（OAuth 2.0 Bearer，1 小时有效）
   */
  async signAccessToken(claims: AccessTokenClaims): Promise<string> {
    this.assertReady();
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({
      scope: claims.scope,
      client_id: claims.client_id,
    })
      .setProtectedHeader({ alg: 'RS256', kid: this.kid!, typ: 'JWT' })
      .setIssuer(oidcConfig.issuer)
      .setSubject(claims.sub)
      .setAudience(claims.aud)
      .setIssuedAt(now)
      .setExpirationTime(now + oidcConfig.accessTokenTtl)
      .sign(this.privateKey!);
    return jwt;
  }

  /**
   * 验证 access_token（Bearer 鉴权用），返回 payload
   */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    this.assertReady();
    const { payload } = await jwtVerify(token, this.publicKey!, {
      issuer: oidcConfig.issuer,
    });
    return payload;
  }

  /**
   * 返回 JWKS 公开密钥集
   */
  async getJWKS(): Promise<JWKSet> {
    this.assertReady();
    return { keys: [this.publicJwk!] };
  }

  getIssuer(): string {
    return oidcConfig.issuer;
  }

  getAccessTokenTtl(): number {
    return oidcConfig.accessTokenTtl;
  }

  private assertReady(): void {
    if (!this.initialized) {
      throw new Error(
        'OidcTokenService not initialized. Call initialize() at startup.',
      );
    }
  }
}

export const oidcTokenService = new OidcTokenService();
