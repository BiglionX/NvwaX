/**
 * DPO 训练循环（Direct Preference Optimization）
 *
 * 对齐 Hermes Atropos 的 DPO 实现（参考 DPO 原始论文:
 * https://arxiv.org/abs/2305.18290）
 *
 * DPO 核心思想：
 * 不需要显式训练 reward model，直接用偏好对（chosen / rejected）
 * 做隐式 reward 建模。损失函数：
 *
 * L_DPO = -log σ(β * (log_π(chosen) - log_π_ref(chosen)
 *                     - log_π(rejected) + log_π_ref(rejected)))
 *
 * 其中 β 是温度超参，π 是新策略，π_ref 是参考策略。
 *
 * 本实现职责：
 * 1. 构造偏好对数据（从 leader_reflections / trajectories / critic 评分）
 * 2. 计算偏好对的 margin（分数差）
 * 3. 估计 log-ratio（模拟）
 * 4. 计算 DPO 损失
 * 5. 保存偏好对数据（供外部训练框架消费）
 */

import { Pool } from 'pg';
import { databaseService } from './database.service.js';

// ============================================================
// 类型定义
// ============================================================

export interface DPOConfig {
  /** DPO 温度 β */
  beta?: number;
  /** 参考策略权重（0~1，1 = 完全信任参考策略） */
  refPolicyWeight?: number;
  /** 偏好对来源 */
  sources?: Array<'critic' | 'user_feedback' | 'rollout_pairing'>;
  /** 最大偏好对数 */
  maxPairs?: number;
  /** 最小 margin（分数差，过滤模糊对） */
  minMargin?: number;
  /** 采样温度（估计 log-prob 用） */
  temperature?: number;
}

export interface PreferencePair {
  pairId: string;
  prompt: string;
  chosen: string;
  rejected: string;
  chosenScore: number;
  rejectedScore: number;
  margin: number;
  source: string;
  /** 估计的 log-ratio（模拟） */
  logRatio: number;
  /** 估计的隐式 reward（模拟） */
  implicitReward: number;
}

export interface DPOResult {
  runId: string;
  totalPairs: number;
  avgMargin: number;
  avgLogRatio: number;
  avgImplicitReward: number;
  loss: number;
  lossCurve: number[];
  pairsBySource: Record<string, number>;
}

// ============================================================
// DPO 训练器
// ============================================================

export class DpoTrainer {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * 执行 DPO 训练循环
   *
   * @param runId RL 训练运行 ID
   * @param config DPO 配置
   */
  async train(runId: string, config: DPOConfig = {}): Promise<DPOResult> {
    const beta = config.beta ?? 0.1;
    const maxPairs = config.maxPairs || 100;
    const minMargin = config.minMargin ?? 0.05;
    const sources = config.sources || ['critic', 'user_feedback', 'rollout_pairing'];

    // 1. 构造偏好对
    const pairs = await this.buildPreferencePairs(runId, sources, maxPairs, minMargin);

    // 2. 计算每个 pair 的 log-ratio 和隐式 reward
    let totalLogRatio = 0;
    let totalImplicitReward = 0;
    const lossCurve: number[] = [];
    const pairsBySource: Record<string, number> = {};

    for (const pair of pairs) {
      // 估计 log-ratio（模拟：基于 margin 和 beta）
      pair.logRatio = this.estimateLogRatio(pair.chosen, pair.rejected, beta);

      // 隐式 reward = β * log-ratio
      pair.implicitReward = beta * pair.logRatio;

      totalLogRatio += pair.logRatio;
      totalImplicitReward += pair.implicitReward;
      pairsBySource[pair.source] = (pairsBySource[pair.source] || 0) + 1;

      // 保存到数据库
      await this.savePair(runId, pair);

      // 每个 pair 的 DPO 损失（模拟）
      const pairLoss = -Math.log(this.sigmoid(beta * pair.logRatio) + 1e-8);
      lossCurve.push(pairLoss);
    }

    // 3. 计算总体损失
    const avgLoss = lossCurve.length > 0
      ? lossCurve.reduce((s, l) => s + l, 0) / lossCurve.length
      : 0;

    // 4. 更新运行统计
    await this.pool.query(
      `UPDATE rl_training_runs SET
        total_pairs = $1,
        avg_reward = $2,
        metrics = metrics || $3::jsonb
       WHERE id = $4`,
      [
        pairs.length,
        pairs.length > 0 ? totalImplicitReward / pairs.length : 0,
        JSON.stringify({
          lossCurve,
          avgLogRatio: pairs.length > 0 ? totalLogRatio / pairs.length : 0,
          pairsBySource
        }),
        runId
      ]
    );

    return {
      runId,
      totalPairs: pairs.length,
      avgMargin: pairs.length > 0 ? pairs.reduce((s, p) => s + p.margin, 0) / pairs.length : 0,
      avgLogRatio: pairs.length > 0 ? totalLogRatio / pairs.length : 0,
      avgImplicitReward: pairs.length > 0 ? totalImplicitReward / pairs.length : 0,
      loss: avgLoss,
      lossCurve,
      pairsBySource
    };
  }

