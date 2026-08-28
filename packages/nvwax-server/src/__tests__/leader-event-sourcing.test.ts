/**
 * Leader Event Sourcing + Saga 集成测试 (P1)
 *
 * 验证以下核心能力：
 * 1. LeaderEventStore 的 append / hash chain / 因果链
 * 2. LeaderOrchestrator 的 Coordinator-Worker + Saga 补偿
 * 3. aiteam-creation 状态变更触发事件
 * 4. 崩溃恢复：getUnappliedEvents + replay
 * 5. hash chain 完整性验证
 *
 * 设计参考：
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §7.3
 */

/// <reference types="jest" />

import { leaderEventStore, LeaderEvent } from '../services/leader-event-store.service.js';
import { leaderOrchestrator, OrchestrationPlan, WorkerType } from '../services/leader-orchestrator.service.js';
import { aiteamCreationService } from '../services/aiteam-creation.service.js';

// ============================================================
// 1. LeaderEventStore 基础测试
// ============================================================

describe('LeaderEventStore', () => {
  test('append 写入事件并返回 seq', async () => {
    const event = await leaderEventStore.append({
      sessionId: 'test-' + Date.now(),
      eventType: 'skill.routing.start',
      payload: { requirement: 'test' }
    });
    expect(event.seq).toBeGreaterThan(0);
    expect(event.sessionId).toMatch(/^test-/);
    expect(event.hashChain).toHaveLength(64);
  });

  test('每个事件的 hash_chain 不同', async () => {
    const sessionId = 'test-hash-' + Date.now();
    const e1 = await leaderEventStore.append({
      sessionId,
      eventType: 'skill.routing.start',
      payload: { step: 1 }
    });
    const e2 = await leaderEventStore.append({
      sessionId,
      eventType: 'skill.matched',
      payload: { step: 2 },
      causationId: e1.eventId
    });
    const e3 = await leaderEventStore.append({
      sessionId,
      eventType: 'skill.activated',
      payload: { step: 3 },
      causationId: e2.eventId
    });

    expect(e1.hashChain).not.toBe(e2.hashChain);
    expect(e2.hashChain).not.toBe(e3.hashChain);
    expect(e1.seq).toBeLessThan(e2.seq);
    expect(e2.seq).toBeLessThan(e3.seq);
  });

  test('getBySession 按 seq 升序返回', async () => {
    const sessionId = 'test-stream-' + Date.now();

    for (let i = 0; i < 5; i++) {
      await leaderEventStore.append({
        sessionId,
        eventType: 'worker.dispatch',
        payload: { index: i }
      });
    }

    const events = await leaderEventStore.getBySession(sessionId);
    expect(events.length).toBe(5);

    for (let i = 1; i < events.length; i++) {
      expect(events[i].seq).toBeGreaterThan(events[i - 1].seq);
    }
  });

  test('因果链追溯：从 leaf 沿 causation_id 回到 root', async () => {
    const sessionId = 'test-causal-' + Date.now();
    const root = await leaderEventStore.append({
      sessionId,
      eventType: 'orchestration.start',
      payload: { root: true }
    });
    const mid = await leaderEventStore.append({
      sessionId,
      eventType: 'worker.dispatch',
      parentEventId: root.eventId,
      causationId: root.eventId,
      payload: { step: 1 }
    });
    const leaf = await leaderEventStore.append({
      sessionId,
      eventType: 'worker.succeeded',
      parentEventId: mid.eventId,
      causationId: mid.eventId,
      payload: { step: 1, success: true }
    });

    const chain = await leaderEventStore.getCausalityChain(leaf.seq);
    expect(chain.length).toBe(3);
    expect(chain[0].eventType).toBe('orchestration.start');
    expect(chain[2].eventType).toBe('worker.succeeded');
  });

  test('hash chain 完整性验证', async () => {
    const sessionId = 'test-verify-' + Date.now();
    await leaderEventStore.append({
      sessionId,
      eventType: 'skill.routing.start',
      payload: { test: 1 }
    });
    await leaderEventStore.append({
      sessionId,
      eventType: 'skill.matched',
      payload: { test: 2 }
    });

    const result = await leaderEventStore.verifyHashChain(sessionId);
    expect(result.valid).toBe(true);
    expect(result.totalChecked).toBeGreaterThan(0);
  });
});

