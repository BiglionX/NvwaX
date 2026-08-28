/**
 * Leader Event Store Service (WAL + Event Sourcing)
 *
 * Leader Agent 的事件溯源层，对齐 Hermes Agent 的 WAL + Event Sourcing 设计。
 *
 * 核心职责：
 * 1. 事件追加（append）：每个事件都是不可变记录，含 hash chain 链接
 * 2. 顺序保证：通过 seq 全局递增确保事件严格按序写入
 * 3. 崩溃恢复：从 WAL 重放未应用的事件
 * 4. 因果追溯：通过 parent_event_id / causation_id 追踪事件链路
 * 5. Saga 补偿：失败事件可关联补偿动作
 *
 * 写入语义：
 * - 单条事件：原子写入（一个事务）
 * - 批量事件：顺序写入（保证 hash chain 完整性）
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md §1.3, §3.2
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §4.2
 */

import { Pool, PoolClient } from 'pg';
import * as crypto from 'crypto';
import { databaseService } from './database.service.js';

// ============================================================
// 类型定义
// ============================================================

export type LeaderEventType =
  // 路由阶段
  | 'skill.routing.start'
  | 'skill.routing.completed'
  | 'skill.matched'
  | 'skill.activated'
  // 编排阶段
  | 'orchestration.start'
  | 'orchestration.completed'
  | 'orchestration.failed'
  // Worker 阶段
  | 'worker.dispatch'
  | 'worker.succeeded'
  | 'worker.failed'
  // Saga 补偿
  | 'saga.compensate.start'
  | 'saga.compensate.worker'
  | 'saga.compensate.completed'
  | 'saga.compensate.failed'
  // 反思
  | 'reflection.created'
  | 'reflection.applied'
  // 轨迹
  | 'trajectory.appended';

export type CompensationStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

export interface LeaderEvent {
  seq: number;
  eventId: string;
  sessionId: string;
  userId?: string;
  eventType: LeaderEventType;
  parentEventId?: string;
  causationId?: string;
  payload: Record;
  metadata?: Record;
  compensationAction?: Record;
  compensationStatus?: CompensationStatus;
  hashChain: string;
  occurredAt: string;
  appliedAt?: string;
}

export interface AppendEventInput {
  sessionId: string;
  eventType: LeaderEventType;
  payload: Record;
  metadata?: Record;
  parentEventId?: string;
  causationId?: string;
  compensationAction?: Record;
  /** 是否立即应用（默认 true，false 表示等待后续应用） */
  applyImmediately?: boolean;
  /** 传入已开启的 PoolClient（事务场景） */
  client?: PoolClient;
  userId?: string;
}

export interface EventReplayResult {
  events: LeaderEvent[];
  appliedCount: number;
  skippedCount: number;
  errors: Array<{ seq: number; error: string }>;
}

// ============================================================
// Leader Event Store
// ============================================================

export class LeaderEventStore {
  private pool: Pool;
  /** WAL 文件最大行数（用于分片检查） */
  private readonly MAX_WAL_POSITION = 1_000_000;
  /** GENESIS 哈希链（首个事件的前驱） */
  private readonly GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor() {
    this.pool = databaseService.getPool();
  }

  // ============================================================
  // 事件追加
  // ============================================================

  /**
   * 追加一条事件
   *
   * 算法：
   * 1. 取上一个事件的 hash_chain（保证顺序）
   * 2. 计算当前事件的 hash_chain = sha256(prev_hash + event_data)
   * 3. 原子 INSERT（一个事务）
   * 4. 触发订阅者通知（如果有）
   */
  async append(input: AppendEventInput): Promise<LeaderEvent> {
    const useExternalClient = !!input.client;
    const client = input.client || null;

    try {
      if (client) {
        return await this.appendWithClient(client, input);
      } else {
        // 自动开启事务
        const newClient = await this.pool.connect();
        try {
          await newClient.query('BEGIN');
          const event = await this.appendWithClient(newClient, input);
          await newClient.query('COMMIT');
          return event;
        } catch (error) {
          await newClient.query('ROLLBACK').catch(() => {});
          throw error;
        } finally {
          newClient.release();
        }
      }
    } catch (error) {
      console.error('[LeaderEventStore] Append failed:', (error as Error).message);
      throw error;
    }
  }

