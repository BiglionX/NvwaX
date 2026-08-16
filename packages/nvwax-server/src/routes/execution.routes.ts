/**
 * execution.routes.ts — 执行委托演示路由（Phase 3）
 * ------------------------------------------------------------
 * POST /api/execution/run — 仅管理员（req.admin）可触发，把执行任务
 * 委托给隔离的 nvwax-executor worker（业务层不直接执行代码）。
 *
 * 请求体：{ kind: 'js'|'shell'|'python', source?/command?, args?, cwd?, timeoutMs?, env?, execArgs? }
 */

import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { executorClient } from '../services/execution/executor-client.service.js';

const router = Router();

// 需要认证（写入 req.user/req.admin）
router.use(authMiddleware);

router.post('/run', async (req: Request, res: Response) => {
  try {
    // 仅管理员可用（Phase 3 演示；未来可按产品策略扩展权限）
    if (!(req as any).admin) {
      res.status(403).json({ success: false, error: 'admin privileges required' });
      return;
    }

    if (!executorClient.isConfigured) {
      res.status(503).json({
        success: false,
        error: 'EXECUTOR_TOKEN not configured; execution delegation disabled',
      });
      return;
    }

    const { kind = 'js', source, command, args, cwd, timeoutMs, env, execArgs } = req.body || {};

    if (!kind || !['js', 'shell', 'python'].includes(kind)) {
      res.status(400).json({ success: false, error: 'kind must be js|shell|python' });
      return;
    }

    const result = await executorClient.run({
      kind,
      source,
      command,
      args,
      cwd,
      timeoutMs,
      env,
      execArgs,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? String(error) });
  }
});

export default router;
