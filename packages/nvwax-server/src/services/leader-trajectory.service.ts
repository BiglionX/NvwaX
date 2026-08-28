/**
 * Leader Trajectory Service (L1 Memory)
 *
 * Leader Agent 的轨迹日志层，对齐 Hermes Agent 的 L1 JSONL 设计。
 *
 * 核心职责：
 * 1. JSONL 风格追加写入：每条轨迹都是不可变事件
 * 2. 会话隔离：按 sessionId 索引
 * 3. 用途分类：routing / ranking / generation / reflection
 * 4. 回放支持：从 L1 可以重放整个 leader agent 的执行轨迹
 *
 * 写入策略：
 * - 同步路径（关键决策）：立即写入
 * - 异步路径（日志/调试）：批量写入（每 10s flush 一次）
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md §1.1
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §2.2.4
 */

import { Pool } from 'pg';
import { databaseService } from './database.service.js';

export type TrajectoryRole = 'system' | 'user' | 'assistant' | 'tool';
export type TrajectoryPurpose = 'routing' | 'ranking' | 'generation' | 'reflection' | 'orchestration';

export interface TrajectoryEntry {
  id?: number;
  sessionId: string;
  eventSeq?: number;
  leaderSkillId?: string;
  role: TrajectoryRole;
  content: string;
  toolCall?: any;
  toolResult?: any;
  tokensUsed?: number;
  model?: string;
  latencyMs?: number;
  purpose?: TrajectoryPurpose;
  createdAt?: string;
}

export interface AppendOptions {
  /** 关联到 leader_events.seq（如果有） */
  eventSeq?: number;
  leaderSkillId?: string;
  tokensUsed?: number;
  model?: string;
  latencyMs?: number;
  purpose?: TrajectoryPurpose;
}

