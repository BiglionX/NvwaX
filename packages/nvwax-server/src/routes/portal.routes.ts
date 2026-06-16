/**
 * Portal Routes (Sprint 2).
 *
 * /api/portal/*  — account-portal white-label endpoints.
 * Mounted by app.ts under /api. All endpoints are JSON-only.
 */

import { Router } from 'express';
import express from 'express';
import { portalController } from '../controllers/portal.controller.js';
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

export default router;
