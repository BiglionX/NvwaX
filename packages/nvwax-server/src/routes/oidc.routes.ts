/**
 * OIDC Routes（Sprint 1）
 *
 * 挂载 6 个端点（独立 Router，绕过 /api）：
 * - GET  /.well-known/openid-configuration
 * - GET  /.well-known/jwks.json
 * - GET  /oauth/authorize         （开发模式临时登录 form）
 * - POST /oauth/authorize         （提交登录，签发 code）
 * - POST /oauth/token             （authorization_code / refresh_token）
 * - GET  /oauth/userinfo
 * - POST /oauth/logout
 */

import { Router } from 'express';
import express from 'express';
import { oidcController } from '../controllers/oidc.controller.js';
import { loginRateLimiter } from '../middleware/login-rate-limiter.middleware.js';

const router = Router();

// authorize POST 需要解析 URL-encoded form body（与全局 json 解析器共存）
router.use(express.urlencoded({ extended: false }));
// token 端点接受 form-encoded body
router.use(express.urlencoded({ extended: false }));

// Discovery & JWKS（无鉴权，公开）
router.get('/.well-known/openid-configuration', oidcController.discovery);
router.get('/.well-known/jwks.json', oidcController.jwks);

// Authorize 端点（开发模式：临时登录）
router.get('/oauth/authorize', oidcController.authorizeGet);
router.post(
  '/oauth/authorize',
  loginRateLimiter,
  oidcController.authorizePost,
);

// Token 端点
// Sprint 2.12：不再挂 loginRateLimiter（5 次/5 分钟/IP）。
// 该限流本意是防密码爆破，但每次 OIDC 登录都要打一次 /oauth/token，
// 同 IP 下多人登录就会误伤全体（e2e 曾因此 429 锁死）。
// authorization_code 单次有效 + 短 TTL + PKCE 绑定、refresh_token 轮换，
// 已足以防滥用；密码爆破防护保留在 /oauth/authorize POST 与 /api/portal/login 等登录端点。
router.post('/oauth/token', oidcController.token);

// UserInfo 端点（Bearer 鉴权）
router.get('/oauth/userinfo', oidcController.userinfo);

// Logout 端点
router.post('/oauth/logout', oidcController.logout);

export default router;
