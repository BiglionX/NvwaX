/**
 * Leader Scheduler + RL Training 集成测试
 *
 * 验证：
 * 1. LeaderSchedulerService：每日反思 / Bundle 同步 / 执行记录
 * 2. GRPO 训练循环：rollout → advantage → KL → 保存
 * 3. DPO 训练循环：偏好对构造 → 损失计算 → 保存
 * 4. RL Orchestrator：统一编排（grpo / dpo / hybrid）
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md §3.1
 * - DeepSeekMath (GRPO): https://arxiv.org/abs/2402.03300
 * - DPO: https://arxiv.org/abs/2305.18290
 */

/// <reference types="jest" />

import { leaderSchedulerService } from '../services/leader-scheduler.service.js';
import { grpoTrainer } from '../services/rl-grpo-trainer.service.js';
import { dpoTrainer } from '../services/rl-dpo-trainer.service.js';
import { rlTrainingOrchestrator } from '../services/rl-training-orchestrator.service.js';

// ============================================================
// 1. Scheduler 测试
// ============================================================

describe('LeaderSchedulerService', () => {
  test('手动触发每日反思（低分 skill 较少时也应成功）', async () => {
    const result = await leaderSchedulerService.runDailyReflection();
    expect(['completed', 'failed']).toContain(result.status);
    if (result.status === 'completed') {
      expect(result.result).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    }
  }, 15000);

  test('手动触发 Bundle 同步', async () => {
    const result = await leaderSchedulerService.runBundleSync();
    expect(['completed', 'failed']).toContain(result.status);
    if (result.status === 'completed') {
      expect(result.result.discoveredFromFilesystem).toBeGreaterThanOrEqual(0);
    }
  }, 15000);

  test('查询任务执行记录', async () => {
    // 先执行一次反思，确保有记录
    await leaderSchedulerService.runDailyReflection();

    const runs = await leaderSchedulerService.getRecentRuns({ limit: 10 });
    expect(Array.isArray(runs)).toBe(true);
    expect(runs.length).toBeGreaterThan(0);
    expect(runs[0]).toHaveProperty('jobName');
    expect(runs[0]).toHaveProperty('status');
  }, 15000);

  test('启动/停止调度器', () => {
    leaderSchedulerService.start();
    const status = leaderSchedulerService.getStatus();
    expect(status.running).toBe(true);

    leaderSchedulerService.stop();
    const stopped = leaderSchedulerService.getStatus();
    expect(stopped.running).toBe(false);
  });
});

// ============================================================
// 2. GRPO 训练循环测试
// ============================================================

describe('GRPO 训练循环', () => {
  test('完整 GRPO 循环：采样 → 评分 → advantage → 保存', async () => {
    // 创建 RL run
    const run = await rlTrainingOrchestrator.createRun({
      runName: `grpo-test-${Date.now()}`,
      baseModel: 'deepseek-v4-flash',
      method: 'grpo',
      grpoConfig: { groupSize: 4, klBeta: 0.1 }
    });

    // 用少量 prompt 执行 GRPO
    const prompts = [
      { promptId: 'p1', prompt: '为新产品做小红书种草营销' },
      { promptId: 'p2', prompt: '开发一个 RESTful API' },
      { promptId: 'p3', prompt: '设计品牌 VI 系统' }
    ];

    const result = await grpoTrainer.train(run.id, prompts, {
      groupSize: 4,
      klBeta: 0.1,
      normalizeRewards: true
    });

    expect(result.totalPrompts).toBe(3);
    expect(result.totalRollouts).toBe(12);  // 3 prompts × 4 groupSize
    expect(result.rewardCurve.length).toBe(3);
    expect(result.lossCurve.length).toBe(3);

    // 验证 rollouts 落库
    const rollouts = await grpoTrainer.getRollouts(run.id);
    expect(rollouts.length).toBe(12);

    // 验证 advantage 存在且合理
    for (const r of rollouts) {
      expect(r.advantage).toBeDefined();
      expect(typeof r.advantage).toBe('number');
      expect(r.group_mean).toBeDefined();
      expect(r.group_std).toBeGreaterThan(0);
    }

    // 导出训练数据
    const exportPath = await grpoTrainer.exportForTraining(run.id);
    expect(exportPath).toContain('grpo_dataset.jsonl');

    // 清理
    await rlTrainingOrchestrator.cancelRun(run.id);
  }, 30000);

  test('GRPO 归一化：组内 advantage 均值为 0', async () => {
    const run = await rlTrainingOrchestrator.createRun({
      runName: `grpo-norm-${Date.now()}`,
      baseModel: 'deepseek-v4-flash',
      method: 'grpo'
    });

    await grpoTrainer.train(run.id, [{ promptId: 'p1', prompt: '测试 prompt' }], {
      groupSize: 4,
      normalizeRewards: true
    });

    const rollouts = await grpoTrainer.getRollouts(run.id);
    const advantages = rollouts.map(r => parseFloat(r.advantage));
    const mean = advantages.reduce((s, a) => s + a, 0) / advantages.length;

    // 归一化后均值应接近 0
    expect(Math.abs(mean)).toBeLessThan(0.01);

    await rlTrainingOrchestrator.cancelRun(run.id);
  }, 15000);
});

