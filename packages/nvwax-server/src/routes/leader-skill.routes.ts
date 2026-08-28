/**
 * Leader Skill Routes
 *
 * REST API 路由：
 * - P0: Leader Skills / Reflections / Trajectories
 * - P1: Leader Events / Orchestrator（事件溯源 + Saga）
 * - P2: Leader Bundles / Registry / Training（Atropos 训练闭环）
 *
 * 对齐 Hermes Agent 的可观测性接口设计。
 */

import { Router } from 'express';
import {
  leaderSkillController,
  leaderReflectionController,
  leaderTrajectoryController,
  leaderEventController,
  leaderOrchestratorController
} from '../controllers/leader-skill.controller.js';
import {
  leaderBundleController,
  leaderBundleRegistryController,
  leaderTrainingController
} from '../controllers/leader-bundle-training.controller.js';
import {
  leaderSchedulerController,
  rlTrainingController
} from '../controllers/leader-scheduler-rl.controller.js';

const router = Router();

// ============================================================
// P0: Leader Skills
// ============================================================

router.get('/leader-skills', (req, res) => leaderSkillController.list(req, res));
router.get('/leader-skills/:skillId', (req, res) => leaderSkillController.getOne(req, res));
router.post('/leader-skills', (req, res) => leaderSkillController.create(req, res));
router.post('/leader-skills/route', (req, res) => leaderSkillController.route(req, res));
router.post('/leader-skills/:skillId/record-usage', (req, res) => leaderSkillController.recordUsage(req, res));
router.put('/leader-skills/:skillId', (req, res) => leaderSkillController.update(req, res));
router.delete('/leader-skills/:skillId', (req, res) => leaderSkillController.deactivate(req, res));

// ============================================================
// P0: Leader Reflections (L4)
// ============================================================

router.get('/leader-reflections', (req, res) => leaderReflectionController.list(req, res));
router.post('/leader-reflections', (req, res) => leaderReflectionController.create(req, res));
router.post('/leader-reflections/recall', (req, res) => leaderReflectionController.recall(req, res));
router.post('/leader-reflections/:id/apply', (req, res) => leaderReflectionController.markResolved(req, res));

// ============================================================
// P0: Leader Trajectories (L1)
// ============================================================

router.get('/leader-trajectories', (req, res) => leaderTrajectoryController.getBySession(req, res));
router.post('/leader-trajectories/append', (req, res) => leaderTrajectoryController.append(req, res));
router.get('/leader-trajectories/stats', (req, res) => leaderTrajectoryController.stats(req, res));

// ============================================================
// P1: Leader Events (事件溯源 + WAL)
// ============================================================

router.get('/leader-events', (req, res) => leaderEventController.getBySession(req, res));
router.get('/leader-events/stats', (req, res) => leaderEventController.stats(req, res));
router.get('/leader-events/unapplied', (req, res) => leaderEventController.getUnapplied(req, res));
router.get('/leader-events/verify', (req, res) => leaderEventController.verifyHashChain(req, res));
router.post('/leader-events/replay', (req, res) => leaderEventController.replay(req, res));
router.get('/leader-events/type/:eventType', (req, res) => leaderEventController.getByType(req, res));
router.get('/leader-events/causality/:seq', (req, res) => leaderEventController.getCausalityChain(req, res));
router.get('/leader-events/seq/:seq', (req, res) => leaderEventController.getBySeq(req, res));

// ============================================================
// P1: Leader Orchestrator (Coordinator-Worker + Saga)
// ============================================================

router.post('/leader-orchestrator/execute', (req, res) => leaderOrchestratorController.execute(req, res));
router.post('/leader-orchestrator/register-worker', (req, res) => leaderOrchestratorController.registerWorker(req, res));

// ============================================================
// P2: Leader Bundles (Skill Bundle 注册中心)
// ============================================================

router.get('/leader-bundles', (req, res) => leaderBundleController.list(req, res));
router.get('/leader-bundles/installed', (req, res) => leaderBundleController.listInstalled(req, res));
router.get('/leader-bundles/:name', (req, res) => leaderBundleController.get(req, res));
router.post('/leader-bundles/register', (req, res) => leaderBundleController.register(req, res));
router.post('/leader-bundles/install', (req, res) => leaderBundleController.install(req, res));
router.post('/leader-bundles/uninstall', (req, res) => leaderBundleController.uninstall(req, res));
router.post('/leader-bundles/discover', (req, res) => leaderBundleController.discover(req, res));
router.delete('/leader-bundles/:name', (req, res) => leaderBundleController.deactivate(req, res));

// ============================================================
// P2: Bundle Registry (远端拉取 + 缓存)
// ============================================================

router.post('/leader-bundle-registry/search', (req, res) => leaderBundleRegistryController.search(req, res));
router.post('/leader-bundle-registry/pull', (req, res) => leaderBundleRegistryController.pull(req, res));
router.get('/leader-bundle-registry/config', (req, res) => leaderBundleRegistryController.getConfig(req, res));
router.put('/leader-bundle-registry/config', (req, res) => leaderBundleRegistryController.setRegistryUrl(req, res));
router.get('/leader-bundle-registry/cache', (req, res) => leaderBundleRegistryController.getCacheStats(req, res));
router.delete('/leader-bundle-registry/cache', (req, res) => leaderBundleRegistryController.clearCache(req, res));

// ============================================================
// P2: Leader Training (Atropos 风格训练闭环)
// ============================================================

router.get('/leader-training/runs', (req, res) => leaderTrainingController.listRuns(req, res));
router.post('/leader-training/runs', (req, res) => leaderTrainingController.createRun(req, res));
router.get('/leader-training/runs/:id', (req, res) => leaderTrainingController.getRun(req, res));
router.post('/leader-training/runs/:id/start', (req, res) => leaderTrainingController.startRun(req, res));
router.post('/leader-training/runs/:id/cancel', (req, res) => leaderTrainingController.cancelRun(req, res));
router.post('/leader-training/dataset/preview', (req, res) => leaderTrainingController.previewDataset(req, res));

// ============================================================
// L2: Leader Scheduler（定时任务）
// ============================================================

router.get('/leader-scheduler/status', (req, res) => leaderSchedulerController.getStatus(req, res));
router.post('/leader-scheduler/start', (req, res) => leaderSchedulerController.start(req, res));
router.post('/leader-scheduler/stop', (req, res) => leaderSchedulerController.stop(req, res));
router.post('/leader-scheduler/run/daily-reflection', (req, res) => leaderSchedulerController.runDailyReflection(req, res));
router.post('/leader-scheduler/run/bundle-sync', (req, res) => leaderSchedulerController.runBundleSync(req, res));
router.get('/leader-scheduler/runs', (req, res) => leaderSchedulerController.getRecentRuns(req, res));

// ============================================================
// RL: GRPO/DPO 训练（Atropos 完整循环）
// ============================================================

router.get('/leader-rl/runs', (req, res) => rlTrainingController.listRuns(req, res));
router.post('/leader-rl/runs', (req, res) => rlTrainingController.createRun(req, res));
router.get('/leader-rl/runs/:id', (req, res) => rlTrainingController.getRun(req, res));
router.post('/leader-rl/runs/:id/start', (req, res) => rlTrainingController.startRun(req, res));
router.post('/leader-rl/runs/:id/cancel', (req, res) => rlTrainingController.cancelRun(req, res));

export default router;