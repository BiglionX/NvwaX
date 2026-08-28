import { Router } from 'express';
import type { Request, Response } from 'express';
import { aiteamCreationController } from '../controllers/aiteam-creation.controller.js';
import { universalAuthMiddleware } from '../middleware/universal-auth.middleware.js';
import { ProClawBackendService } from '../services/proclaw.service.js';
import { databaseService } from '../services/database.service.js';

const router = Router();

// 所有 AiTeam 创建路由都需要用户或管理员认证
router.use(universalAuthMiddleware);

// AiTeam 创建会话路由
router.post('/sessions', aiteamCreationController.createSession);
router.get('/sessions', aiteamCreationController.getUserSessions);
router.get('/sessions/importable', aiteamCreationController.listImportableSessions);
router.get('/sessions/:id', aiteamCreationController.getSession);
router.post('/sessions/:id/message', aiteamCreationController.sendMessage);
router.post('/sessions/:id/nvwax-match', aiteamCreationController.triggerNvwaXMatch);
router.post('/sessions/:id/confirm', aiteamCreationController.confirmAndSaveTeam);
router.post('/sessions/:id/export', aiteamCreationController.exportTeamFromSession);
router.post('/sessions/:id/import-to-repository', aiteamCreationController.importSessionToRepository);
router.post('/sessions/:id/publish-to-marketplace', aiteamCreationController.publishToMarketplace);
router.get('/sessions/:id/download', aiteamCreationController.downloadDocumentPackage);
router.post('/sessions/:id/integrate-proclaw', aiteamCreationController.integrateToProClaw);
router.put('/sessions/:id/local-state', aiteamCreationController.pushLocalState);
router.get('/sessions/:id/local-state', aiteamCreationController.getLocalState);
router.put('/sessions/:id/requirements', aiteamCreationController.updateRequirements);
router.put('/sessions/:id/roles', aiteamCreationController.updateRoles);
router.get('/sessions/:id/progress', aiteamCreationController.getProgress);
router.delete('/sessions/:id', aiteamCreationController.deleteSession);

// Agent 复用决策路由
router.post('/sessions/:id/decide-agents', aiteamCreationController.decideAgents);
router.post('/sessions/:id/confirm-agent', aiteamCreationController.confirmAgentDecision);
router.get('/sessions/:id/agent-decisions', aiteamCreationController.getAgentDecisions);

// SSE 进度追踪路由
router.get('/sessions/:id/stream', aiteamCreationController.streamProgress);
router.post('/sessions/:id/broadcast', aiteamCreationController.broadcastProgress);

// P1: 事件溯源 - 从事件流重放会话
router.get('/sessions/:id/replay', aiteamCreationController.replaySession);

/**
 * 虚拟公司导出包下载端点
 * GET /api/aiteam-creation/packages/:packageId/download
 *
 * ProClaw 桌面端的虚拟公司插件通过此端点获取 .nvwax-vc.json 文件内容。
 * 此端点允许未登录访问（因为 packageId 本身是 128-bit 随机 UUID，
 * 不可枚举），但只返回字段化的 JSON 数据。
 */
router.get('/packages/:packageId/download', async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    if (typeof packageId !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(packageId)) {
      return res.status(400).json({ success: false, error: 'Invalid packageId' });
    }
    const pool = databaseService.getPool();
    const proClawService = new ProClawBackendService(pool);
    const pkg = await proClawService.readPackageFromTempFile(packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        error: 'Package not found or expired',
      });
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="virtual-company-${pkg.team.id}.nvwax-vc.json"`
    );
    res.json(pkg);
  } catch (error) {
    console.error('Error in /packages/:packageId/download:', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

export default router;
