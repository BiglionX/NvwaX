import { Router } from 'express';
import { nvwaLeaderController } from '../controllers/nvwa-leader.controller.js';

const router = Router();

// Nvwa Leader routes
router.post('/generate-team', nvwaLeaderController.generateTeam);
router.post('/save-to-project', nvwaLeaderController.saveToProject);
router.post('/create-and-save', nvwaLeaderController.createAndSave);

// 创建 AiTeam（自然语言创建 AI 团队）
router.post('/create-aiteam', nvwaLeaderController.createAiTeam);

export default router;
