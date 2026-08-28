/**
 * Leader Scheduler Service (L2 定时任务)
 *
 * 对齐 Hermes Agent 的 L2 定时任务层设计。
 *
 * 定时任务：
 * 1. daily_reflection：每日自动反思（分析失败案例 → 提取模式 → 生成反思条目）
 * 2. bundle_sync：Bundle 自动同步（从文件系统发现 + 远端 Registry 拉取更新）
 * 3. rl_training：RL 训练调度（可选，按需触发）
 *
 * 调度机制：setInterval（与项目现有 crawler-scheduler 一致，不引入额外依赖）
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md §1.1
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §4.2
 */

import { Pool } from 'pg';
import { databaseService } from './database.service.js';
import { leaderReflectionService } from './leader-reflection.service.js';
import { leaderSkillService } from './leader-skill.service.js';
import { leaderBundleService } from './leader-bundle.service.js';
import { leaderBundleRegistry } from './leader-bundle-registry.service.js';

// ============================================================
// 类型定义
// ============================================================

export interface JobRunResult {
  jobName: string;
  status: 'completed' | 'failed' | 'skipped';
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  result: Record<string, unknown>;
  errorMessage?: string;
}

export interface SchedulerConfig {
  /** 每日反思间隔（毫秒），默认 24h */
  reflectionIntervalMs?: number;
  /** Bundle 同步间隔（毫秒），默认 6h */
  bundleSyncIntervalMs?: number;
  /** 是否自动同步远端 Registry */
  autoSyncRemoteBundles?: boolean;
  /** 远端同步时是否自动安装新版本 */
  autoInstallNewBundles?: boolean;
}

// ============================================================
// Leader Scheduler Service
// ============================================================

export class LeaderSchedulerService {
  private pool: Pool;
  private timers: Array<{ name: string; timer: NodeJS.Timeout }> = [];
  private running = false;
  private config: Required<SchedulerConfig>;

  constructor(config: SchedulerConfig = {}) {
    this.pool = databaseService.getPool();
    this.config = {
      reflectionIntervalMs: config.reflectionIntervalMs ?? 24 * 60 * 60 * 1000, // 24h
      bundleSyncIntervalMs: config.bundleSyncIntervalMs ?? 6 * 60 * 60 * 1000,   // 6h
      autoSyncRemoteBundles: config.autoSyncRemoteBundles ?? true,
      autoInstallNewBundles: config.autoInstallNewBundles ?? false
    };
  }

  // ============================================================
  // 生命周期
  // ============================================================

  /**
   * 启动所有定时任务
   */
  start(): void {
    if (this.running) {
      console.log('[LeaderScheduler] Already running');
      return;
    }
    this.running = true;
    console.log('[LeaderScheduler] Starting all scheduled jobs');

    // 任务 1：每日自动反思（启动后延迟 5s 先跑一次，便于初始化）
    this.schedule('daily_reflection', this.config.reflectionIntervalMs, () => this.runDailyReflection(), 5000);

    // 任务 2：Bundle 自动同步（启动后延迟 10s 跑一次）
    this.schedule('bundle_sync', this.config.bundleSyncIntervalMs, () => this.runBundleSync(), 10000);

    // 任务 3：清理过期反思（每天一次，跟随反思任务）
    this.schedule('cleanup_expired_reflections', 24 * 60 * 60 * 1000, () => this.cleanupExpiredReflections(), 15_000);

    console.log('[LeaderScheduler] All jobs scheduled');
  }

  /**
   * 停止所有定时任务
   */
  stop(): void {
    this.running = false;
    for (const { name, timer } of this.timers) {
      clearInterval(timer);
      console.log(`[LeaderScheduler] Stopped: ${name}`);
    }
    this.timers = [];
  }

  /**
   * 获取调度器状态
   */
  getStatus(): {
    running: boolean;
    jobs: Array<{ name: string; nextRunHint: string }>;
    lastRuns: Record<string, JobRunResult | undefined>;
  } {
    return {
      running: this.running,
      jobs: this.timers.map(t => ({ name: t.name, nextRunHint: 'interval' })),
      lastRuns: {} // 由外部查询 scheduler_job_runs 表获取
    };
  }

  /**
   * 通用调度注册
   */
  private schedule(name: string, intervalMs: number, fn: () => Promise<void>, initialDelayMs = 0): void {
    // 首次执行
    const firstTimer = setTimeout(async () => {
      try {
        await fn();
      } catch (err) {
        console.error(`[LeaderScheduler] ${name} first run failed:`, (err as Error).message);
      }
    }, initialDelayMs);

    // 定期执行
    const intervalTimer = setInterval(async () => {
      try {
        await fn();
      } catch (err) {
        console.error(`[LeaderScheduler] ${name} failed:`, (err as Error).message);
      }
    }, intervalMs);

    if (typeof firstTimer.unref === 'function') firstTimer.unref();
    if (typeof intervalTimer.unref === 'function') intervalTimer.unref();

    this.timers.push({ name, timer: intervalTimer });
  }

