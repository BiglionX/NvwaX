/**
 * Leader Bundle + Training 集成测试 (P2)
 *
 * 验证以下核心能力：
 * 1. LeaderBundleService CRUD + 安装/卸载
 * 2. LeaderBundleRegistry 远端拉取（mock 模式）
 * 3. LeaderTrainingService 数据收集 + Critic 评分 + 训练运行
 *
 * 设计参考：
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §7.6
 */

/// <reference types="jest" />

import { leaderBundleService } from '../services/leader-bundle.service.js';
import { leaderTrainingService } from '../services/leader-training.service.js';
import { leaderSkillService } from '../services/leader-skill.service.js';
import { leaderTrajectoryService } from '../services/leader-trajectory.service.js';

// ============================================================
// 1. LeaderBundleService 测试
// ============================================================

describe('LeaderBundleService', () => {
  test('列出所有内置 bundles（应至少 3 个官方 bundle）', async () => {
    const result = await leaderBundleService.list({ isOfficial: true });
    expect(result.items.length).toBeGreaterThanOrEqual(3);

    const names = result.items.map(b => b.name);
    expect(names).toContain('marketing-bundle');
    expect(names).toContain('development-bundle');
    expect(names).toContain('general-bundle');
  });

  test('获取单个 bundle', async () => {
    const bundle = await leaderBundleService.get('marketing-bundle');
    expect(bundle).toBeTruthy();
    expect(bundle?.name).toBe('marketing-bundle');
    expect(bundle?.version).toBe('1.0.0');
    expect(bundle?.skills).toContain('marketing-director-v1');
    expect(bundle?.isOfficial).toBe(true);
  });

  test('按 tag 过滤', async () => {
    const result = await leaderBundleService.list({ tag: 'marketing' });
    result.items.forEach(b => {
      expect(b.tags).toContain('marketing');
    });
  });

  test('注册自定义 bundle', async () => {
    const customName = `test-bundle-${Date.now()}`;
    const bundle = await leaderBundleService.register({
      name: customName,
      version: '1.0.0',
      format: 'hermes-skill-bundle/v1',
      description: 'Test bundle',
      skills: ['tech-lead-v1'],
      author: 'test-user',
      tags: ['test']
    });

    expect(bundle.name).toBe(customName);
    expect(bundle.skills).toContain('tech-lead-v1');

    // 清理
    await leaderBundleService.deactivate(customName);
  });
});

// ============================================================
// 2. Bundle 安装/卸载测试
// ============================================================

describe('Bundle 安装/卸载', () => {
  test('安装 marketing-bundle（幂等）', async () => {
    // 第一次安装
    const result1 = await leaderBundleService.install('marketing-bundle', { overwrite: true });
    expect(result1.bundleId).toBeTruthy();
    // skills 可能已经被 install 过，所以可能 0 installed
    expect(result1.installedSkills.length + result1.skippedSkills.length).toBeGreaterThan(0);

    // 第二次安装（应该全部 skipped，因为已存在）
    const result2 = await leaderBundleService.install('marketing-bundle');
    expect(result2.skippedSkills.length).toBe(result1.installedSkills.length + result2.installedSkills.length);
  });

  test('安装不存在的 bundle 应失败', async () => {
    await expect(
      leaderBundleService.install('non-existent-bundle')
    ).rejects.toThrow('Bundle not found');
  });

  test('列出已安装的 bundles', async () => {
    const installed = await leaderBundleService.listInstalled();
    expect(Array.isArray(installed)).toBe(true);
    // marketing-bundle 已经在 P0 阶段默认安装
    const names = installed.map(b => b.name);
    expect(names).toContain('marketing-bundle');
  });
});

// ============================================================
// 3. LeaderTrainingService 测试
// ============================================================

describe('LeaderTrainingService', () => {
  test('创建训练运行', async () => {
    const run = await leaderTrainingService.createRun({
      runName: `test-run-${Date.now()}`,
      baseModel: 'deepseek-v4-flash',
      trainingType: 'lora',
      loraConfig: { r: 8, alpha: 16, dropout: 0.05 },
      datasetFilter: {
        minSuccessScore: 0.5,
        timeRangeDays: 7
      }
    });

    expect(run.id).toBeTruthy();
    expect(run.status).toBe('pending');
    expect(run.trainingType).toBe('lora');

    // 清理
    await leaderTrainingService.cancelRun(run.id);
  });

  test('收集训练数据（基于现有 skills）', async () => {
    const dataset = await leaderTrainingService.collectDataset({
      minSuccessScore: 0.0,        // 不设最低分数
      timeRangeDays: 30,
      categories: ['marketing', 'development']
    });

    expect(dataset).toBeTruthy();
    expect(Array.isArray(dataset.examples)).toBe(true);
    // 不一定有数据（取决于生产环境）
  });

  test('Critic 评分（heuristic 模式）', async () => {
    const example = {
      id: 'test-1',
      sessionId: 'test-session',
      skillId: 'marketing-director-v1',
      requirement: '测试需求',
      input: '[SYSTEM]\n你是营销总监\n\n[USER]\n测试需求',
      output: '这是营销策略建议，包含 3 个步骤...',
      successScore: 0.85,
      metadata: {
        tokensUsed: 500,
        durationMs: 1200,
        hasReflections: true,
        createdAt: new Date().toISOString()
      }
    };

    const score = await leaderTrainingService.criticScore(example);

    expect(score.successScore).toBe(0.85);
    expect(score.qualityScore).toBeGreaterThan(0);
    expect(score.coherenceScore).toBeGreaterThan(0);
    expect(score.helpfulnessScore).toBeGreaterThan(0);
  });

  test('端到端：创建运行 → 启动 → 完成', async () => {
    const run = await leaderTrainingService.createRun({
      runName: `e2e-run-${Date.now()}`,
      baseModel: 'deepseek-v4-flash',
      datasetFilter: { minSuccessScore: 0.0, timeRangeDays: 7 }
    });

    const result = await leaderTrainingService.startRun(run.id);

    expect(result.run.status).toBe('completed');
    expect(result.dataset).toBeTruthy();
    expect(result.exportPath).toBeTruthy();

    // 验证 run 被更新
    const finalRun = await leaderTrainingService.getRun(run.id);
    expect(finalRun?.trajectoryCount).toBeGreaterThanOrEqual(0);
    expect(finalRun?.completedAt).toBeTruthy();
  }, 30000);

  test('取消训练运行', async () => {
    const run = await leaderTrainingService.createRun({
      runName: `cancel-run-${Date.now()}`,
      baseModel: 'deepseek-v4-flash'
    });

    const ok = await leaderTrainingService.cancelRun(run.id);
    expect(ok).toBe(true);

    const finalRun = await leaderTrainingService.getRun(run.id);
    expect(finalRun?.status).toBe('cancelled');
  });
});

// ============================================================
// 4. 性能预算
// ============================================================

describe('P2 性能预算', () => {
  test('Bundle 列表查询 < 100ms', async () => {
    const start = Date.now();
    await leaderBundleService.list({ limit: 50 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  test('数据收集 < 5s（小数据集）', async () => {
    const start = Date.now();
    await leaderTrainingService.collectDataset({
      minSuccessScore: 0.0,
      timeRangeDays: 30,
      skillIds: ['marketing-director-v1']
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  }, 10000);
});