import { Router } from 'express';
import { billingController } from '../controllers/billing.controller.js';
import { apiKeyAuthMiddleware } from '../middleware/api-key-auth.middleware.js';

const router = Router();

// All billing routes require API key authentication
router.use(apiKeyAuthMiddleware);

// Billing alerts
router.post('/billing/alerts', billingController.createAlert.bind(billingController));
router.get('/billing/alerts', billingController.listAlerts.bind(billingController));
router.delete('/billing/alerts/:id', billingController.deleteAlert.bind(billingController));

// Billing reports
router.get('/billing/report', billingController.getReport.bind(billingController));

export default router;
