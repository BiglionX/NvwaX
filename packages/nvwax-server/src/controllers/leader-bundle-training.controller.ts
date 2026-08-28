/**
 * Leader Bundle + Training Controller
 *
 * P2 阶段新增控制器：
 * - Leader Bundle CRUD、安装、卸载
 * - Bundle Registry 远端拉取、搜索
 * - Training Run 创建、查询、取消
 */

import { Request, Response } from 'express';
import { leaderBundleService, InstallOptions } from '../services/leader-bundle.service.js';
import { leaderBundleRegistry, PullOptions } from '../services/leader-bundle-registry.service.js';
import { leaderTrainingService, TrainingRunConfig } from '../services/leader-training.service.js';

// ============================================================
// Bundle Controller
// ============================================================

export class LeaderBundleController {
  /**
   * GET /api/leader-bundles
   */
  async list(req: Request, res: Response) {
    try {
      const { source, isOfficial, tag, installed, limit, offset } = req.query;
      const result = await leaderBundleService.list({
        source: source as string,
        isOfficial: isOfficial === 'true' ? true : isOfficial === 'false' ? false : undefined,
        tag: tag as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[LeaderBundle] list failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-bundles/:name
   */
  async get(req: Request, res: Response) {
    try {
      const { name } = req.params;
      const bundle = await leaderBundleService.get(name);
      if (!bundle) {
        return res.status(404).json({ success: false, error: 'Bundle not found' });
      }
      res.json({ success: true, data: bundle });
    } catch (error) {
      console.error('[LeaderBundle] get failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-bundles/installed
   */
  async listInstalled(req: Request, res: Response) {
    try {
      const bundles = await leaderBundleService.listInstalled();
      res.json({ success: true, data: bundles });
    } catch (error) {
      console.error('[LeaderBundle] listInstalled failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-bundles/install
   * Body: { name, options?: InstallOptions }
   */
  async install(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).admin?.id;
      const { name, options } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }
      const result = await leaderBundleService.install(name, { ...options, userId });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[LeaderBundle] install failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-bundles/uninstall
   * Body: { name }
   */
  async uninstall(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).admin?.id;
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }
      const result = await leaderBundleService.uninstall(name, { userId });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[LeaderBundle] uninstall failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-bundles/discover
   * 从文件系统扫描所有 bundles
   */
  async discover(req: Request, res: Response) {
    try {
      const bundles = await leaderBundleService.discoverFromFilesystem();
      res.json({ success: true, data: bundles });
    } catch (error) {
      console.error('[LeaderBundle] discover failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-bundles/register
   * 注册一个新 Bundle（一般由 Registry 自动调用）
   */
  async register(req: Request, res: Response) {
    try {
      const bundle = await leaderBundleService.register(req.body, {
        isOfficial: req.body.isOfficial,
        source: req.body.source,
        sourceUrl: req.body.sourceUrl
      });
      res.status(201).json({ success: true, data: bundle });
    } catch (error) {
      console.error('[LeaderBundle] register failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * DELETE /api/leader-bundles/:name
   */
  async deactivate(req: Request, res: Response) {
    try {
      const { name } = req.params;
      const ok = await leaderBundleService.deactivate(name);
      res.json({ success: ok });
    } catch (error) {
      console.error('[LeaderBundle] deactivate failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

// ============================================================
// Registry Controller
// ============================================================

export class LeaderBundleRegistryController {
  /**
   * POST /api/leader-bundle-registry/search
   * Body: { query, tag?, limit? }
   */
  async search(req: Request, res: Response) {
    try {
      const { query, tag, limit } = req.body;
      if (!query) {
        return res.status(400).json({ success: false, error: 'query is required' });
      }
      const results = await leaderBundleRegistry.search(query, { tag, limit });
      res.json({ success: true, data: results });
    } catch (error) {
      console.error('[LeaderBundleRegistry] search failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-bundle-registry/pull
   * Body: { bundleName, version?, options?: PullOptions }
   */
  async pull(req: Request, res: Response) {
    try {
      const { bundleName, version, options } = req.body;
      if (!bundleName) {
        return res.status(400).json({ success: false, error: 'bundleName is required' });
      }
      const result = await leaderBundleRegistry.pull(bundleName, version, options);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[LeaderBundleRegistry] pull failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-bundle-registry/config
   */
  async getConfig(req: Request, res: Response) {
    try {
      const config = leaderBundleRegistry.getConfig();
      res.json({ success: true, data: config });
    } catch (error) {
      console.error('[LeaderBundleRegistry] getConfig failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * PUT /api/leader-bundle-registry/config
   * Body: { url }
   */
  async setRegistryUrl(req: Request, res: Response) {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, error: 'url is required' });
      }
      leaderBundleRegistry.setRegistryUrl(url);
      res.json({ success: true });
    } catch (error) {
      console.error('[LeaderBundleRegistry] setRegistryUrl failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-bundle-registry/cache
   */
  async getCacheStats(req: Request, res: Response) {
    try {
      const stats = await leaderBundleRegistry.getCacheStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('[LeaderBundleRegistry] getCacheStats failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * DELETE /api/leader-bundle-registry/cache
   */
  async clearCache(req: Request, res: Response) {
    try {
      const { bundleName } = req.body || {};
      const count = await leaderBundleRegistry.clearCache(bundleName);
      res.json({ success: true, data: { cleared: count } });
    } catch (error) {
      console.error('[LeaderBundleRegistry] clearCache failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

// ============================================================
// Training Controller
// ============================================================

export class LeaderTrainingController {
  /**
   * POST /api/leader-training/runs
   * 创建训练运行
   */
  async createRun(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).admin?.id;
      const config: TrainingRunConfig = req.body;
      if (!config.runName || !config.baseModel) {
        return res.status(400).json({ success: false, error: 'runName and baseModel are required' });
      }
      const run = await leaderTrainingService.createRun({ ...config, userId });
      res.status(201).json({ success: true, data: run });
    } catch (error) {
      console.error('[LeaderTraining] createRun failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-training/runs/:id/start
   */
  async startRun(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await leaderTrainingService.startRun(id);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[LeaderTraining] startRun failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-training/runs/:id/cancel
   */
  async cancelRun(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ok = await leaderTrainingService.cancelRun(id);
      res.json({ success: ok });
    } catch (error) {
      console.error('[LeaderTraining] cancelRun failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-training/runs
   */
  async listRuns(req: Request, res: Response) {
    try {
      const { status, limit } = req.query;
      const runs = await leaderTrainingService.listRuns({
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({ success: true, data: runs });
    } catch (error) {
      console.error('[LeaderTraining] listRuns failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-training/runs/:id
   */
  async getRun(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const run = await leaderTrainingService.getRun(id);
      if (!run) {
        return res.status(404).json({ success: false, error: 'Run not found' });
      }
      res.json({ success: true, data: run });
    } catch (error) {
      console.error('[LeaderTraining] getRun failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-training/dataset/preview
   * 仅收集数据，不启动训练（用于预览）
   */
  async previewDataset(req: Request, res: Response) {
    try {
      const dataset = await leaderTrainingService.collectDataset(req.body || {});
      res.json({ success: true, data: dataset });
    } catch (error) {
      console.error('[LeaderTraining] previewDataset failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

export const leaderBundleController = new LeaderBundleController();
export const leaderBundleRegistryController = new LeaderBundleRegistryController();
export const leaderTrainingController = new LeaderTrainingController();