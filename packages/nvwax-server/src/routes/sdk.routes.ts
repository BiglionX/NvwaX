import { Router } from 'express';
import { sdkController } from '../controllers/sdk.controller.js';
import { apiKeyAuthMiddleware, requirePermission } from '../middleware/api-key-auth.middleware.js';

const router = Router();

// All SDK routes require API key authentication
router.use(apiKeyAuthMiddleware);

// API Key management routes
router.post('/api-keys', requirePermission('sdk:api-keys:create'), sdkController.createApiKey.bind(sdkController));
router.get('/api-keys', requirePermission('sdk:api-keys:read'), sdkController.listApiKeys.bind(sdkController));
router.get('/api-keys/:id', requirePermission('sdk:api-keys:read'), sdkController.getApiKey.bind(sdkController));
router.put('/api-keys/:id', requirePermission('sdk:api-keys:update'), sdkController.updateApiKey.bind(sdkController));
router.delete('/api-keys/:id', requirePermission('sdk:api-keys:delete'), sdkController.deleteApiKey.bind(sdkController));
router.post('/api-keys/:id/rotate', requirePermission('sdk:api-keys:rotate'), sdkController.rotateApiKey.bind(sdkController));

// Usage statistics
router.get('/usage', requirePermission('sdk:usage:read'), sdkController.getUsageStats.bind(sdkController));

export default router;
