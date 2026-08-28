/**
 * GRPO 训练循环（Group Relative Policy Optimization）
 *
 * 对齐 DeepSeek-R1 / Hermes Atropos 的 GRPO 实现。
 *
 * GRPO 核心思想：
 * 对同一 prompt 采样 G 个响应（group），
 * 用 Critic 打分，计算组内相对优势 A_i = (r_i - mean(G)) / std(G)，
 * 然后用策略梯度（含 KL 惩罚）更新模型。
 *
 * 与 PPO 的区别：
 * - PPO 需要独立的 value network 估计优势
 * - GRPO 用组内 reward 的相对优势代替 value network（省一半内存）
 *
 * 本实现职责：
 * 1. 构造训练 prompt 集（从 leader_trajectories / leader_reflections）
 * 2. 采样：对每个 prompt 采样 G 个响应（模拟：用 heuristic 生成变体）
 * 3. 评分：Critic 对每个响应打分
 * 4. 计算组内 advantage + KL 惩罚
 * 5. 保存 rollout 数据（供外部训练框架消费）
 *
 * 注意：真正的策略更新需要模型权重，本服务负责数据侧
 * （rollout + advantage + KL），实际梯度更新由外部框架执行。
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md §3.1
 * - DeepSeekMath: Pushing the Limits of Mathematical Reasoning
 *   (GRPO 原始论文: https://arxiv.org/abs/2402.03300)
 */

import { Pool } from 'pg';
import { databaseService } from './database.service.js';

// ============================================================
// 类型定义
// ============================================================

export interface GRPOConfig {
  /** 组大小（每个 prompt 采样多少响应） */
  groupSize?: number;
  /** KL 惩罚系数 beta */
  klBeta?: number;
  /** 采样温度 */
  temperature?: number;
  /** 每个 epoch 的 batch 大小 */
  batchSize?: number;
  /** 训练的 prompt 数量上限 */
  maxPrompts?: number;
  /** 最小绝对 reward（过滤太差的样本） */
  minReward?: number;
  /** 是否做 reward 归一化 */
  normalizeRewards?: boolean;
}

export interface GRPORollout {
  promptId: string;
  prompt: string;
  groupId: string;
  epoch: number;
  responses: Array<{
    response: string;
    reward: number;
    criticScores: Record<string, number>;
    advantage: number;
    klDivergence: number;
    klPenalty: number;
    normalizedReward: number;
  }>;
  groupMean: number;
  groupStd: number;
}

export interface GRPOResult {
  runId: string;
  epochs: number;
  totalPrompts: number;
  totalRollouts: number;
  avgReward: number;
  avgAdvantage: number;
  avgKlDivergence: number;
  rewardCurve: number[];
  lossCurve: number[];
}

// ============================================================
// GRPO 训练循环
// ============================================================

