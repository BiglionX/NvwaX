import { Router } from 'express';
import { aiSearchController } from '../controllers/ai-search.controller.js';

const router = Router();

router.post('/sessions', aiSearchController.createSession.bind(aiSearchController));
router.post('/chat', aiSearchController.chat.bind(aiSearchController));
router.get('/sessions/:sessionId', aiSearchController.getSession.bind(aiSearchController));

export default router;