  /**
   * 批量追加事件（保证 hash chain 完整）
   */
  async appendBatch(events: AppendEventInput[]): Promise<LeaderEvent[]> {
    if (events.length === 0) return [];

    const client = await this.pool.connect();
    const results: LeaderEvent[] = [];

    try {
      await client.query('BEGIN');
      for (const input of events) {
        const event = await this.appendWithClient(client, input);
        results.push(event);
      }
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 在指定事务中追加事件（私有实现）
   */
  private async appendWithClient(client: PoolClient, input: AppendEventInput): Promise<LeaderEvent> {
    // 1. 取上一个事件
    const prevResult = await client.query(
      `SELECT seq, hash_chain FROM leader_events ORDER BY seq DESC LIMIT 1`
    );
    const prevHash = prevResult.rows[0]?.hash_chain || this.GENESIS_HASH;

    // 2. 计算 hash chain
    const eventData = {
      eventType: input.eventType,
      sessionId: input.sessionId,
      payload: input.payload,
      metadata: input.metadata || {},
      parentEventId: input.parentEventId,
      causationId: input.causationId,
      timestamp: Date.now()
    };
    const hashChain = crypto
      .createHash('sha256')
      .update(prevHash + JSON.stringify(eventData))
      .digest('hex');

    // 3. 原子 INSERT
    const result = await client.query(
      `INSERT INTO leader_events (
        session_id, user_id, event_type, parent_event_id, causation_id,
        payload, metadata, compensation_action, hash_chain,
        occurred_at, applied_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
      RETURNING *`,
      [
        input.sessionId,
        input.userId || null,
        input.eventType,
        input.parentEventId || null,
        input.causationId || null,
        JSON.stringify(input.payload),
        JSON.stringify(input.metadata || {}),
        input.compensationAction ? JSON.stringify(input.compensationAction) : null,
        hashChain,
        input.applyImmediately === false ? null : new Date()
      ]
    );

    const event = this.rowToEvent(result.rows[0]);

    // 4. 通知订阅者（异步，不阻塞写入）
    setImmediate(() => this.notifySubscribers(event));

    return event;
  }

  // ============================================================
  // 事件查询
  // ============================================================

  /**
   * 按 session 获取事件流（按 seq 升序）
   */
  async getBySession(sessionId: string, options: { fromSeq?: number; limit?: number } = {}): Promise<LeaderEvent[]> {
    const fromSeq = options.fromSeq || 0;
    const limit = options.limit || 1000;

    const result = await this.pool.query(
      `SELECT * FROM leader_events
       WHERE session_id = $1 AND seq >= $2
       ORDER BY seq ASC LIMIT $3`,
      [sessionId, fromSeq, limit]
    );

    return result.rows.map(row => this.rowToEvent(row));
  }

  /**
   * 按类型查询事件
   */
  async getByType(eventType: LeaderEventType, options: { limit?: number; since?: Date } = {}): Promise<LeaderEvent[]> {
    const limit = options.limit || 100;
    const since = options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await this.pool.query(
      `SELECT * FROM leader_events
       WHERE event_type = $1 AND occurred_at >= $2
       ORDER BY seq DESC LIMIT $3`,
      [eventType, since, limit]
    );

    return result.rows.map(row => this.rowToEvent(row));
  }

  /**
   * 获取单条事件
   */
  async getBySeq(seq: number): Promise<LeaderEvent | null> {
    const result = await this.pool.query('SELECT * FROM leader_events WHERE seq = $1', [seq]);
    return result.rows[0] ? this.rowToEvent(result.rows[0]) : null;
  }

  /**
   * 获取 session 的最新事件
   */
  async getLatestBySession(sessionId: string): Promise<LeaderEvent | null> {
    const result = await this.pool.query(
      `SELECT * FROM leader_events WHERE session_id = $1 ORDER BY seq DESC LIMIT 1`,
      [sessionId]
    );
    return result.rows[0] ? this.rowToEvent(result.rows[0]) : null;
  }

  // ============================================================
  // 因果链追溯
  // ============================================================

  /**
   * 追溯事件的因果链
   * 从指定事件开始，沿 causation_id 向上追溯直到根事件
   */
  async getCausalityChain(startSeq: number): Promise<LeaderEvent[]> {
    const chain: LeaderEvent[] = [];
    let currentSeq: number | null = startSeq;
    const visited = new Set<number>();

    while (currentSeq !== null && !visited.has(currentSeq)) {
      visited.add(currentSeq);

      const event = await this.getBySeq(currentSeq);
      if (!event) break;

      chain.unshift(event);

      // 向上找 causation
      if (event.causationId) {
        const parentResult = await this.pool.query(
          'SELECT seq FROM leader_events WHERE event_id = $1',
          [event.causationId]
        );
        currentSeq = parentResult.rows[0]?.seq || null;
      } else {
        currentSeq = null;
      }
    }

    return chain;
  }

  // ============================================================
  // WAL 崩溃恢复
  // ============================================================

  /**
   * 获取所有未应用的事件（applied_at IS NULL）
   * 用于服务重启后扫描未完成的事件
   */
  async getUnappliedEvents(options: { sessionId?: string; limit?: number } = {}): Promise<LeaderEvent[]> {
    const limit = options.limit || 1000;
    let query = 'SELECT * FROM leader_events WHERE applied_at IS NULL ORDER BY seq ASC';
    const params: any[] = [];

    if (options.sessionId) {
      query += ' AND session_id = $1';
      params.push(options.sessionId);
    }
    query += ` LIMIT ${limit}`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.rowToEvent(row));
  }

  /**
   * 标记事件已应用
   * 用于崩溃恢复时回放完成
   */
  async markApplied(seq: number): Promise<void> {
    await this.pool.query(
      'UPDATE leader_events SET applied_at = NOW() WHERE seq = $1 AND applied_at IS NULL',
      [seq]
    );
  }

  /**
   * 重放事件流
   * 把所有未应用的事件标记为已应用（幂等操作）
   * 不实际执行业务逻辑，仅用于审计和回放
   */
  async replay(sessionId: string, options: { fromSeq?: number } = {}): Promise<EventReplayResult> {
    const events = await this.getBySession(sessionId, { fromSeq: options.fromSeq });
    const result: EventReplayResult = {
      events,
      appliedCount: 0,
      skippedCount: 0,
      errors: []
    };

    for (const event of events) {
      if (event.appliedAt) {
        result.skippedCount++;
        continue;
      }
      try {
        await this.markApplied(event.seq);
        result.appliedCount++;
      } catch (error) {
        result.errors.push({ seq: event.seq, error: (error as Error).message });
      }
    }

    return result;
  }

  /**
   * 验证事件流的 hash chain 完整性
   * 用于定期审计或调试
   */
  async verifyHashChain(sessionId?: string): Promise<{
    valid: boolean;
    brokenAt?: number;
    totalChecked: number;
  }> {
    let query = 'SELECT * FROM leader_events ORDER BY seq ASC';
    const params: any[] = [];

    if (sessionId) {
      query = 'SELECT * FROM leader_events WHERE session_id = $1 ORDER BY seq ASC';
      params.push(sessionId);
    }

    const result = await this.pool.query(query, params);
    const rows = result.rows;

    let prevHash = this.GENESIS_HASH;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const eventData = {
        eventType: row.event_type,
        sessionId: row.session_id,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
        parentEventId: row.parent_event_id,
        causationId: row.causation_id,
        timestamp: new Date(row.occurred_at).getTime()
      };
      const expectedHash = crypto
        .createHash('sha256')
        .update(prevHash + JSON.stringify(eventData))
        .digest('hex');

      if (expectedHash !== row.hash_chain) {
        return {
          valid: false,
          brokenAt: row.seq,
          totalChecked: i + 1
        };
      }

      prevHash = row.hash_chain;
    }

    return { valid: true, totalChecked: rows.length };
  }

