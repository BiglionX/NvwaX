import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  skillhubApiUrl: process.env.SKILLHUB_API_URL || 'https://skillhub.proclaw.cc/api',
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: './data/nvwax.db',
};

/**
 * OIDC IdP 配置（Sprint 1）
 * - issuer: 必须与 RP 配置的 issuer 一致
 * - privateKeyPath: PKCS8 PEM 文件路径（K8s Secret 挂载）
 * - 4 个 TTL: accessToken 1h / idToken 1h / refreshToken 30d / authCode 10m
 */
export const oidcConfig = {
  issuer: process.env.OIDC_ISSUER || 'https://account.proclaw.cc',
  privateKeyPath: process.env.OIDC_PRIVATE_KEY_PATH || '',
  accessTokenTtl: 3600,                  // 1 hour
  idTokenTtl: 3600,                      // 1 hour
  refreshTokenTtl: 30 * 24 * 3600,       // 30 days
  authCodeTtl: 600,                      // 10 minutes
};
