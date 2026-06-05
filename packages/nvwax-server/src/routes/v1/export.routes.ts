import { Router } from 'express';
import {
  exportAgent,
  exportAiTeam,
  downloadExport,
  batchExport,
  getExportHistory
} from '../../controllers/v1/export.controller.js';
import { requirePermission } from '../../middleware/api-key-auth.middleware.js';

const router = Router();

router.post('/agents/:id/export', requirePermission('export:read'), exportAgent);
router.post('/aiteams/:id/export', requirePermission('export:read'), exportAiTeam);
router.get('/exports/:id/download', requirePermission('export:read'), downloadExport);
router.post('/batch', requirePermission('export:read'), batchExport);
router.get('/history', requirePermission('export:read'), getExportHistory);

export default router;
