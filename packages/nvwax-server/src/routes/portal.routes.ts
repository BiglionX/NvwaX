/**
 * Portal Routes (Sprint 2).
 *
 * /api/portal/*  — account-portal white-label endpoints.
 * Mounted by app.ts under /api. All endpoints are JSON-only.
 *
 * Sprint 2.12 — 统一登录模块 social login 端点（Google / GitHub）
 */

import { Router } from 'express';
import express from 'express';
import { portalController } from '../controllers/portal.controller.js';
import { portalSocialAuthController } from '../controllers/portal-social-auth.controller.js';
import { loginRateLimiter } from '../middleware/login-rate-limiter.middleware.js';

const router = Router();

// JSON body parser for portal endpoints (in addition to global app.use(express.json()))
router.use(express.json({ limit: '64kb' }));

router.get('/ping', portalController.ping);
router.post('/register', loginRateLimiter, portalController.register);
router.post('/activate', loginRateLimiter, portalController.activate);
router.post('/activate/:token', loginRateLimiter, portalController.activate);
router.post('/login', loginRateLimiter, portalController.login);
router.post('/logout', portalController.logout);

// Sprint 2.12 — 统一登录模块 social auth
// Google（ID Token 模式：前端 GIS SDK 拿 credential 调此端点）
router.post('/social/google', loginRateLimiter, portalSocialAuthController.google.bind(portalSocialAuthController));
// GitHub（OAuth Code 流程：start 重定向到 GitHub，callback 处理 code）
router.get('/social/github/start', portalSocialAuthController.githubStart.bind(portalSocialAuthController));
router.get('/social/github/callback', portalSocialAuthController.githubCallback.bind(portalSocialAuthController));

export default router;
