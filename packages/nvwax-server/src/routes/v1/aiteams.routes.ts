import { Router } from 'express';
import {
  createAiTeam,
  listAiTeams,
  getAiTeamById,
  updateAiTeam,
  deleteAiTeam,
  publishAiTeam,
  unpublishAiTeam
} from '../../controllers/v1/aiteam.controller.js';
import { requirePermission } from '../../middleware/api-key-auth.middleware.js';

const router = Router();

router.post('/', requirePermission('aiteam:create'), createAiTeam);
router.get('/', requirePermission('aiteam:read'), listAiTeams);
router.get('/:id', requirePermission('aiteam:read'), getAiTeamById);
router.put('/:id', requirePermission('aiteam:update'), updateAiTeam);
router.delete('/:id', requirePermission('aiteam:delete'), deleteAiTeam);
router.post('/:id/publish', requirePermission('aiteam:publish'), publishAiTeam);
router.post('/:id/unpublish', requirePermission('aiteam:publish'), unpublishAiTeam);

export default router;
