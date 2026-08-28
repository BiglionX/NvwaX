/**
 * RL Training Orchestrator Service（GRPO/DPO 统一编排）
 *
 * 对齐 Hermes Atropos 的 RL 训练编排层。
 *
 * 职责：
 * 1. 统一创建 RL 训练运行（rl_training_runs）
 * 2. 根据 method 分发到 GRPO 或 DPO 训练器
 * 3. 从 leader_trajectories / leader_reflections 构造训练 prompt 集
 * 4. 管理训练状态机（pending → rolling_out → scoring → updating → completed）
 * 5. 导出训练产物（JSONL + 适配器元数据）
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md §3.1
 * - Hermes Atropos: rl_cli.py / hermes_atropos.py
 */

import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { databaseService } from './database.service.js';
import { grpoTrainer, GRPOConfig } from './rl-grpo-trainer.service.js';
import { dpoTrainer, DPOConfig } from './rl-dpo-trainer.service.js';
import { leaderTrajectoryService } from './leader-trajectory.service.js';

// ============================================================
// 类型定义
// ============================================================

export type RLMethod = 'grpo' | 'dpo' | 'hybrid';

export interface RLTrainingConfig {
  runName: string;
  baseModel: string;
  method: RLMethod;
  /** GRPO 参数（method=grpo 或 hybrid 时使用） */
  grpoConfig?: GRPOConfig;
  /** DPO 参数（method=dpo 或 hybrid 时使用） */
  dpoConfig?: DPOConfig;
  /** 数据集过滤 */
  datasetFilter?: {
    categories?: string[];
    skillIds?: string[];
    timeRangeDays?: number;
    minTrajectoryCount?: number;
  };
  epochs?: number;
  userId?: string;
  /** 训练回调（注入真实训练逻辑时使用） */
  onTrainStep?: (step: number, total: number, metrics: Record<string, number>) => Promise<void>;
}

export interface RLRun {
  id: string;
  runName: string;
  baseModel: string;
  method: RLMethod;
  config: Record<string, unknown>;
  totalRollouts: number;
  totalPairs: number;
  totalGroups: number;
  totalTokens: number;
  avgReward?: number;
  status: 'pending' | 'rolling_out' | 'scoring' | 'updating' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentEpoch: number;
  totalEpochs: number;
  metrics: Record<string, unknown>;
  outputDir?: string;
  adapterName?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  createdBy?: string;
  errorMessage?: string;
}

// ============================================================
// RL Training Orchestrator
// ============================================================

export class RlTrainingOrchestrator {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  // ============================================================
  // 运行管理
  // ============================================================

  /**
   * 创建 RL 训练运行
   */
  async createRun(config: RLTrainingConfig): Promise<RLRun> {
    console.log(`[RLTraining] Creating ${config.method} run: ${config.runName}`);

    const result = await this.pool.query(
      `INSERT INTO rl_training_runs (
        run_name, base_model, method, config, status, total_epochs, created_by
      ) VALUES ($1, $2, $3, $4, 'pending', $5, $6)
      RETURNING *`,
      [
        config.runName,
        config.baseModel,
        config.method,
        JSON.stringify({
          grpoConfig: config.grpoConfig,
          dpoConfig: config.dpoConfig,
          datasetFilter: config.datasetFilter || {}
        }),
        config.epochs || 1,
        config.userId || null
      ]
    );

    console.log(`[RLTraining] Run created: ${result.rows[0].id}`);
    return this.rowToRun(result.rows[0]);
  }

  /**
   * 获取运行详情
   */
  async getRun(runId: string): Promise<RLRun | null> {
    const result = await this.pool.query(
      'SELECT * FROM rl_training_runs WHERE id = $1',
      [runId]
    );
    return result.rows[0] ? this.rowToRun(result.rows[0]) : null;
  }