export class GrpoTrainer {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * 执行 GRPO 训练循环
   *
   * @param runId RL 训练运行 ID
   * @param prompts 训练 prompt 集
   * @param config GRPO 配置
   * @param criticFn Critic 打分函数（注入）
   */
  async train(
    runId: string,
    prompts: Array<{ promptId: string; prompt: string }>,
    config: GRPOConfig = {},
    criticFn?: (response: string, prompt: string) => Promise<Record<string, number>>
  ): Promise<GRPOResult> {
    const groupSize = config.groupSize || 4;
    const klBeta = config.klBeta || 0.1;
    const temperature = config.temperature || 1.0;
    const maxPrompts = config.maxPrompts || 100;
    const minReward = config.minReward ?? 0;
    const normalizeRewards = config.normalizeRewards ?? true;

    const selectedPrompts = prompts.slice(0, maxPrompts);
    const rewardCurve: number[] = [];
    const lossCurve: number[] = [];
    let totalRollouts = 0;
    let totalReward = 0;
    let totalAdvantage = 0;
    let totalKl = 0;
    let epoch = 0;

    for (const promptItem of selectedPrompts) {
      // 1. 对每个 prompt 采样 groupSize 个响应
      const groupId = `${runId}-g${epoch}-p${promptItem.promptId}`;
      const responses: GRPORollout['responses'] = [];
      const groupRewards: number[] = [];

      for (let i = 0; i < groupSize; i++) {
        // 采样响应（模拟：heuristic 生成变体）
        const { response, criticScores } = await this.sampleResponse(
          promptItem.prompt,
          i,
          criticFn
        );

        const reward = this.computeReward(criticScores);
        responses.push({
          response,
          reward,
          criticScores,
          advantage: 0,     // 稍后计算
          klDivergence: 0,  // 稍后计算
          klPenalty: 0,     // 稍后计算
          normalizedReward: reward
        });
        groupRewards.push(reward);
        totalRollouts++;
        totalReward += reward;
      }

      // 2. 计算组内均值和标准差
      const groupMean = groupRewards.reduce((s, r) => s + r, 0) / groupRewards.length;
      const variance = groupRewards.reduce((s, r) => s + (r - groupMean) ** 2, 0) / groupRewards.length;
      const groupStd = Math.sqrt(variance) || 1e-6;

      // 3. 计算每个响应的 advantage + KL 惩罚
      for (const resp of responses) {
        // 组内相对优势
        resp.advantage = normalizeRewards
          ? (resp.reward - groupMean) / groupStd
          : resp.reward - groupMean;

        // KL 惩罚（模拟：与参考策略的散度估计）
        resp.klDivergence = this.estimateKL(resp.response, temperature);
        resp.klPenalty = klBeta * resp.klDivergence;

        // 最终训练信号 = advantage - KL penalty
        resp.normalizedReward = resp.advantage - resp.klPenalty;

        totalAdvantage += resp.advantage;
        totalKl += resp.klDivergence;
      }

      // 4. 保存 rollout 到数据库
      await this.saveRollout(runId, groupId, epoch, promptItem, responses, groupMean, groupStd);

      // 5. 记录 reward 曲线（组均值）
      rewardCurve.push(groupMean);

      // 6. 估算 loss（模拟策略梯度损失）
      const epochLoss = this.estimatePolicyGradientLoss(responses);
      lossCurve.push(epochLoss);

      epoch++;
    }

    // 更新运行统计
    await this.pool.query(
      `UPDATE rl_training_runs SET
        total_rollouts = $1,
        total_groups = $2,
        avg_reward = $3,
        current_epoch = $4,
        total_epochs = $5,
        metrics = metrics || $6::jsonb
       WHERE id = $7`,
      [
        totalRollouts,
        epoch,
        totalRollouts > 0 ? totalReward / totalRollouts : 0,
        epoch,
        config.epochs || 1,
        JSON.stringify({ rewardCurve, lossCurve, avgAdvantage: totalRollouts > 0 ? totalAdvantage / totalRollouts : 0 }),
        runId
      ]
    );

    return {
      runId,
      epochs: epoch,
      totalPrompts: selectedPrompts.length,
      totalRollouts,
      avgReward: totalRollouts > 0 ? totalReward / totalRollouts : 0,
      avgAdvantage: totalRollouts > 0 ? totalAdvantage / totalRollouts : 0,
      avgKlDivergence: totalRollouts > 0 ? totalKl / totalRollouts : 0,
      rewardCurve,
      lossCurve
    };
  }

  // ============================================================
  // 采样与评分
  // ============================================================

  /**
   * 采样一个响应并打分
   * 注入 criticFn 时使用真实评分，否则用 heuristic
   */
  private async sampleResponse(
    prompt: string,
    variantIndex: number,
    criticFn?: (response: string, prompt: string) => Promise<Record<string, number>>
  ): Promise<{ response: string; criticScores: Record<string, number> }> {
    // 模拟采样：基于 prompt 生成变体（真实场景由 LLM 采样）
    const response = this.generateVariantResponse(prompt, variantIndex);

    // 评分
    let criticScores: Record<string, number>;
    if (criticFn) {
      try {
        criticScores = await criticFn(response, prompt);
      } catch {
        criticScores = this.heuristicScore(response, variantIndex);
      }
    } else {
      criticScores = this.heuristicScore(response, variantIndex);
    }

    return { response, criticScores };
  }

  /**
   * 生成变体响应（模拟 LLM 采样）
   * 真实场景：调用 LLM 的 top-k 采样
   */
  private generateVariantResponse(prompt: string, variantIndex: number): string {
    // 简化：为不同 variant 生成带不同温度"标记"的响应
    const suffix = variantIndex === 0
      ? '【方案A·保守】基于已有数据和经验，提供稳定可执行的方案。'
      : variantIndex === 1
        ? '【方案B·均衡】在风险与收益间平衡，提供折中方案。'
        : variantIndex === 2
          ? '【方案C·激进】大胆创新，提供高收益高风险的方案。'
          : '【方案D·探索】提出全新思路，探索未验证但潜力巨大的方向。';

    return `${prompt}\n\n${suffix}`;
  }

