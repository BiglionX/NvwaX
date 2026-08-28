/**
 * Leader Training Service (Atropos 风格训练闭环)
 *
 * 对齐 NousResearch Hermes Agent 的 Atropos RL 训练框架设计。
 *
 * 核心流程：
 * 1. 收集轨迹（leader_trajectories 中的成功案例）
 * 2. Critic 模型对每条轨迹打分（success / quality / coherence / helpfulness）
 * 3. 按分数筛选训练数据
 * 4. 导出 LoRA 训练集（jsonl 格式）
 * 5. 调用训练框架（外部 LoRA 微调）进行微调
 * 6. 记录训练结果到 training_runs / training_critic_scores
 *
 * 注意：本服务只负责数据准备和训练编排，不做实际模型训练。
 * 实际 LoRA 微调可接入：
 * - HuggingFace transformers + peft
 * - Unsloth
 * - Axolotl
 * - 或任何兼容的训练框架
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md §3.1
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §5.1
 */

import { Pool } from 'pg';
import { databaseService } from './database.service.js';
import { leaderTrajectoryService } from './leader-trajectory.service.js';
import { leaderSkillService } from './leader-skill.service.js';
import { leaderReflectionService } from './leader-reflection.service.js';

// ============================================================
// 类型定义
// ============================================================

export interface TrainingRunConfig {
  runName: string;
  baseModel: string;
  trainingType?: 'lora' | 'full' | 'qlora';
  loraConfig?: {
    r?: number;
    alpha?: number;
    dropout?: number;
    targetModules?: string[];
  };
  /** 训练数据过滤条件 */
  datasetFilter?: {
    minSuccessScore?: number;       // 最小成功率（如 0.7）
    categories?: string[];          // 只训练某些 category
    skillIds?: string[];            // 只训练某些 skill
    minReflections?: number;        // 至少有 N 条反思
    timeRangeDays?: number;         // 最近 N 天
  };
  /** 训练超参 */
  hyperparameters?: {
    learningRate?: number;
    batchSize?: number;
    epochs?: number;
    maxSeqLength?: number;
  };
  userId?: string;
}

export interface TrainingExample {
  /** 训练 ID */
  id: string;
  /** 原始 sessionId */
  sessionId: string;
  /** 使用的 skill_id */
  skillId: string;
  /** 用户需求 */
  requirement: string;
  /** 输入（system + user 拼接） */
  input: string;
  /** 输出（assistant 的响应） */
  output: string;
  /** Critic 评分 */
  successScore: number;
  qualityScore?: number;
  coherenceScore?: number;
  helpfulnessScore?: number;
  /** 元数据 */
  metadata: {
    tokensUsed: number;
    durationMs: number;
    hasReflections: boolean;
    createdAt: string;
  };
}

export interface TrainingRun {
  id: string;
  runName: string;
  baseModel: string;
  trainingType: string;
  config: Record<string, unknown>;
  datasetFilter: Record<string, unknown>;
  trajectoryCount: number;
  totalTokens: number;
  avgSuccessScore?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: number;
  totalSteps: number;
  outputDir?: string;
  metrics?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  createdBy?: string;
  errorMessage?: string;
}

