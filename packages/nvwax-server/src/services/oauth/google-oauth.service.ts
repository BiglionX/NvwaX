/**
 * Google OAuth 服务
 *
 * 通过 Google Identity Services (GIS) 验证 ID Token
 *
 * 流程：
 * 1. 前端通过 Google 一键登录获取 credential (ID Token JWT)
 * 2. 后端接收 credential，验证 JWT 签名和声明
 * 3. 从 JWT payload 中提取用户信息
 *
 * 验证方式：
 * - 从 Google JWKS 端点获取公钥
 * - 使用 Node.js crypto 模块验证 RSA-SHA256 签名
 * - 验证 iss、aud、exp 等关键声明
 */

import axios from 'axios';
import { createPublicKey, createVerify } from 'crypto';
import { BaseOAuthService } from './oauth-service.js';
import { OAuthProvider } from '../../types/oauth.types.js';

// Google 公钥端点
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUER = 'https://accounts.google.com';

// JWK 缓存（1小时有效）
let cachedKeys: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 3600000;

export class GoogleOAuthService extends BaseOAuthService {
  readonly provider: OAuthProvider = 'google';

  private readonly clientId: string;

  constructor() {
    super();
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';

    if (!this.clientId) {
      console.warn('[GoogleOAuth] GOOGLE_CLIENT_ID not configured');
    }
  }

  /**
   * 验证 Google ID Token (JWT) 并获取用户信息
   *
   * @param credential 客户端从 Google 一键登录获取的 credential (ID Token)
   * @returns 标准化的用户信息
   */
  async verifyAndGetUserInfo(credential: string): Promise<{
    providerUserId: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    rawData: Record<string, any>;
  }> {
    // 1. 解析 JWT
    const parts = credential.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid Google ID token format');
    }

    // 2. 解码 header 和 payload
    let header: any, payload: any;
    try {
      header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    } catch {
      throw new Error('Failed to decode Google ID token');
    }

    // 3. 验证 JWT 声明
    this.verifyClaims(payload);

    // 4. 获取公钥并验证签名
    const publicKey = await this.getPublicKey(header.kid);
    this.verifySignature(credential, publicKey);

    return {
      providerUserId: payload.sub,
      email: payload.email || undefined,
      name: payload.name || undefined,
      avatarUrl: payload.picture || undefined,
      rawData: payload
    };
  }

  /**
   * 验证 JWT 的关键声明
   */
  private verifyClaims(payload: any): void {
    // 验证 issuer
    if (payload.iss !== GOOGLE_ISSUER) {
      throw new Error(`Invalid token issuer: ${payload.iss}`);
    }

    // 验证 audience（必须匹配我们的 Client ID）
    if (payload.aud !== this.clientId) {
      throw new Error('Token audience does not match client ID');
    }

    // 验证过期时间
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      throw new Error('Google ID token has expired');
    }

    // 验证签发时间（允许 5 分钟时钟偏差）
    if (payload.iat > now + 300) {
      throw new Error('Google ID token issued in the future');
    }

    // 验证 azp（授权方）可选但建议
    if (payload.azp && payload.azp !== this.clientId) {
      // 对于 Web 应用，azp 通常等于 aud，但不是必须的
      console.warn('[GoogleOAuth] azp mismatch:', payload.azp);
    }
  }

  /**
   * 获取 Google 公钥（带缓存）
   */
  private async getPublicKey(kid: string): Promise<any> {
    await this.fetchAndCacheKeys();

    const key = cachedKeys.find(k => k.kid === kid);
    if (!key) {
      throw new Error('Google public key not found for the given key ID');
    }
    return key;
  }

  /**
   * 从 Google JWKS 端点获取并缓存公钥
   */
  private async fetchAndCacheKeys(): Promise<void> {
    const now = Date.now();
    if (cachedKeys.length > 0 && now - lastFetchTime < CACHE_DURATION) {
      return;
    }

    try {
      const response = await axios.get(GOOGLE_CERTS_URL);
      cachedKeys = response.data.keys;
      lastFetchTime = now;
      console.log('[GoogleOAuth] Public keys refreshed:', cachedKeys.length, 'keys');
    } catch (error) {
      if (cachedKeys.length === 0) {
        throw new Error('Failed to fetch Google public keys');
      }
      // 有缓存可用时使用缓存
      console.warn('[GoogleOAuth] Failed to refresh public keys, using cached');
    }
  }

  /**
   * 验证 JWT 的 RSA-SHA256 签名
   *
   * 使用 Node.js 内置 crypto 模块，支持 JWK 格式（Node.js >= 15）
   */
  private verifySignature(token: string, jwk: any): void {
    const parts = token.split('.');
    const signature = Buffer.from(parts[2], 'base64url');
    const data = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf-8');

    try {
      // 将 JWK 转换为 Node.js 公钥对象（Node.js 15+ 支持 JWK 格式）
      const publicKey = createPublicKey({
        key: {
          kty: jwk.kty,
          n: jwk.n,
          e: jwk.e,
          alg: jwk.alg
        },
        format: 'jwk'
      });

      // 验证签名
      const verifier = createVerify('RSA-SHA256');
      verifier.update(data);
      verifier.end();

      const isValid = verifier.verify(publicKey, signature);
      if (!isValid) {
        throw new Error('Signature verification failed');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Signature verification failed') {
        throw error;
      }
      throw new Error(`Google ID token verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 格式化错误为用户可读消息
   */
  formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes('expired')) {
        return 'Google 登录凭证已过期，请重新授权';
      }
      if (message.includes('audience') || message.includes('issuer')) {
        return 'Google 登录验证失败，应用配置有误';
      }
      if (message.includes('signature') || message.includes('verification')) {
        return 'Google 登录凭证无效，请重试';
      }
      if (message.includes('not configured')) {
        return 'Google 登录暂未配置，请联系管理员';
      }
      if (message.includes('public key')) {
        return 'Google 登录验证失败，无法获取密钥';
      }
    }
    return 'Google 登录失败，请稍后重试';
  }
}

export const googleOAuthService = new GoogleOAuthService();