  // ============================================================
  // Saga 补偿支持
  // ============================================================

  /**
   * 标记补偿状态
   */
  async updateCompensationStatus(seq: number, status: CompensationStatus, error?: string): Promise<void> {
    await this.pool.query(
      `UPDATE leader_events
       SET compensation_status = $1,
           metadata = metadata || $2::jsonb
       WHERE seq = $3`,
      [status, JSON.stringify({ lastCompensationError: error }), seq]
    );
  }

  /**
   * 获取待补偿的事件（worker.failed 状态且补偿未完成）
   */
  async getPendingCompensations(sessionId: string): Promise<LeaderEvent[]> {
    const result = await this.pool.query(
      `SELECT * FROM leader_events
       WHERE session_id = $1
         AND event_type = 'worker.failed'
         AND compensation_action IS NOT NULL
         AND (compensation_status IS NULL OR compensation_status IN ('pending', 'running'))
       ORDER BY seq ASC`,
      [sessionId]
    );
    return result.rows.map(row => this.rowToEvent(row));
  }

  // ============================================================
  // 订阅（轻量级 EventBus）
  // ============================================================

  private subscribers: Map<LeaderEventType | '*', Array<(event: LeaderEvent) => void>> = new Map();

  /**
   * 订阅事件
   */
  subscribe(eventType: LeaderEventType | '*', handler: (event: LeaderEvent) => void): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);

    // 返回 unsubscribe 函数
    return () => {
      const handlers = this.subscribers.get(eventType);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  }

  private notifySubscribers(event: LeaderEvent): void {
    // 通知特定类型订阅者
    const specific = this.subscribers.get(event.eventType);
    if (specific) {
      for (const handler of specific) {
        try {
          handler(event);
        } catch (err) {
          console.error('[LeaderEventStore] Subscriber error:', (err as Error).message);
        }
      }
    }

    // 通知全局订阅者
    const all = this.subscribers.get('*');
    if (all) {
      for (const handler of all) {
        try {
          handler(event);
        } catch (err) {
          console.error('[LeaderEventStore] Subscriber error:', (err as Error).message);
        }
      }
    }
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 统计 session 的事件
   */
  async getStats(sessionId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    firstAt?: string;
    lastAt?: string;
  }> {
    const result = await this.pool.query(
      `SELECT event_type, COUNT(*) as count,
              MIN(occurred_at) as first_at,
              MAX(occurred_at) as last_at
       FROM leader_events
       WHERE session_id = $1
       GROUP BY event_type`,
      [sessionId]
    );

    const byType: Record<string, number> = {};
    let firstAt: string | undefined;
    let lastAt: string | undefined;
    let total = 0;

    for (const row of result.rows) {
      byType[row.event_type] = parseInt(row.count);
      total += parseInt(row.count);
      if (!firstAt || row.first_at < firstAt) firstAt = row.first_at;
      if (!lastAt || row.last_at > lastAt) lastAt = row.last_at;
    }

    return { total, byType, firstAt, lastAt };
  }

  /**
   * 数据库行映射
   */
  private rowToEvent(row: any): LeaderEvent {
    return {
      seq: row.seq,
      eventId: row.event_id,
      sessionId: row.session_id,
      userId: row.user_id,
      eventType: row.event_type,
      parentEventId: row.parent_event_id,
      causationId: row.causation_id,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      compensationAction: row.compensation_action
        ? (typeof row.compensation_action === 'string' ? JSON.parse(row.compensation_action) : row.compensation_action)
        : undefined,
      compensationStatus: row.compensation_status,
      hashChain: row.hash_chain,
      occurredAt: row.occurred_at?.toISOString?.() || row.occurred_at,
      appliedAt: row.applied_at?.toISOString?.() || row.applied_at
    };
  }
}

// 导出单例
export const leaderEventStore = new LeaderEventStore();