  // ============================================================
  // 偏好对构造
  // ============================================================

  /**
   * 构造偏好对
   * 来源：
   * 1. critic：leader_reflections 中 success_score 高的作为 chosen，低的作为 rejected
   * 2. user_feedback：nvwax_memories 中 user_feedback 正负样本
   * 3. rollout_pairing：rl_rollouts 中同一组内高 reward 和低 reward 配对
   */
  private async buildPreferencePairs(
    runId: string,
    sources: DPOConfig['sources']!,
    maxPairs: number,
    minMargin: number
  ): Promise<PreferencePair[]> {
    const pairs: PreferencePair[] = [];
    const seen = new Set<string>();

    // 来源 1：critic（从 leader_reflections 构造）
    if (sources.includes('critic')) {
      const reflections = await this.pool.query(
        `SELECT r.id, r.session_id, r.summary, r.improvement_suggestion, r.success_score,
                r.training_signal, t.content
         FROM leader_reflections r
         LEFT JOIN leader_trajectories t ON t.session_id = r.session_id AND t.role = 'assistant'
         WHERE r.training_signal IS NOT NULL
           AND t.content IS NOT NULL
         ORDER BY r.created_at DESC
         LIMIT 200`
      );

      // 按 session 分组，高分反思 vs 低分反思配对
      const bySession = new Map<string, any[]>();
      for (const row of reflections.rows) {
        if (!bySession.has(row.session_id)) bySession.set(row.session_id, []);
        bySession.get(row.session_id)!.push(row);
      }

      for (const [sessionId, rows] of bySession) {
        if (rows.length < 2) continue;
        // 找最高分和最低分
        const sorted = [...rows].sort((a, b) => parseFloat(b.success_score) - parseFloat(a.success_score));
        const chosen = sorted[0];
        const rejected = sorted[sorted.length - 1];
        const margin = parseFloat(chosen.success_score) - parseFloat(rejected.success_score);

        if (margin >= minMargin) {
          const key = `critic:${sessionId}`;
          if (!seen.has(key)) {
            pairs.push({
              pairId: key,
              prompt: `基于历史反思经验，为相似任务提供更好的解决方案。\n反思：${chosen.summary}`,
              chosen: chosen.content || chosen.improvement_suggestion || '（改进后的方案）',
              rejected: rejected.content || rejected.summary || '（失败方案）',
              chosenScore: parseFloat(chosen.success_score),
              rejectedScore: parseFloat(rejected.success_score),
              margin,
              source: 'critic',
              logRatio: 0,
              implicitReward: 0
            });
            seen.add(key);
          }
        }
      }
    }

    // 来源 2：rollout_pairing（从 rl_rollouts 的组内配对）
    if (sources.includes('rollout_pairing') && pairs.length < maxPairs) {
      const rollouts = await this.pool.query(
        `SELECT group_id, prompt, response, reward
         FROM rl_rollouts
         WHERE run_id = $1
         ORDER BY group_id, reward DESC`,
        [runId]
      );

      const byGroup = new Map<string, any[]>();
      for (const row of rollouts.rows) {
        if (!byGroup.has(row.group_id)) byGroup.set(row.group_id, []);
        byGroup.get(row.group_id)!.push(row);
      }

      for (const [groupId, groupRows] of byGroup) {
        if (groupRows.length < 2) continue;
        const chosen = groupRows[0];
        const rejected = groupRows[groupRows.length - 1];
        const margin = parseFloat(chosen.reward) - parseFloat(rejected.reward);

        if (margin >= minMargin) {
          const key = `rollout:${groupId}`;
          if (!seen.has(key)) {
            pairs.push({
              pairId: key,
              prompt: chosen.prompt,
              chosen: chosen.response,
              rejected: rejected.response,
              chosenScore: parseFloat(chosen.reward),
              rejectedScore: parseFloat(rejected.reward),
              margin,
              source: 'rollout_pairing',
              logRatio: 0,
              implicitReward: 0
            });
            seen.add(key);
          }
        }
      }
    }

    // 截断到 maxPairs
    return pairs.slice(0, maxPairs);
  }

