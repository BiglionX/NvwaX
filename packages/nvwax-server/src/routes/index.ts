import { Router } from 'express';
import type { Request, Response } from 'express';
import { searchController } from '../controllers/search.controller.js';
import { projectController } from '../controllers/project.controller.js';
import { userController } from '../controllers/user.controller.js';
import { userAuthController } from '../controllers/user-auth.controller.js';
import { bountyController } from '../controllers/bounty.controller.js';
import { teamSkillController } from '../controllers/team-skill.controller.js';
import { userAuthMiddleware } from '../middleware/user-auth.middleware.js';
import teamSkillRouter from './team-skill.routes.js';
import nvwaLeaderRouter from './nvwa-leader.routes.js';
import nvwaAgentRouter from './nvwa-agent.routes.js';
import aiteamCreationRouter from './aiteam-creation.routes.js';
import aiteamStateMachineRouter from './aiteam-state-machine.routes.js';
import teamExecutionRouter from './team-execution.routes.js';
import adminRouter from './admin.routes.js';
import sdkRouter from './sdk.routes.js';
import rbacRouter from './rbac.routes.js';
import { apiKeyManagerController } from '../controllers/api-key-manager.controller.js';
import v1Router from './v1.routes.js';
import webhookRouter from './webhook.routes.js';
import billingRouter from './billing.routes.js';
import agentRouter from './agent.routes.js';
import aiteamRouter from './aiteam.routes.js';
import notificationRouter from './notification.routes.js';
import downloadRouter from './download.routes.js';
import aiSearchRouter from './ai-search.routes.js';
import microbizRouter from './microbiz.routes.js';
import capabilitiesRouter from './capabilities.routes.js';
import executionRouter from './execution.routes.js';
import actionRouter from './action.routes.js';
import recommendationRouter from './recommendation.routes.js';
import oidcAdminRouter from './oidc-admin.routes.js';
import blueprintRouter from './blueprint.routes.js';

const router = Router();

/**
 * Sprint 2.12 — 共享账号治理：遗留 JWT 密码入口已关闭。
 * 注册/登录统一走 account-portal（/api/portal/*）→ OIDC（/oauth/*）。
 * 旧入口问题：弱密码策略、不校验 is_active、签发 HS256 JWT 绕过统一会话，
 * 会在共享 users 表里产生规则外的账号。
 */
function legacyAuthGone(_req: Request, res: Response): void {
  res.status(410).json({
    error: 'gone',
    message:
      'This legacy auth endpoint is closed. Please use the account portal (/portal/register, /portal/login) and OIDC instead.',
  });
}

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

// User Token routes
router.get('/user/token/quota', userController.getTokenQuota);
router.get('/user/token/transactions', userController.getTokenTransactions);
router.get('/user/token/orders', userController.getTokenOrders);
router.post('/user/token/create-order', userController.createTokenOrder);
router.post('/user/token/create-stripe-session', userController.createStripeCheckoutSession);
router.get('/user/token/payment-configs', userController.getPaymentConfigs);

// User authentication routes (with rate limiting)
// Sprint 2.12: /auth/register 与 /auth/login 已关闭（410 Gone）——
// 注册/登录统一走 account-portal + OIDC。保留 /auth/profile（读当前用户）。
router.post('/auth/register', legacyAuthGone);
router.post('/auth/login', legacyAuthGone);
router.post('/auth/proclaw-cross-auth', userAuthController.proclawCrossAuth);
router.get('/auth/profile', userAuthController.getProfile);

// Social login routes — Sprint 2.12 已关闭（410 Gone）。
// 社交登录统一走 account-portal（/api/portal/social/*）→ OIDC；
// 旧 /auth/facebook|google|github|wechat/login 签发 HS256 JWT 绕过统一会话，
// 且站点内绑定功能已下线（profile 页社交绑定区块已移除）。
router.post('/auth/facebook/login', legacyAuthGone);
router.post('/auth/google/login', legacyAuthGone);
router.post('/auth/github/login', legacyAuthGone);
router.post('/auth/wechat/login', legacyAuthGone);
router.get('/auth/github/authorize', legacyAuthGone);
router.get('/auth/github/callback', legacyAuthGone);
router.get('/auth/social/accounts', legacyAuthGone);
router.post('/auth/social/bind', legacyAuthGone);
router.post('/auth/social/unbind', legacyAuthGone);

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

// Nvwa Agent routes (single agent creation)
router.use('/nvwa-agent', nvwaAgentRouter);

// Virtual Company Creation routes
router.use('/aiteam-creation', aiteamCreationRouter);

// v2.2.0 Aiteam State Machine routes (图状态机 + Checkpoint)
router.use('/aiteam-state-machine', aiteamStateMachineRouter);

// Team Execution routes
router.use('/', teamExecutionRouter);

// Admin routes
router.use('/admin', adminRouter);

// OIDC RP 管理端点（Sprint 2.9）
router.use('/admin/oidc/clients', oidcAdminRouter);

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

// Ai Search routes (AI 对话式搜索)
router.use('/ai-search', aiSearchRouter);

// Download routes (打包文件下载)
router.use('/downloads', downloadRouter);

// MicroBiz AI Team Suite routes
router.use('/microbiz', microbizRouter);

// V2 Capabilities routes (行业插件能力注册)
router.use('/v2/capabilities', capabilitiesRouter);

// Phase 3 — 执行委托（仅管理员，委托给隔离的 nvwax-executor）
router.use('/execution', executionRouter);

// V2 Agent Action routes (Agent Action 验证)
router.use('/v2/agents', actionRouter);

// V2 Agent Recommendation routes (Agent/Skill 推荐)
router.use('/v2/agents', recommendationRouter);

// API Key Manager routes (JWT protected, for user center)
router.post('/user/api-keys', userAuthMiddleware, apiKeyManagerController.createApiKey.bind(apiKeyManagerController));
router.get('/user/api-keys', userAuthMiddleware, apiKeyManagerController.listApiKeys.bind(apiKeyManagerController));
router.put('/user/api-keys/:id', userAuthMiddleware, apiKeyManagerController.updateApiKey.bind(apiKeyManagerController));
router.delete('/user/api-keys/:id', userAuthMiddleware, apiKeyManagerController.deleteApiKey.bind(apiKeyManagerController));
router.get('/user/api-keys/usage', userAuthMiddleware, apiKeyManagerController.getUsageStats.bind(apiKeyManagerController));

// V1 API routes (OpenAI-compatible)
router.use('/v1', v1Router);

// Agent blueprint routes (Draft → Deploy 门禁，Phase 3)
router.use('/blueprints', blueprintRouter);

export default router;
