import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { apiKeyAuthMiddleware } from '../middleware/api-key-auth.middleware.js';

const router = Router();

// All v1 API routes require API key authentication
router.use(apiKeyAuthMiddleware);

// Chat Completions API (OpenAI-compatible)
router.post('/chat/completions', chatController.createCompletion.bind(chatController));

export default router;