  // ============================================================
  // 损失计算
  // ============================================================

  /**
   * 估计 log-ratio（模拟）
   * 真实：log π(chosen)/π_ref(chosen) - log π(rejected)/π_ref(rejected)
   */
  private estimateLogRatio(chosen: string, rejected: string, beta: number): number {
    // 简化：基于响应长度和质量特征的启发式
    const chosenQuality = this.qualityHeuristic(chosen);
    const rejectedQuality = this.qualityHeuristic(rejected);
    return (chosenQuality - rejectedQuality) * 2.0 / (beta + 1e-8);
  }

  /**
   * 响应质量启发式
   */
  private qualityHeuristic(response: string): number {
    let score = 0.5;
    if (response.length > 100) score += 0.1;
    if (response.length > 500) score += 0.1;
    if (response.includes('步骤') || response.includes('方案')) score += 0.1;
    if (response.includes('数据') || response.includes('指标')) score += 0.1;
    return Math.min(score, 1);
  }

  /**
   * sigmoid 函数
   */
  private sigmoid(x: number): number {
    if (x >= 0) {
      const z = Math.exp(-x);
      return 1 / (1 + z);
    }
    const z = Math.exp(x);
    return z / (1 + z);
  }

  // ============================================================
  // 数据持久化
  // ============================================================

  /**
   * 保存偏好对
   */
  private async savePair(runId: string, pair: PreferencePair): Promise<void> {
    await this.pool.query(
      `INSERT INTO rl_preference_pairs (
        run_id, prompt, chosen, rejected,
        chosen_score, rejected_score, margin, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        runId,
        pair.prompt,
        pair.chosen,
        pair.rejected,
        pair.chosenScore,
        pair.rejectedScore,
        pair.margin,
        pair.source
      ]
    ).catch(err => console.error('[DPO] Failed to save pair:', err.message));
  }

  /**
   * 查询 run 的偏好对
   */
  async getPairs(runId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM rl_preference_pairs WHERE run_id = $1 ORDER BY margin DESC`,
      [runId]
    );
    return result.rows;
  }

  /**
   * 导出为 DPO 训练格式（JSONL）
   */
  async exportForTraining(runId: string): Promise<string> {
    const pairs = await this.getPairs(runId);
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const dir = path.join(os.tmpdir(), 'nvwax-rl', runId);
    await fs.mkdir(dir, { recursive: true });

    // DPO 格式：每行 { prompt, chosen, rejected }
    const lines = pairs.map(p => JSON.stringify({
      prompt: p.prompt,
      chosen: p.chosen,
      rejected: p.rejected,
      chosen_score: p.chosen_score,
      rejected_score: p.rejected_score
    }));

    const jsonlPath = path.join(dir, 'dpo_dataset.jsonl');
    await fs.writeFile(jsonlPath, lines.join('\n'), 'utf-8');

    console.log(`[DPO] Exported ${lines.length} pairs to ${jsonlPath}`);
    return jsonlPath;
  }
}

// 导出单例
export const dpoTrainer = new DpoTrainer();