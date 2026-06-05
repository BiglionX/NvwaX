import { Router } from 'express';
import {
  createAgent,
  listAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  publishAgent,
  unpublishAgent
} from '../../controllers/v1/agent.controller.js';
import { requirePermission } from '../../middleware/api-key-auth.middleware.js';

const router = Router();

router.post('/', requirePermission('agent:create'), createAgent);
router.get('/', requirePermission('agent:read'), listAgents);
router.get('/:id', requirePermission('agent:read'), getAgentById);
router.put('/:id', requirePermission('agent:update'), updateAgent);
router.delete('/:id', requirePermission('agent:delete'), deleteAgent);
router.post('/:id/publish', requirePermission('agent:publish'), publishAgent);
router.post('/:id/unpublish', requirePermission('agent:publish'), unpublishAgent);

export default router;