  /**
   * 列出运行
   */
  async listRuns(options: { method?: string; status?: string; limit?: number } = {}): Promise<RLRun[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (options.method) {
      conditions.push(`method = $${paramIdx++}`);
      params.push(options.method);
    }
    if (options.status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(options.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 20;
    params.push(limit);

    const result = await this.pool.query(
      `SELECT * FROM rl_training_runs ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIdx}`,
      params
    );
    return result.rows.map(row => this.rowToRun(row));
  }

  /**
   * 取消运行
   */
  async cancelRun(runId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE rl_training_runs SET status = 'cancelled', completed_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'rolling_out', 'scoring', 'updating')`,
      [runId]
    );
    return (result.rowCount || 0) > 0;
  }

  // ============================================================
  // 训练执行
  // ============================================================

  /**
   * 启动训练
   *
   * 状态机：
   * pending → rolling_out → scoring → updating → completed
   *                        ↘ failed / cancelled
   *
   * @param runId 运行 ID
   * @param onTrainStep 训练步进回调（真实训练逻辑接入点）
   */
  async startRun(runId: string, onTrainStep?: (step: number, total: number, metrics: Record<string, number>) => Promise<void>): Promise<{
    run: RLRun;
    metrics: Record<string, unknown>;
    outputDir?: string;
  }> {
    const run = await this.getRun(runId);
    if (!run) throw new Error('RL training run not found');
    if (run.status !== 'pending') {
      throw new Error(`Cannot start run with status: ${run.status}`);
    }

    const config = run.config as { grpoConfig?: GRPOConfig; dpoConfig?: DPOConfig; datasetFilter?: any };

    // 更新状态为 rolling_out
    await this.updateStatus(runId, 'rolling_out', 0.1);

    try {
      // 1. 构造训练 prompt 集（从 leader_trajectories 收集）
      const prompts = await this.buildTrainingPrompts(config.datasetFilter || {});

      if (prompts.length === 0) {
        throw new Error('No training prompts found. Run some orchestration tasks first to generate trajectories.');
      }

      const epochs = run.totalEpochs || 1;
      const allMetrics: Record<string, unknown> = {};
      const lossCurves: number[] = [];
      const rewardCurves: number[] = [];

      // 2. 按 epoch 循环训练
      for (let epoch = 0; epoch < epochs; epoch++) {
        await this.updateStatus(runId, 'scoring', 0.2 + (epoch / epochs) * 0.6);

        if (run.method === 'grpo' || run.method === 'hybrid') {
          // GRPO 阶段
          const grpoResult = await grpoTrainer.train(runId, prompts, config.grpoConfig || {});

          lossCurves.push(...grpoResult.lossCurve);
          rewardCurves.push(...grpoResult.rewardCurve);
          allMetrics.grpo = grpoResult;

          // 更新 run 的 epoch 进度
          await this.pool.query(
            `UPDATE rl_training_runs SET current_epoch = $1 WHERE id = $2`,
            [epoch + 1, runId]
          );
        }

        if (run.method === 'dpo' || run.method === 'hybrid') {
          // DPO 阶段
          const dpoResult = await dpoTrainer.train(runId, config.dpoConfig || {});

          lossCurves.push(...dpoResult.lossCurve);
          allMetrics.dpo = dpoResult;
        }

        // 训练步进回调（真实训练逻辑）
        if (onTrainStep) {
          await onTrainStep(epoch + 1, epochs, {
            loss: lossCurves.length > 0 ? lossCurves[lossCurves.length - 1] : 0,
            reward: rewardCurves.length > 0 ? rewardCurves[rewardCurves.length - 1] : 0
          });
        }
      }

      // 3. 导出训练产物
      const outputDir = await this.exportArtifacts(runId, run.method, config);

      // 4. 标记完成
      await this.pool.query(
        `UPDATE rl_training_runs SET
          status = 'completed',
          progress = 1.0,
          completed_at = NOW(),
          output_dir = $1,
          adapter_name = $2,
          metrics = metrics || $3::jsonb
         WHERE id = $4`,
        [
          outputDir,
          `${run.runName}-adapter`,
          JSON.stringify({ ...allMetrics, lossCurve: lossCurves.slice(-50), rewardCurve: rewardCurves.slice(-50) }),
          runId
        ]
      );

      const finalRun = await this.getRun(runId);
      console.log(`[RLTraining] Run ${runId} completed. Output: ${outputDir}`);

      return {
        run: finalRun!,
        metrics: allMetrics,
        outputDir
      };
    } catch (error) {
      console.error('[RLTraining] Run failed:', (error as Error).message);

      await this.pool.query(
        `UPDATE rl_training_runs SET
          status = 'failed',
          completed_at = NOW(),
          error_message = $1
         WHERE id = $2`,
        [(error as Error).message, runId]
      );

      throw error;
    }
  }

  // ============================================================
  // 数据准备
  // ============================================================

  /**
   * 构造训练 prompt 集
   * 从 leader_trajectories（orchestration 用途的 user 消息）收集
   */
  private async buildTrainingPrompts(datasetFilter: {
    categories?: string[];
    skillIds?: string[];
    timeRangeDays?: number;
    minTrajectoryCount?: number;
  }): Promise<Array<{ promptId: string; prompt: string }>> {
    const timeRangeDays = datasetFilter.timeRangeDays || 30;
    const minTrajectoryCount = datasetFilter.minTrajectoryCount || 1;

    // 查询有成功轨迹的 session
    const result = await this.pool.query(
      `SELECT t.session_id, t.content,
              COUNT(*) OVER (PARTITION BY t.session_id) as session_count,
              s.category, s.skill_id
       FROM leader_trajectories t
       LEFT JOIN leader_skills s ON t.leader_skill_id = s.id
       WHERE t.role = 'user'
         AND t.purpose IN ('generation', 'orchestration', 'routing')
         AND t.created_at > NOW() - INTERVAL '${timeRangeDays} days'
         ${datasetFilter.categories && datasetFilter.categories.length > 0
           ? `AND s.category = ANY($1)`
           : ''}
       ORDER BY t.created_at DESC
       LIMIT 500`
    );

    // 按 session 去重（一个 session 取第一条 user 消息）
    const seenSessions = new Set<string>();
    const prompts: Array<{ promptId: string; prompt: string }> = [];

    for (const row of result.rows) {
      if (seenSessions.has(row.session_id)) continue;
      seenSessions.add(row.session_id);

      if (parseInt(row.session_count) < minTrajectoryCount) continue;
      if (!row.content || row.content.trim().length < 10) continue;

      prompts.push({
        promptId: row.session_id,
        prompt: row.content.substring(0, 2000)
      });
    }

    console.log(`[RLTraining] Built ${prompts.length} training prompts`);
    return prompts;
  }

  // ============================================================
  // 产物导出
  // ============================================================

  /**
   * 导出训练产物
   * - grpo_dataset.jsonl（GRPO 格式）
   * - dpo_dataset.jsonl（DPO 格式）
   * - adapter_manifest.json（LoRA 适配器元数据）
   */
  private async exportArtifacts(runId: string, method: RLMethod, config: any): Promise<string> {
    const dir = path.join(os.tmpdir(), 'nvwax-rl', runId);
    await fs.mkdir(dir, { recursive: true });

    // 导出数据集
    if (method === 'grpo' || method === 'hybrid') {
      try {
        await grpoTrainer.exportForTraining(runId);
      } catch (err) {
        console.warn('[RLTraining] GRPO export failed:', (err as Error).message);
      }
    }
    if (method === 'dpo' || method === 'hybrid') {
      try {
        await dpoTrainer.exportForTraining(runId);
      } catch (err) {
        console.warn('[RLTraining] DPO export failed:', (err as Error).message);
      }
    }

    // 导出适配器 manifest
    const adapterManifest = {
      adapterName: `${method}-adapter-${runId.slice(0, 8)}`,
      baseModel: (await this.getRun(runId))?.baseModel || 'deepseek-v4-flash',
      method,
      format: 'peft-lora',
      config: config.grpoConfig || config.dpoConfig || {},
      exportedAt: new Date().toISOString(),
      datasets: [
        ...(method === 'grpo' || method === 'hybrid' ? ['grpo_dataset.jsonl'] : []),
        ...(method === 'dpo' || method === 'hybrid' ? ['dpo_dataset.jsonl'] : [])
      ],
      trainingCommand: this.buildTrainingCommand(runId, method)
    };

    await fs.writeFile(
      path.join(dir, 'adapter_manifest.json'),
      JSON.stringify(adapterManifest, null, 2),
      'utf-8'
    );

    console.log(`[RLTraining] Artifacts exported to ${dir}`);
    return dir;
  }

  /**
   * 生成外部训练命令（HuggingFace TRL 等）
   */
  private buildTrainingCommand(runId: string, method: RLMethod): string {
    const datasetPath = path.join(os.tmpdir(), 'nvwax-rl', runId);
    if (method === 'grpo') {
      return `python -m trl.trainer.grpo_trainer \\
  --dataset_path ${datasetPath}/grpo_dataset.jsonl \\
  --model_name_or_path deepseek-ai/deepseek-v4-flash \\
  --output_dir ${datasetPath}/adapter \\
  --per_device_train_batch_size 4 \\
  --gradient_accumulation_steps 4 \\
  --num_train_epochs 1 \\
  --learning_rate 5e-6 \\
  --logging_steps 10`;
    }
    return `python -m trl.trainer.dpo_trainer \\
  --dataset_path ${datasetPath}/dpo_dataset.jsonl \\
  --model_name_or_path deepseek-ai/deepseek-v4-flash \\
  --output_dir ${datasetPath}/adapter \\
  --beta 0.1 \\
  --per_device_train_batch_size 4 \\
  --num_train_epochs 1 \\
  --learning_rate 5e-6`;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  private async updateStatus(runId: string, status: string, progress: number): Promise<void> {
    await this.pool.query(
      `UPDATE rl_training_runs SET status = $1, progress = $2 WHERE id = $3`,
      [status, progress, runId]
    );
  }

  private rowToRun(row: any): RLRun {
    return {
      id: row.id,
      runName: row.run_name,
      baseModel: row.base_model,
      method: row.method,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      totalRollouts: row.total_rollouts,
      totalPairs: row.total_pairs,
      totalGroups: row.total_groups,
      totalTokens: row.total_tokens,
      avgReward: row.avg_reward ? parseFloat(row.avg_reward) : undefined,
      status: row.status,
      progress: parseFloat(row.progress || '0'),
      currentEpoch: row.current_epoch,
      totalEpochs: row.total_epochs,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
      outputDir: row.output_dir,
      adapterName: row.adapter_name,
      startedAt: row.started_at?.toISOString?.(),
      completedAt: row.completed_at?.toISOString?.(),
      createdAt: row.created_at?.toISOString?.(),
      createdBy: row.created_by,
      errorMessage: row.error_message
    };
  }
}

// 导出单例
export const rlTrainingOrchestrator = new RlTrainingOrchestrator();