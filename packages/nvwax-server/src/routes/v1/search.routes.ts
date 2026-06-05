import { Router } from 'express';
import {
  searchAgents,
  searchSkills,
  unifiedSearch
} from '../../controllers/v1/search.controller.js';
import { requirePermission } from '../../middleware/api-key-auth.middleware.js';

const router = Router();

router.get('/agents', requirePermission('search:read'), searchAgents);
router.get('/skills', requirePermission('search:read'), searchSkills);
router.post('/unified', requirePermission('search:read'), unifiedSearch);

export default router;
