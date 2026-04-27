import { Router } from 'express';
import { teamExecutionController } from '../controllers/team-execution.controller.js';

const router = Router();

// Team Execution routes
router.post('/teams/:teamId/execute', teamExecutionController.executeTeam);
router.get('/agent-teams/:agentTeamId/executions', teamExecutionController.getExecutionHistory);
router.get('/executions/:executionId', teamExecutionController.getExecutionDetails);
router.post('/executions/:executionId/cancel', teamExecutionController.cancelExecution);

export default router;