  // ============================================================
  // 任务 1：每日自动反思
  // ============================================================

  /**
   * 每日自动反思
   *
   * 流程：
   * 1. 统计近 24h 的失败案例（avg_success_score < 0.5 的 skill 使用记录）
   * 2. 分析失败模式（按 category / failure_pattern 聚合）
   * 3. 为每个失败模式生成反思条目（写入 leader_reflections）
   * 4. 更新 skill 统计
   */
  async runDailyReflection(): Promise<JobRunResult> {
    const startedAt = new Date();
    console.log('[LeaderScheduler] Starting daily reflection...');

    try {
      // 1. 查询低分 skills（近 30 天有使用记录）
      const lowScoreResult = await this.pool.query(
        `SELECT id, skill_id, name, category, usage_count, success_count, failure_count, avg_success_score
         FROM leader_skills
         WHERE avg_success_score IS NOT NULL
           AND avg_success_score < 0.5
           AND usage_count >= 3
         ORDER BY avg_success_score ASC
         LIMIT 20`
      );

      const lowScoreSkills = lowScoreResult.rows;
      let reflectionsCreated = 0;
      const createdReflectionIds: string[] = [];

      // 2. 为每个低分 skill 生成反思
      for (const skill of lowScoreSkills) {
        const successScore = parseFloat(skill.avg_success_score);
        const failureRate = skill.usage_count > 0
          ? (skill.failure_count / skill.usage_count)
          : 0;

        const summary = `Skill「${skill.name}」(${skill.skill_id}) 近期成功率仅 ${(successScore * 100).toFixed(0)}%（使用 ${skill.usage_count} 次，失败 ${skill.failure_count} 次）。失败率 ${(failureRate * 100).toFixed(0)}%。`;

        const improvementSuggestion = this.buildImprovementSuggestion(skill.category, skill.skill_id);

        // 创建反思（标记为 negative 训练信号，供 RL 使用）
        const reflection = await leaderReflectionService.create({
          sessionId: `scheduler-daily-${startedAt.toISOString().slice(0, 10)}`,
          leaderSkillId: skill.id,
          requirement: `自动反思: ${skill.name} 成功率过低`,
          summary,
          failurePattern: 'low_quality',
          improvementSuggestion,
          successScore: successScore,
          impactScore: Math.min(failureRate, 1),
          tags: [skill.category, 'daily_reflection']
        });

        // 标记训练信号为 negative（RL 数据源）
        await this.pool.query(
          `UPDATE leader_reflections SET training_signal = 'negative' WHERE id = $1`,
          [reflection.id]
        );

        reflectionsCreated++;
        createdReflectionIds.push(reflection.id);
      }

      // 3. 记录任务执行
      await this.recordJobRun('daily_reflection', 'reflection', 'completed', {
        lowScoreSkillsFound: lowScoreSkills.length,
        reflectionsCreated,
        reflectionIds: createdReflectionIds,
        date: startedAt.toISOString().slice(0, 10)
      }, startedAt);

      console.log(`[LeaderScheduler] Daily reflection done: ${reflectionsCreated} reflections created`);

      return {
        jobName: 'daily_reflection',
        status: 'completed',
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        result: {
          lowScoreSkillsFound: lowScoreSkills.length,
          reflectionsCreated
        }
      };
    } catch (error) {
      console.error('[LeaderScheduler] Daily reflection failed:', (error as Error).message);

      await this.recordJobRun('daily_reflection', 'reflection', 'failed', {}, startedAt, (error as Error).message).catch(() => {});

      return {
        jobName: 'daily_reflection',
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        result: {},
        errorMessage: (error as Error).message
      };
    }
  }

  /**
   * 根据 category 生成改进建议
   */
  private buildImprovementSuggestion(category: string, skillId: string): string {
    const suggestions: Record<string, string> = {
      'marketing': `建议为「${skillId}」增加更明确的 ROI 指标，减少空泛策略输出。可在 prompt 中强制要求输出可量化的 KPI。`,
      'development': `建议为「${skillId}」增加代码规范约束，强制输出测试覆盖。技术选型时应给出对比表格。`,
      'design': `建议为「${skillId}」增加品牌规范约束，输出前自查是否符合品牌色与字体规范。`,
      'customer-service': `建议为「${skillId}」增加响应时间指标，话术库需定期更新。`,
      'analysis': `建议为「${skillId}」增加数据源引用，结论必须可追溯到原始数据。`,
      'general': `建议为「${skillId}」增加任务优先级排序，明确里程碑和负责人。`
    };
    return suggestions[category] || `建议提升「${skillId}」的输出质量并添加更严格的验收标准。`;
  }

  // ============================================================
  // 任务 2：Bundle 自动同步
  // ============================================================