  /**
   * 计算综合 reward（加权）
   */
  private computeReward(criticScores: Record<string, number>): number {
    const success = criticScores.success ?? 0;
    const quality = criticScores.quality ?? 0;
    const coherence = criticScores.coherence ?? 0;
    const helpfulness = criticScores.helpfulness ?? 0;

    // 加权平均（与 Atropos 一致）
    return 0.4 * success + 0.25 * quality + 0.15 * coherence + 0.2 * helpfulness;
  }

  /**
   * Heuristic 评分（无真实 Critic 时的降级）
   */
  private heuristicScore(response: string, variantIndex: number): Record<string, number> {
    // 变体 index 越高，奖励越高（模拟不同采样质量）
    const base = 0.5 + variantIndex * 0.1;
    return {
      success: Math.min(base + 0.1, 1),
      quality: Math.min(base, 1),
      coherence: Math.min(base + 0.05, 1),
      helpfulness: Math.min(base + 0.15, 1)
    };
  }

  /**
   * 估算 KL 散度（模拟）
   * 真实场景：计算新策略与参考策略在响应上的 log-prob 差异
   */
  private estimateKL(response: string, temperature: number): number {
    // 简化：基于响应长度和温度的启发式
    const lengthFactor = Math.min(response.length / 500, 1);
    return 0.01 + lengthFactor * 0.05 * temperature;
  }

  /**
   * 估算策略梯度损失（模拟）
   * 真实：L = -E[advantage * log_prob - beta * KL]
   */
  private estimatePolicyGradientLoss(responses: Array<{ advantage: number; klPenalty: number }>): number {
    const losses = responses.map(r => -(r.advantage - r.klPenalty));
    return losses.reduce((s, l) => s + l, 0) / Math.max(losses.length, 1);
  }

  // ============================================================
  // 数据持久化
  // ============================================================

  /**
   * 保存 rollout 到 rl_rollouts 表
   */
  private async saveRollout(
    runId: string,
    groupId: string,
    epoch: number,
    promptItem: { promptId: string; prompt: string },
    responses: GRPORollout['responses'],
    groupMean: number,
    groupStd: number
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const resp of responses) {
        await client.query(
          `INSERT INTO rl_rollouts (
            run_id, group_id, epoch, prompt, response, reward,
            group_rewards, group_mean, group_std, advantage,
            critic_scores, kl_divergence, kl_penalty, temperature
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            runId,
            groupId,
            epoch,
            promptItem.prompt,
            resp.response,
            resp.reward,
            JSON.stringify(responses.map(r => r.reward)),
            groupMean,
            groupStd,
            resp.advantage,
            JSON.stringify(resp.criticScores),
            resp.klDivergence,
            resp.klPenalty,
            1.0
          ]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[GRPO] Failed to save rollout:', (error as Error).message);
    } finally {
      client.release();
    }
  }

  /**
   * 查询 run 的 rollouts（用于导出训练数据）
   */
  async getRollouts(runId: string): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM rl_rollouts WHERE run_id = $1 ORDER BY epoch, group_id`,
      [runId]
    );
    return result.rows;
  }

  /**
   * 导出为 GRPO 训练格式（JSONL，供外部框架消费）
   */
  async exportForTraining(runId: string): Promise<string> {
    const rollouts = await this.getRollouts(runId);
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const dir = path.join(os.tmpdir(), 'nvwax-rl', runId);
    await fs.mkdir(dir, { recursive: true });

    // 按 group 聚合
    const groups = new Map<string, any[]>();
    for (const r of rollouts) {
      if (!groups.has(r.group_id)) groups.set(r.group_id, []);
      groups.get(r.group_id)!.push(r);
    }

    // 导出 GRPO 格式：每个 group 一行
    const lines: string[] = [];
    for (const [groupId, groupRollouts] of groups) {
      lines.push(JSON.stringify({
        group_id: groupId,
        prompt: groupRollouts[0].prompt,
        responses: groupRollouts.map(r => ({
          response: r.response,
          reward: r.reward,
          advantage: r.advantage,
          kl_divergence: r.kl_divergence,
          critic_scores: typeof r.critic_scores === 'string' ? JSON.parse(r.critic_scores) : r.critic_scores
        })),
        group_mean: groupRollouts[0].group_mean,
        group_std: groupRollouts[0].group_std
      }));
    }

    const jsonlPath = path.join(dir, 'grpo_dataset.jsonl');
    await fs.writeFile(jsonlPath, lines.join('\n'), 'utf-8');

    console.log(`[GRPO] Exported ${lines.length} groups to ${jsonlPath}`);
    return jsonlPath;
  }
}

// 导出单例
export const grpoTrainer = new GrpoTrainer();