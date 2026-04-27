import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';
import { apiKeyAuthMiddleware } from '../middleware/api-key-auth.middleware.js';

const router = Router();

// All webhook routes require API key authentication
router.use(apiKeyAuthMiddleware);

// Webhook subscription management
router.post('/webhooks', webhookController.createWebhook.bind(webhookController));
router.get('/webhooks', webhookController.listWebhooks.bind(webhookController));
router.get('/webhooks/:id', webhookController.getWebhook.bind(webhookController));
router.put('/webhooks/:id', webhookController.updateWebhook.bind(webhookController));
router.delete('/webhooks/:id', webhookController.deleteWebhook.bind(webhookController));

// Webhook events
router.get('/webhooks/events', webhookController.getEvents.bind(webhookController));
router.post('/webhooks/events/:id/retry', webhookController.retryEvent.bind(webhookController));

export default router;
