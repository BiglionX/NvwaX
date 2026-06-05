import { Router } from 'express';
import marketplaceRoutes from './marketplace.routes.js';
import agentsRoutes from './agents.routes.js';
import aiteamsRoutes from './aiteams.routes.js';
import searchRoutes from './search.routes.js';
import exportRoutes from './export.routes.js';

const router = Router();

router.use('/marketplace', marketplaceRoutes);
router.use('/agents', agentsRoutes);
router.use('/aiteams', aiteamsRoutes);
router.use('/search', searchRoutes);
router.use('/', exportRoutes);

export default router;