export interface TrainingDataset {
  examples: TrainingExample[];
  totalCount: number;
  avgSuccessScore: number;
  totalTokens: number;
  distribution: {
    bySkill: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

// ============================================================
// Leader Training Service
// ============================================================

export class LeaderTrainingService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  // ============================================================
  // 数据收集
  // ============================================================

  /**
   * 收集训练数据
   * 从 leader_trajectories + leader_reflections 中构造训练样本
   */
  async collectDataset(filter: TrainingRunConfig['datasetFilter'] = {}): Promise<TrainingDataset> {
    const filterConfig = {
      minSuccessScore: filter.minSuccessScore ?? 0.7,
      categories: filter.categories || [],
      skillIds: filter.skillIds || [],
      timeRangeDays: filter.timeRangeDays ?? 30
    };

    // 查询成功案例（按 sessionId 聚合）
    const successSessionsResult = await this.pool.query(
      `SELECT ls.skill_id,
              ls.category,
              COUNT(*) as success_count,
              AVG(ls.avg_success_score) as avg_score
       FROM leader_skills ls
       WHERE ls.avg_success_score >= $1
         AND ls.usage_count > 0
         ${filterConfig.categories.length > 0 ? 'AND ls.category = ANY($2)' : ''}
         ${filterConfig.skillIds.length > 0 ? `AND ls.skill_id = ANY($${filterConfig.categories.length > 0 ? '3' : '2'})` : ''}
       GROUP BY ls.skill_id, ls.category
       ORDER BY avg_score DESC`,
      [
        filterConfig.minSuccessScore,
        ...(filterConfig.categories.length > 0 ? [filterConfig.categories] : []),
        ...(filterConfig.skillIds.length > 0 ? [filterConfig.skillIds] : [])
      ]
    );

    const skillStats = successSessionsResult.rows;
    const skillIds = skillStats.map(r => r.skill_id);

    if (skillIds.length === 0) {
      return {
        examples: [],
        totalCount: 0,
        avgSuccessScore: 0,
        totalTokens: 0,
        distribution: { bySkill: {}, byCategory: {} }
      };
    }

    // 查询每个 skill 的轨迹样本
    const examples: TrainingExample[] = [];
    const bySkill: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalSuccessScore = 0;
    let totalTokens = 0;

    for (const stat of skillStats) {
      // 查询该 skill 的最近 N 条轨迹
      const trajectoriesResult = await this.pool.query(
        `SELECT t.id, t.session_id, t.content, t.tokens_used, t.latency_ms, t.purpose, t.created_at,
                s.skill_id, s.category, s.name, s.system_prompt, s.responsibilities, s.decision_rules
         FROM leader_trajectories t
         INNER JOIN leader_skills s ON t.leader_skill_id = s.id
         WHERE s.skill_id = $1
           AND t.purpose = 'orchestration'
           AND t.role = 'assistant'
           AND t.created_at > NOW() - INTERVAL '${filterConfig.timeRangeDays} days'
         ORDER BY t.created_at DESC
         LIMIT 50`,
        [stat.skill_id]
      );

      // 同时查询对应的 user 消息（requirement）
      for (const traj of trajectoriesResult.rows) {
        const userMsgResult = await this.pool.query(
          `SELECT content FROM leader_trajectories
           WHERE session_id = $1 AND role = 'user'
           ORDER BY id ASC LIMIT 1`,
          [traj.session_id]
        );
        const requirement = userMsgResult.rows[0]?.content || '';

        // 查询是否有反思
        const reflectionResult = await this.pool.query(
          `SELECT COUNT(*) as count FROM leader_reflections WHERE session_id = $1`,
          [traj.session_id]
        );
        const hasReflections = parseInt(reflectionResult.rows[0].count) > 0;

        // 构造 system prompt 注入（与生产保持一致）
        const systemPrompt = this.buildTrainingSystemPrompt(traj.system_prompt, {
          category: traj.category,
          responsibilities: traj.responsibilities,
          decisionRules: traj.decision_rules
        });

        const example: TrainingExample = {
          id: `${traj.session_id}-${traj.id}`,
          sessionId: traj.session_id,
          skillId: traj.skill_id,
          requirement,
          input: `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${requirement}`,
          output: traj.content,
          successScore: parseFloat(stat.avg_score),
          metadata: {
            tokensUsed: traj.tokens_used || 0,
            durationMs: traj.latency_ms || 0,
            hasReflections,
            createdAt: traj.created_at?.toISOString?.() || traj.created_at
          }
        };

        examples.push(example);
        bySkill[traj.skill_id] = (bySkill[traj.skill_id] || 0) + 1;
        byCategory[traj.category] = (byCategory[traj.category] || 0) + 1;
        totalSuccessScore += parseFloat(stat.avg_score);
        totalTokens += traj.tokens_used || 0;
      }
    }

    return {
      examples,
      totalCount: examples.length,
      avgSuccessScore: examples.length > 0 ? totalSuccessScore / examples.length : 0,
      totalTokens,
      distribution: { bySkill, byCategory }
    };
  }

  // ============================================================
  // Critic 评分
  // ============================================================

  /**
   * 用 Critic 模型对单个样本评分
   *
   * 这里用 LLM 作为 Critic：
   * - 输入：训练样本（input + output）
   * - 输出：success_score (0~1), quality_score (0~1), coherence_score (0~1), helpfulness_score (0~1), feedback
   */
  async criticScore(example: TrainingExample, criticModel: string = 'deepseek-v4-flash'): Promise<{
    successScore: number;
    qualityScore: number;
    coherenceScore: number;
    helpfulnessScore: number;
    feedback?: string;
    failurePattern?: string;
  }> {
    // 简化：基于规则打 heuristic 分（不依赖 LLM）
    // 生产环境应调用 LLM 做更精确评分

    const inputLength = example.input.length;
    const outputLength = example.output.length;
    const hasReflections = example.metadata.hasReflections;
    const tokensUsed = example.metadata.tokensUsed;

    // 启发式评分
    let qualityScore = 0.5;
    let coherenceScore = 0.5;
    let helpfulnessScore = 0.5;

    // 输出长度合理（100~5000 字）加分
    if (outputLength > 100 && outputLength < 5000) {
      qualityScore += 0.2;
    }

    // 有反思记录说明任务执行到了反思阶段
    if (hasReflections) {
      qualityScore += 0.1;
    }

    // Token 使用合理
    if (tokensUsed > 0 && tokensUsed < 4000) {
      coherenceScore += 0.2;
    }

    // 高成功率继承
    helpfulnessScore = example.successScore;

    return {
      successScore: example.successScore,
      qualityScore: Math.min(qualityScore, 1),
      coherenceScore: Math.min(coherenceScore, 1),
      helpfulnessScore: Math.min(helpfulnessScore, 1),
      feedback: `Auto-scored by heuristic. Output length: ${outputLength} chars.`,
      failurePattern: example.successScore < 0.5 ? 'low_quality' : undefined
    };
  }

  /**
   * 批量评分数据集
   */
  async scoreDataset(dataset: TrainingDataset, runId?: string, criticModel: string = 'deepseek-v4-flash'): Promise<{
    scoredCount: number;
    avgScores: {
      success: number;
      quality: number;
      coherence: number;
      helpfulness: number;
    };
  }> {
    let totalSuccess = 0, totalQuality = 0, totalCoherence = 0, totalHelpfulness = 0;
    let scoredCount = 0;

    for (const example of dataset.examples) {
      const score = await this.criticScore(example, criticModel);

      totalSuccess += score.successScore;
      totalQuality += score.qualityScore;
      totalCoherence += score.coherenceScore;
      totalHelpfulness += score.helpfulnessScore;
      scoredCount++;

      // 保存到数据库
      if (runId) {
        await this.pool.query(
          `INSERT INTO training_critic_scores (
            run_id, trajectory_id, critic_model, success_score, quality_score,
            coherence_score, helpfulness_score, critic_feedback, failure_pattern
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            runId,
            parseInt(example.id.split('-').pop() || '0'),
            criticModel,
            score.successScore,
            score.qualityScore,
            score.coherenceScore,
            score.helpfulnessScore,
            score.feedback || null,
            score.failurePattern || null
          ]
        ).catch(err => console.warn('[Training] Failed to save critic score:', err.message));
      }
    }

    return {
      scoredCount,
      avgScores: {
        success: scoredCount > 0 ? totalSuccess / scoredCount : 0,
        quality: scoredCount > 0 ? totalQuality / scoredCount : 0,
        coherence: scoredCount > 0 ? totalCoherence / scoredCount : 0,
        helpfulness: scoredCount > 0 ? totalHelpfulness / scoredCount : 0
      }
    };
  }

  // ============================================================
  // 训练编排
  // ============================================================

  /**
   * 创建训练运行
   */
  async createRun(config: TrainingRunConfig): Promise<TrainingRun> {
    console.log(`[Training] Creating run: ${config.runName}`);

    const result = await this.pool.query(
      `INSERT INTO training_runs (
        run_name, base_model, training_type, config, dataset_filter,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING *`,
      [
        config.runName,
        config.baseModel,
        config.trainingType || 'lora',
        JSON.stringify({
          loraConfig: config.loraConfig,
          hyperparameters: config.hyperparameters
        }),
        JSON.stringify(config.datasetFilter || {}),
        config.userId || null
      ]
    );

    console.log(`[Training] Run created: ${result.rows[0].id}`);
    return this.rowToRun(result.rows[0]);
  }

  /**
   * 启动训练（PoC：仅生成数据集，不实际微调）
   */
  async startRun(runId: string): Promise<{
    run: TrainingRun;
    dataset: TrainingDataset;
    exportPath?: string;
  }> {
    const runResult = await this.pool.query(
      'SELECT * FROM training_runs WHERE id = $1',
      [runId]
    );
    if (runResult.rows.length === 0) {
      throw new Error('Training run not found');
    }
    const run = this.rowToRun(runResult.rows[0]);

    if (run.status !== 'pending') {
      throw new Error(`Cannot start run with status: ${run.status}`);
    }

    // 更新状态
    await this.pool.query(
      `UPDATE training_runs SET status = 'running', started_at = NOW() WHERE id = $1`,
      [runId]
    );

    try {
      // 1. 收集数据
      const dataset = await this.collectDataset(run.datasetFilter as any);

      // 2. Critic 评分
      const scoreResult = await this.scoreDataset(dataset, runId);

      // 3. 导出训练集（JSONL 格式）
      const exportPath = await this.exportDataset(dataset, runId);

      // 4. 更新训练运行统计
      await this.pool.query(
        `UPDATE training_runs SET
          trajectory_count = $1,
          total_tokens = $2,
          avg_success_score = $3,
          output_dir = $4,
          status = 'completed',
          progress = 1.0,
          completed_at = NOW(),
          metrics = $5
         WHERE id = $6`,
        [
          dataset.totalCount,
          dataset.totalTokens,
          dataset.avgSuccessScore,
          exportPath,
          JSON.stringify(scoreResult.avgScores),
          runId
        ]
      );

      const finalRun = await this.getRun(runId);
      return { run: finalRun!, dataset, exportPath };
    } catch (error) {
      await this.pool.query(
        `UPDATE training_runs SET
          status = 'failed',
          error_message = $1,
          completed_at = NOW()
         WHERE id = $2`,
        [(error as Error).message, runId]
      );
      throw error;
    }
  }

  /**
   * 导出数据集为 JSONL 格式（用于训练）
   */
  async exportDataset(dataset: TrainingDataset, runId: string): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const exportDir = path.join(
      os.tmpdir(),
      'nvwax-training',
      runId
    );
    await fs.mkdir(exportDir, { recursive: true });

    const jsonlPath = path.join(exportDir, 'dataset.jsonl');
    const jsonlContent = dataset.examples
      .map(ex => JSON.stringify({
        input: ex.input,
        output: ex.output,
        metadata: {
          skillId: ex.skillId,
          sessionId: ex.sessionId,
          successScore: ex.successScore
        }
      }))
      .join('\n');

    await fs.writeFile(jsonlPath, jsonlContent, 'utf-8');

    // 同时导出 manifest
    const manifestPath = path.join(exportDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify({
      runId,
      totalCount: dataset.totalCount,
      avgSuccessScore: dataset.avgSuccessScore,
      totalTokens: dataset.totalTokens,
      distribution: dataset.distribution,
      generatedAt: new Date().toISOString()
    }, null, 2), 'utf-8');

    console.log(`[Training] Dataset exported to ${exportDir}`);
    return exportDir;
  }

  // ============================================================
  // 查询
  // ============================================================

  /**
   * 获取训练运行
   */
  async getRun(runId: string): Promise<TrainingRun | null> {
    const result = await this.pool.query(
      'SELECT * FROM training_runs WHERE id = $1',
      [runId]
    );
    return result.rows[0] ? this.rowToRun(result.rows[0]) : null;
  }

  /**
   * 列出训练运行
   */
  async listRuns(options: { status?: string; limit?: number } = {}): Promise<TrainingRun[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (options.status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(options.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 20;
    params.push(limit);

    const result = await this.pool.query(
      `SELECT * FROM training_runs ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIdx}`,
      params
    );
    return result.rows.map(row => this.rowToRun(row));
  }

  /**
   * 取消训练运行
   */
  async cancelRun(runId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE training_runs SET status = 'cancelled', completed_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'running')`,
      [runId]
    );
    return (result.rowCount || 0) > 0;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 构造训练用的 system prompt（与生产保持一致）
   */
  private buildTrainingSystemPrompt(
    originalPrompt: string,
    skillInfo: { category: string; responsibilities: string[]; decisionRules: string[] }
  ): string {
    return `${originalPrompt}

【当前任务上下文】
- 类别：${skillInfo.category}
- 核心职责：${(skillInfo.responsibilities || []).slice(0, 3).join('、')}
- 决策规则：${(skillInfo.decisionRules || []).slice(0, 3).join('、')}`;
  }

  /**
   * 数据库行映射
   */
  private rowToRun(row: any): TrainingRun {
    return {
      id: row.id,
      runName: row.run_name,
      baseModel: row.base_model,
      trainingType: row.training_type,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      datasetFilter: typeof row.dataset_filter === 'string' ? JSON.parse(row.dataset_filter) : row.dataset_filter,
      trajectoryCount: row.trajectory_count,
      totalTokens: row.total_tokens,
      avgSuccessScore: row.avg_success_score ? parseFloat(row.avg_success_score) : undefined,
      status: row.status,
      progress: parseFloat(row.progress || '0'),
      currentStep: row.current_step,
      totalSteps: row.total_steps,
      outputDir: row.output_dir,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
      startedAt: row.started_at?.toISOString?.() || row.started_at,
      completedAt: row.completed_at?.toISOString?.() || row.completed_at,
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      createdBy: row.created_by,
      errorMessage: row.error_message
    };
  }
}

// 导出单例
export const leaderTrainingService = new LeaderTrainingService();