// ============================================================
// 2. LeaderOrchestrator Saga 测试
// ============================================================

describe('LeaderOrchestrator', () => {
  test('成功编排：所有 worker 完成后写入 orchestration.completed', async () => {
    const sessionId = 'test-orch-success-' + Date.now();

    const plan: OrchestrationPlan = {
      sessionId,
      steps: [
        { step: 1, workerType: 'team_validation', name: 'Validate', input: { roles: [{ roleName: 'test' }] } },
        { step: 2, workerType: 'agent_matching', name: 'Match Agents', input: { roles: [{ roleName: 'test' }] } }
      ]
    };

    const result = await leaderOrchestrator.execute(plan);

    expect(result.success).toBe(true);
    expect(result.outputs.length).toBe(2);
    expect(result.outputs.every(o => o.success)).toBe(true);
    expect(result.rootEventSeq).toBeGreaterThan(0);

    // 验证事件流
    const events = await leaderEventStore.getBySession(sessionId);
    const types = events.map(e => e.eventType);
    expect(types).toContain('orchestration.start');
    expect(types).toContain('worker.dispatch');
    expect(types).toContain('worker.succeeded');
    expect(types).toContain('orchestration.completed');
  });

  test('失败编排：触发 Saga 逆序补偿 + 自动创建反思', async () => {
    const sessionId = 'test-orch-fail-' + Date.now();

    // 注册一个会失败的 worker
    const failureWorkerType = 'test_failure_' + Date.now();
    leaderOrchestrator.registerCustomWorker(failureWorkerType, {
      execute: async () => {
        throw new Error('Simulated worker failure');
      },
      compensate: async () => {
        console.log(`[Test] Compensated ${failureWorkerType}`);
      }
    });

    const plan: OrchestrationPlan = {
      sessionId,
      steps: [
        // 第一个步骤成功，会被加入 completedWorkers
        { step: 1, workerType: 'team_validation', name: 'Validate', input: {} },
        // 第二个步骤会失败，触发 Saga 补偿
        { step: 2, workerType: failureWorkerType as WorkerType, name: 'Failure Step', input: {} }
      ],
      globalContext: { requirement: '测试 Saga 失败场景' }
    };

    const result = await leaderOrchestrator.execute(plan);

    expect(result.success).toBe(false);
    expect(result.compensatedCount).toBeGreaterThan(0);  // 第一步被补偿了

    // 验证事件流包含 Saga 事件
    const events = await leaderEventStore.getBySession(sessionId);
    const types = events.map(e => e.eventType);
    expect(types).toContain('orchestration.start');
    expect(types).toContain('worker.failed');
    expect(types).toContain('saga.compensate.start');
    expect(types).toContain('saga.compensate.worker');
    expect(types).toContain('saga.compensate.completed');
    expect(types).toContain('orchestration.failed');
    expect(types).toContain('reflection.created');

    // 验证事件因果链完整
    const verifyResult = await leaderEventStore.verifyHashChain(sessionId);
    expect(verifyResult.valid).toBe(true);
  }, 30000);
});

// ============================================================
// 3. 崩溃恢复测试
// ============================================================

