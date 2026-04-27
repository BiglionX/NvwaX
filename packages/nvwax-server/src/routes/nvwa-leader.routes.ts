import { Router } from 'express';
import { nvwaLeaderController } from '../controllers/nvwa-leader.controller.js';

const router = Router();

// Nvwa Leader routes
router.post('/generate-team', nvwaLeaderController.generateTeam);
router.post('/save-to-project', nvwaLeaderController.saveToProject);
router.post('/create-and-save', nvwaLeaderController.createAndSave);

export default router;