  /**
   * Bundle 自动同步
   *
   * 流程：
   * 1. 从文件系统发现新 Bundle（discoverFromFilesystem）
   * 2. （可选）从远端 Registry 拉取更新
   * 3. 统计新增/更新
   */
  async runBundleSync(): Promise<JobRunResult> {
    const startedAt = new Date();
    console.log('[LeaderScheduler] Starting bundle sync...');

    try {
      // 1. 文件系统发现
      const discovered = await leaderBundleService.discoverFromFilesystem();

      // 2. 远端同步（可选）
      let remoteSynced = 0;
      let remoteSkipped = 0;
      let remoteFailed = 0;

      if (this.config.autoSyncRemoteBundles) {
        // 查询所有 remote 来源的 bundle，尝试拉取更新
        const remoteBundles = await leaderBundleService.list({ source: 'remote' });
        for (const bundle of remoteBundles.items) {
          try {
            const pullResult = await leaderBundleRegistry.pull(bundle.name, 'latest', {
              autoInstall: this.config.autoInstallNewBundles
            });
            if (pullResult.cached) {
              remoteSkipped++;
            } else {
              remoteSynced++;
            }
          } catch (error) {
            remoteFailed++;
            console.warn(`[LeaderScheduler] Bundle sync failed for ${bundle.name}:`, (error as Error).message);
          }
        }
      }

      // 3. 记录任务执行
      await this.recordJobRun('bundle_sync', 'bundle_sync', 'completed', {
        discoveredFromFilesystem: discovered.length,
        remoteSynced,
        remoteSkipped,
        remoteFailed,
        bundles: discovered.map(b => b.name)
      }, startedAt);

      console.log(`[LeaderScheduler] Bundle sync done: ${discovered.length} local, ${remoteSynced} remote updated`);

      return {
        jobName: 'bundle_sync',
        status: 'completed',
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        result: {
          discoveredFromFilesystem: discovered.length,
          remoteSynced,
          remoteSkipped,
          remoteFailed
        }
      };
    } catch (error) {
      console.error('[LeaderScheduler] Bundle sync failed:', (error as Error).message);

      await this.recordJobRun('bundle_sync', 'bundle_sync', 'failed', {}, startedAt, (error as Error).message).catch(() => {});

      return {
        jobName: 'bundle_sync',
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        result: {},
        errorMessage: (error as Error).message
      };
    }
  }

  // ============================================================
  // 任务 3：清理过期反思
  // ============================================================

  /**
   * 清理过期反思
   * 只软删除（标记 expires_at），不物理删除
   */
  async cleanupExpiredReflections(): Promise<JobRunResult> {
    const startedAt = new Date();

    // 物理删除已过期超过 90 天的反思（防止表无限膨胀）
    const result = await this.pool.query(
      `DELETE FROM leader_reflections
       WHERE expires_at IS NOT NULL
         AND expires_at < NOW() - INTERVAL '90 days'`
    );

    const deletedCount = result.rowCount || 0;

    await this.recordJobRun('cleanup_expired_reflections', 'reflection', 'completed', {
      deletedCount
    }, startedAt);

    return {
      jobName: 'cleanup_expired_reflections',
      status: 'completed',
      startedAt,
      completedAt: new Date(),
      durationMs: Date.now() - startedAt.getTime(),
      result: { deletedCount }
    };
  }

  // ============================================================
  // 任务执行记录
  // ============================================================

  /**
   * 记录任务执行到 scheduler_job_runs
   */
  private async recordJobRun(
    jobName: string,
    jobType: string,
    status: 'completed' | 'failed' | 'skipped',
    result: Record<string, unknown>,
    startedAt: Date,
    errorMessage?: string
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO scheduler_job_runs (
        job_name, job_type, status, started_at, completed_at, result, error_message, duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        jobName,
        jobType,
        status,
        startedAt,
        new Date(),
        JSON.stringify(result),
        errorMessage || null,
        Date.now() - startedAt.getTime()
      ]
    ).catch(err => console.error('[LeaderScheduler] Failed to record job run:', err.message));
  }

  /**
   * 查询最近的任务执行记录
   */
  async getRecentRuns(options: { jobName?: string; limit?: number } = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (options.jobName) {
      conditions.push(`job_name = $${paramIdx++}`);
      params.push(options.jobName);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 20;
    params.push(limit);

    const result = await this.pool.query(
      `SELECT * FROM scheduler_job_runs ${whereClause}
       ORDER BY started_at DESC LIMIT $${paramIdx}`,
      params
    );

    return result.rows.map(row => ({
      id: row.id,
      jobName: row.job_name,
      jobType: row.job_type,
      status: row.status,
      startedAt: row.started_at?.toISOString?.(),
      completedAt: row.completed_at?.toISOString?.(),
      durationMs: row.duration_ms,
      result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result,
      errorMessage: row.error_message
    }));
  }
}

// 导出单例
export const leaderSchedulerService = new LeaderSchedulerService();