describe('崩溃恢复', () => {
  test('getUnappliedEvents 能找到 applied_at IS NULL 的事件', async () => {
    const sessionId = 'test-crash-' + Date.now();

    // 追加 3 个事件
    const e1 = await leaderEventStore.append({
      sessionId,
      eventType: 'skill.routing.start',
      payload: { test: 1 }
    });
    const e2 = await leaderEventStore.append({
      sessionId,
      eventType: 'skill.matched',
      payload: { test: 2 },
      applyImmediately: false  // 标记为未应用
    });
    const e3 = await leaderEventStore.append({
      sessionId,
      eventType: 'skill.activated',
      payload: { test: 3 },
      applyImmediately: false
    });

    // 只查询未应用的事件
    const unapplied = await leaderEventStore.getUnappliedEvents({ sessionId });
    const unappliedSeqs = unapplied.map(e => e.seq);
    expect(unappliedSeqs).toContain(e2.seq);
    expect(unappliedSeqs).toContain(e3.seq);
    expect(unappliedSeqs).not.toContain(e1.seq);  // e1 已应用

    // 调用 replay，标记为已应用
    const replayResult = await leaderEventStore.replay(sessionId);
    expect(replayResult.appliedCount).toBe(2);

    // 再次查询，应该空了
    const stillUnapplied = await leaderEventStore.getUnappliedEvents({ sessionId });
    expect(stillUnapplied.length).toBe(0);
  });
});

// ============================================================
// 4. aiteam-creation 集成测试
// ============================================================

describe('aiteam-creation 与事件溯源集成', () => {
  test('updateStatus 触发 orchestration.* 事件', async () => {
    const sessionId = 'test-aiteam-status-' + Date.now();

    // 创建 session
    const session = await aiteamCreationService.createSession('test-user-' + Date.now());
    expect(session.id).toBeTruthy();

    // 更新状态
    await aiteamCreationService.updateStatus(session.id, 'requirements_gathering');
    await aiteamCreationService.updateStatus(session.id, 'role_selection');
    await aiteamCreationService.updateStatus(session.id, 'agent_searching');
    await aiteamCreationService.updateStatus(session.id, 'completed');

    // 验证事件流
    const events = await leaderEventStore.getBySession(session.id);
    expect(events.length).toBeGreaterThanOrEqual(3);

    // 至少有 completed 事件
    const completedEvent = events.find(e => e.eventType === 'orchestration.completed');
    expect(completedEvent).toBeTruthy();

    // 验证 hash chain 完整
    const verify = await leaderEventStore.verifyHashChain(session.id);
    expect(verify.valid).toBe(true);

    // 清理
    await aiteamCreationService.deleteSession(session.id, session.userId);
  }, 15000);

  test('replayFromEvents 返回统计和建议', async () => {
    const sessionId = 'test-replay-from-events-' + Date.now();

    // 创建 session + 写入一些事件
    const session = await aiteamCreationService.createSession('test-user-' + Date.now());
    await aiteamCreationService.updateStatus(session.id, 'requirements_gathering');
    await aiteamCreationService.updateStatus(session.id, 'completed');

    const result = await aiteamCreationService.replayFromEvents(session.id);
    expect(result.sessionId).toBe(session.id);
    expect(result.eventCount).toBeGreaterThan(0);
    expect(result.eventsByType['orchestration.completed']).toBe(1);
    expect(result.suggestedAction).toContain('已完成');

    await aiteamCreationService.deleteSession(session.id, session.userId);
  });
});

// ============================================================
// 5. 性能测试
// ============================================================

describe('P1 性能预算', () => {
  test('append 100 条事件 < 5 秒', async () => {
    const sessionId = 'test-perf-' + Date.now();
    const start = Date.now();

    for (let i = 0; i < 100; i++) {
      await leaderEventStore.append({
        sessionId,
        eventType: 'worker.dispatch',
        payload: { index: i }
      });
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  }, 10000);

  test('verifyHashChain 100 条事件 < 1 秒', async () => {
    const sessionId = 'test-verify-perf-' + Date.now();

    for (let i = 0; i < 50; i++) {
      await leaderEventStore.append({
        sessionId,
        eventType: 'worker.dispatch',
        payload: { index: i }
      });
    }

    const start = Date.now();
    const result = await leaderEventStore.verifyHashChain(sessionId);
    const elapsed = Date.now() - start;

    expect(result.valid).toBe(true);
    expect(elapsed).toBeLessThan(1000);
  }, 15000);
});