export class LeaderTrajectoryService {
  private pool: Pool;
  private batchBuffer: TrajectoryEntry[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_INTERVAL_MS = 5000;

  constructor() {
    this.pool = databaseService.getPool();
    this.startBatchFlush();
  }

  // ============================================================
  // 写入方法
  // ============================================================

  /**
   * 同步追加一条轨迹
   * 关键决策应使用此方法
   */
  async append(
    sessionId: string,
    role: TrajectoryRole,
    content: string,
    options: AppendOptions = {}
  ): Promise<TrajectoryEntry> {
    const result = await this.pool.query(
      `INSERT INTO leader_trajectories (
        session_id, event_seq, leader_skill_id, role, content,
        tool_call, tool_result, tokens_used, model, latency_ms, purpose
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        sessionId,
        options.eventSeq || null,
        options.leaderSkillId || null,
        role,
        content,
        options.toolCall ? JSON.stringify(options.toolCall) : null,
        options.toolResult ? JSON.stringify(options.toolResult) : null,
        options.tokensUsed || null,
        options.model || null,
        options.latencyMs || null,
        options.purpose || null
      ]
    );

    return this.rowToEntry(result.rows[0]);
  }

  /**
   * 异步追加（进入批量缓冲）
   * 非关键日志使用此方法以提升性能
   */
  appendAsync(
    sessionId: string,
    role: TrajectoryRole,
    content: string,
    options: AppendOptions = {}
  ): void {
    this.batchBuffer.push({
      sessionId,
      role,
      content,
      eventSeq: options.eventSeq,
      leaderSkillId: options.leaderSkillId,
      toolCall: options.toolCall,
      toolResult: options.toolResult,
      tokensUsed: options.tokensUsed,
      model: options.model,
      latencyMs: options.latencyMs,
      purpose: options.purpose
    });

    if (this.batchBuffer.length >= this.BATCH_SIZE) {
      this.flush().catch(err => console.error('[Trajectory] Batch flush failed:', err));
    }
  }

  /**
   * 强制刷新缓冲区
   */
  async flush(): Promise<number> {
    if (this.batchBuffer.length === 0) return 0;

    const batch = this.batchBuffer.splice(0, this.batchBuffer.length);
    if (batch.length === 0) return 0;

    // 批量插入
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIdx = 1;

    for (const entry of batch) {
      placeholders.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
      values.push(
        entry.sessionId,
        entry.eventSeq || null,
        entry.leaderSkillId || null,
        entry.role,
        entry.content,
        entry.toolCall ? JSON.stringify(entry.toolCall) : null,
        entry.toolResult ? JSON.stringify(entry.toolResult) : null,
        entry.tokensUsed || null,
        entry.model || null,
        entry.latencyMs || null,
        entry.purpose || null
      );
    }

    try {
      await this.pool.query(
        `INSERT INTO leader_trajectories (
          session_id, event_seq, leader_skill_id, role, content,
          tool_call, tool_result, tokens_used, model, latency_ms, purpose
        ) VALUES ${placeholders.join(',')}`,
        values
      );
      console.log(`[Trajectory] Batch flushed ${batch.length} entries`);
      return batch.length;
    } catch (error) {
      console.error('[Trajectory] Batch flush failed:', (error as Error).message);
      // 失败时重新放回缓冲区
      this.batchBuffer.unshift(...batch);
      return 0;
    }
  }

  // ============================================================
  // 查询方法
  // ============================================================

  /**
   * 获取 session 的完整轨迹（按时间顺序）
   */
  async getBySession(sessionId: string, options: { limit?: number; purpose?: TrajectoryPurpose } = {}): Promise<TrajectoryEntry[]> {
    const conditions: string[] = ['session_id = $1'];
    const params: any[] = [sessionId];
    let paramIdx = 2;

    if (options.purpose) {
      conditions.push(`purpose = $${paramIdx++}`);
      params.push(options.purpose);
    }

    const limit = options.limit || 1000;
    params.push(limit);

    const result = await this.pool.query(
      `SELECT * FROM leader_trajectories WHERE ${conditions.join(' AND ')}
       ORDER BY id ASC LIMIT $${paramIdx}`,
      params
    );

    return result.rows.map(row => this.rowToEntry(row));
  }

  /**
   * 统计 session 的轨迹
   */
  async getStats(sessionId: string): Promise<{
    total: number;
    byRole: Record<string, number>;
    byPurpose: Record<string, number>;
    totalTokens: number;
  }> {
    const result = await this.pool.query(
      `SELECT role, purpose, COUNT(*) as count, COALESCE(SUM(tokens_used), 0) as tokens
       FROM leader_trajectories
       WHERE session_id = $1
       GROUP BY role, purpose`,
      [sessionId]
    );

    const byRole: Record<string, number> = {};
    const byPurpose: Record<string, number> = {};
    let total = 0;
    let totalTokens = 0;

    for (const row of result.rows) {
      byRole[row.role] = (byRole[row.role] || 0) + parseInt(row.count);
      if (row.purpose) {
        byPurpose[row.purpose] = (byPurpose[row.purpose] || 0) + parseInt(row.count);
      }
      total += parseInt(row.count);
      totalTokens += parseInt(row.tokens);
    }

    return { total, byRole, byPurpose, totalTokens };
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /**
   * 启动批量刷新定时器
   */
  private startBatchFlush(): void {
    if (this.batchTimer) return;
    this.batchTimer = setInterval(() => {
      this.flush().catch(err => console.error('[Trajectory] Periodic flush failed:', err));
    }, this.BATCH_INTERVAL_MS);
    // unref 避免阻止进程退出
    if (typeof this.batchTimer.unref === 'function') {
      this.batchTimer.unref();
    }
  }

  /**
   * 停止定时器（在服务关闭时调用）
   */
  async shutdown(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    await this.flush();
  }

  /**
   * 数据库行映射
   */
  private rowToEntry(row: any): TrajectoryEntry {
    return {
      id: row.id,
      sessionId: row.session_id,
      eventSeq: row.event_seq,
      leaderSkillId: row.leader_skill_id,
      role: row.role,
      content: row.content,
      toolCall: row.tool_call ? (typeof row.tool_call === 'string' ? JSON.parse(row.tool_call) : row.tool_call) : undefined,
      toolResult: row.tool_result ? (typeof row.tool_result === 'string' ? JSON.parse(row.tool_result) : row.tool_result) : undefined,
      tokensUsed: row.tokens_used,
      model: row.model,
      latencyMs: row.latency_ms,
      purpose: row.purpose,
      createdAt: row.created_at?.toISOString?.() || row.created_at
    };
  }
}

// 导出单例
export const leaderTrajectoryService = new LeaderTrajectoryService();