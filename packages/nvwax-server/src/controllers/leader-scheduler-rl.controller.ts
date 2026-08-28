/**
 * Leader Scheduler + RL Training Controller
 *
 * L2 定时任务 + RL 训练（GRPO/DPO）控制器。
 */

import { Request, Response } from 'express';
import { leaderSchedulerService } from '../services/leader-scheduler.service.js';
import { rlTrainingOrchestrator, RLTrainingConfig } from '../services/rl-training-orchestrator.service.js';

// ============================================================
// Scheduler Controller
// ============================================================

export class LeaderSchedulerController {
  /**
   * GET /api/leader-scheduler/status
   */
  async getStatus(req: Request, res: Response) {
    try {
      const status = leaderSchedulerService.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      console.error('[LeaderScheduler] getStatus failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-scheduler/start
   */
  async start(req: Request, res: Response) {
    try {
      leaderSchedulerService.start();
      res.json({ success: true, message: 'Scheduler started' });
    } catch (error) {
      console.error('[LeaderScheduler] start failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-scheduler/stop
   */
  async stop(req: Request, res: Response) {
    try {
      leaderSchedulerService.stop();
      res.json({ success: true, message: 'Scheduler stopped' });
    } catch (error) {
      console.error('[LeaderScheduler] stop failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-scheduler/run/daily-reflection
   * 手动触发每日反思
   */
  async runDailyReflection(req: Request, res: Response) {
    try {
      const result = await leaderSchedulerService.runDailyReflection();
      res.json({ success: result.status === 'completed', data: result });
    } catch (error) {
      console.error('[LeaderScheduler] runDailyReflection failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-scheduler/run/bundle-sync
   * 手动触发 Bundle 同步
   */
  async runBundleSync(req: Request, res: Response) {
    try {
      const result = await leaderSchedulerService.runBundleSync();
      res.json({ success: result.status === 'completed', data: result });
    } catch (error) {
      console.error('[LeaderScheduler] runBundleSync failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-scheduler/runs
   * 查询任务执行记录
   */
  async getRecentRuns(req: Request, res: Response) {
    try {
      const { jobName, limit } = req.query;
      const runs = await leaderSchedulerService.getRecentRuns({
        jobName: jobName as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({ success: true, data: runs });
    } catch (error) {
      console.error('[LeaderScheduler] getRecentRuns failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

// ============================================================
// RL Training Controller
// ============================================================

export class RlTrainingController {
  /**
   * POST /api/leader-rl/runs
   * 创建 RL 训练运行（grpo / dpo / hybrid）
   */
  async createRun(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).admin?.id;
      const config: RLTrainingConfig = req.body;
      if (!config.runName || !config.baseModel || !config.method) {
        return res.status(400).json({
          success: false,
          error: 'runName, baseModel, method (grpo|dpo|hybrid) are required'
        });
      }
      if (!['grpo', 'dpo', 'hybrid'].includes(config.method)) {
        return res.status(400).json({
          success: false,
          error: 'method must be grpo, dpo, or hybrid'
        });
      }
      const run = await rlTrainingOrchestrator.createRun({ ...config, userId });
      res.status(201).json({ success: true, data: run });
    } catch (error) {
      console.error('[RLTraining] createRun failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-rl/runs
   */
  async listRuns(req: Request, res: Response) {
    try {
      const { method, status, limit } = req.query;
      const runs = await rlTrainingOrchestrator.listRuns({
        method: method as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({ success: true, data: runs });
    } catch (error) {
      console.error('[RLTraining] listRuns failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-rl/runs/:id
   */
  async getRun(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const run = await rlTrainingOrchestrator.getRun(id);
      if (!run) {
        return res.status(404).json({ success: false, error: 'Run not found' });
      }
      res.json({ success: true, data: run });
    } catch (error) {
      console.error('[RLTraining] getRun failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-rl/runs/:id/start
   * 启动训练（GRPO/DPO 完整循环）
   */
  async startRun(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await rlTrainingOrchestrator.startRun(id);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[RLTraining] startRun failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-rl/runs/:id/cancel
   */
  async cancelRun(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ok = await rlTrainingOrchestrator.cancelRun(id);
      res.json({ success: ok });
    } catch (error) {
      console.error('[RLTraining] cancelRun failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

export const leaderSchedulerController = new LeaderSchedulerController();
export const rlTrainingController = new RlTrainingController();