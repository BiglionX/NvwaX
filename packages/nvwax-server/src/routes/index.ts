import { Router } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { projectController } from '../controllers/project.controller.js';
import { userController } from '../controllers/user.controller.js';
import { userAuthController } from '../controllers/user-auth.controller.js';
import { bountyController } from '../controllers/bounty.controller.js';
import { teamSkillController } from '../controllers/team-skill.controller.js';
import { userAuthMiddleware } from '../middleware/user-auth.middleware.js';
import teamSkillRouter from './team-skill.routes.js';
import nvwaLeaderRouter from './nvwa-leader.routes.js';
import virtualCompanyRouter from './virtual-company.routes.js';
import teamExecutionRouter from './team-execution.routes.js';
import adminRouter from './admin.routes.js';
import sdkRouter from './sdk.routes.js';
import rbacRouter from './rbac.routes.js';
import v1Router from './v1.routes.js';
import webhookRouter from './webhook.routes.js';
import billingRouter from './billing.routes.js';
import agentRouter from './agent.routes.js';
import aiteamRouter from './aiteam.routes.js';
import notificationRouter from './notification.routes.js';
import downloadRouter from './download.routes.js';

const router = Router();

// Search routes
router.get('/search/agents', searchController.searchAgents);
router.get('/search/skills', searchController.searchSkills);
router.post('/search/unified', searchController.unifiedSearch);
router.get('/search/recommend-skills', searchController.recommendSkills);
router.get('/search/popular-skills', searchController.getPopularSkills);
router.post('/search/crawl', searchController.triggerCrawl);
router.get('/search/crawler-status', searchController.getCrawlerStatus);

// Project routes
router.post('/projects', projectController.createProject);
router.get('/projects', projectController.getProjects);
router.get('/projects/:id', projectController.getProject);
router.put('/projects/:id', projectController.updateProject);
router.delete('/projects/:id', projectController.deleteProject);

// AiTeam routes
router.post('/teams', projectController.createAiTeam);
router.get('/projects/:projectId/teams', projectController.getAiTeams);
router.put('/teams/:id', projectController.updateAiTeam);
router.delete('/teams/:id', projectController.deleteAiTeam);

// Agent Team routes
router.post('/agent-teams', projectController.createAgentTeam);
router.get('/teams/:teamId/agent-teams', projectController.getAgentTeams);
router.put('/agent-teams/:id', projectController.updateAgentTeam);
router.delete('/agent-teams/:id', projectController.deleteAgentTeam);

// Package Export routes
router.post('/agent-teams/:id/export', projectController.exportAgentTeam);
router.get('/agent-teams/:id/package-info', projectController.getPackageInfo);

// Package Build routes
router.post('/agent-teams/:id/build-package', projectController.buildPackage);
router.get('/package-builds/:jobId', projectController.getBuildStatus);

// ProClaw Export routes
router.post('/team-skills/:id/export-to-proclaw', projectController.exportToProClaw);

// User routes
router.get('/user/profile', userController.getProfile);
router.put('/user/:userId', userController.updateProfile);
router.get('/user/stats', userController.getStats);

// User authentication routes
router.post('/auth/register', userAuthController.register);
router.post('/auth/login', userAuthController.login);
router.get('/auth/profile', userAuthController.getProfile);

// Bounty routes
router.post('/bounties', userAuthMiddleware, bountyController.createBounty);
router.get('/bounties', bountyController.getBounties);
router.get('/bounties/popular-searches', bountyController.getPopularSearches);
router.get('/bounties/suggestions', bountyController.getSearchSuggestions);
router.get('/bounties/:id', bountyController.getBountyById);
router.post('/bounties/:id/claim', userAuthMiddleware, bountyController.claimBounty);
router.post('/bounties/:id/submit', userAuthMiddleware, bountyController.submitBounty);
router.post('/bounties/:id/verify', userAuthMiddleware, bountyController.verifyBounty);
router.delete('/bounties/:id', userAuthMiddleware, bountyController.cancelBounty);

// Team Skill routes
router.use('/team-skills', teamSkillRouter);

// Team Skill Build routes
router.get('/team-skill-builds/:jobId', teamSkillController.getBuildStatus);

// Nvwa Leader routes
router.use('/nvwa', nvwaLeaderRouter);

// Virtual Company Creation routes
router.use('/virtual-company', virtualCompanyRouter);

// Team Execution routes
router.use('/', teamExecutionRouter);

// Admin routes
router.use('/admin', adminRouter);

// SDK routes
router.use('/sdk', sdkRouter);

// RBAC routes
router.use('/sdk', rbacRouter);

// Webhook routes
router.use('/sdk', webhookRouter);

// Billing routes
router.use('/sdk', billingRouter);

// Agent routes (Nvwa 智能体工厂)
router.use('/agents', agentRouter);

// AiTeam routes (AI 团队管理)
router.use('/aiteams', aiteamRouter);

// Notification routes (通知系统)
router.use('/notifications', notificationRouter);

// Download routes (打包文件下载)
router.use('/downloads', downloadRouter);

// V1 API routes (OpenAI-compatible)
router.use('/v1', v1Router);

export default router;