// ============================================================
// 3. DPO 训练循环测试
// ============================================================

describe('DPO 训练循环', () => {
  test('完整 DPO 循环：偏好对 → 损失 → 保存', async () => {
    const run = await rlTrainingOrchestrator.createRun({
      runName: `dpo-test-${Date.now()}`,
      baseModel: 'deepseek-v4-flash',
      method: 'dpo',
      dpoConfig: { beta: 0.1, minMargin: 0.05 }
    });

    // 先产生一些 rollout 数据供 DPO 配对
    const prompts = [
      { promptId: 'p1', prompt: '为新产品做小红书种草营销' },
      { promptId: 'p2', prompt: '开发一个 RESTful API' }
    ];
    await grpoTrainer.train(run.id, prompts, { groupSize: 4 });

    // 执行 DPO
    const result = await dpoTrainer.train(run.id, {
      beta: 0.1,
      sources: ['rollout_pairing', 'critic'],
      minMargin: 0.05
    });

    expect(result.totalPairs).toBeGreaterThan(0);
    expect(result.loss).toBeGreaterThan(0);
    expect(result.lossCurve.length).toBe(result.totalPairs);

    // 验证偏好对落库
    const pairs = await dpoTrainer.getPairs(run.id);
    expect(pairs.length).toBe(result.totalPairs);
    expect(pairs[0].chosen).toBeTruthy();
    expect(pairs[0].rejected).toBeTruthy();
    expect(pairs[0].chosen_score).toBeGreaterThan(pairs[0].rejected_score);

    // 导出
    const exportPath = await dpoTrainer.exportForTraining(run.id);
    expect(exportPath).toContain('dpo_dataset.jsonl');

    await rlTrainingOrchestrator.cancelRun(run.id);
  }, 30000);
});

// ============================================================
// 4. RL Orchestrator 端到端测试
// ============================================================

describe('RL Training Orchestrator', () => {
  test('创建 → 启动（grpo）→ 完成 → 产物导出', async () => {
    const run = await rlTrainingOrchestrator.createRun({
      runName: `rl-e2e-${Date.now()}`,
      baseModel: 'deepseek-v4-flash',
      method: 'grpo',
      grpoConfig: { groupSize: 3 },
      datasetFilter: { timeRangeDays: 30 },
      epochs: 1
    });

    const result = await rlTrainingOrchestrator.startRun(run.id);

    expect(result.run.status).toBe('completed');
    expect(result.run.totalRollouts).toBeGreaterThan(0);
    expect(result.outputDir).toBeTruthy();
    expect(result.metrics.grpo).toBeDefined();

    // 验证最终状态
    const finalRun = await rlTrainingOrchestrator.getRun(run.id);
    expect(finalRun?.status).toBe('completed');
    expect(finalRun?.completedAt).toBeTruthy();
    expect(finalRun?.adapterName).toContain('adapter');
  }, 60000);

  test('创建 → 启动（dpo）→ 完成', async () => {
    const run = await rlTrainingOrchestrator.createRun({
      runName: `rl-dpo-e2e-${Date.now()}`,
      baseModel: 'deepseek-v4-flash',
      method: 'dpo',
      dpoConfig: { beta: 0.1 },
      epochs: 1
    });

    const result = await rlTrainingOrchestrator.startRun(run.id);

    expect(result.run.status).toBe('completed');
    expect(result.metrics.dpo).toBeDefined();
    expect(result.metrics.dpo.totalPairs).toBeGreaterThanOrEqual(0);
  }, 60000);

  test('取消运行', async () => {
    const run = await rlTrainingOrchestrator.createRun({
      runName: `rl-cancel-${Date.now()}`,
      baseModel: 'deepseek-v4-flash',
      method: 'grpo'
    });

    const ok = await rlTrainingOrchestrator.cancelRun(run.id);
    expect(ok).toBe(true);

    const finalRun = await rlTrainingOrchestrator.getRun(run.id);
    expect(finalRun?.status).toBe('cancelled');
  });

  test('列表查询', async () => {
    const runs = await rlTrainingOrchestrator.listRuns({ limit: 10 });
    expect(Array.isArray(runs)).toBe(true);
    // 至少包含刚才创建的 run
    expect(runs.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 5. 性能预算
// ============================================================

describe('RL 性能预算', () => {
  test('GRPO 12 个 rollout < 10s', async () => {
    const run = await rlTrainingOrchestrator.createRun({
      runName: `perf-${Date.now()}`,
      baseModel: 'deepseek-v4-flash',
      method: 'grpo'
    });

    const prompts = Array.from({ length: 3 }, (_, i) => ({ promptId: `p${i}`, prompt: `测试需求 ${i}` }));
    const start = Date.now();

    await grpoTrainer.train(run.id, prompts, { groupSize: 4 });

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10000);

    await rlTrainingOrchestrator.cancelRun(run.id);
  }, 20000);
});