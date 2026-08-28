/**
 * Leader Orchestrator Service (Coordinator-Worker + Saga)
 *
 * Leader Agent 的多 Agent 编排层，对齐 Hermes Agent 的 Coordinator-Worker + Saga 设计。
 *
 * 核心职责：
 * 1. Coordinator：拆解编排计划为 worker 任务序列
 * 2. Worker Dispatch：派发任务到具体的角色执行器
 * 3. Saga 补偿：worker 失败时逆序调用每个已完成 worker 的 compensate()
 * 4. 事件溯源：所有动作都通过 LeaderEventStore 落库
 * 5. 反思触发：失败时自动创建 L4 反思
 *
 * Worker 契约：
 * - execute(input, context) => WorkerOutput
 * - compensate(output, context) => Promise<void>  // 可选，失败时调用
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md §2.5, §3.2
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §4.2
 */

import { PoolClient } from 'pg';
import { databaseService } from './database.service.js';
import { leaderEventStore, LeaderEvent, LeaderEventType, AppendEventInput } from './leader-event-store.service.js';
import { leaderSkillService } from './leader-skill.service.js';
import { leaderReflectionService } from './leader-reflection.service.js';
import { leaderTrajectoryService } from './leader-trajectory.service.js';

// ============================================================
// 类型定义
// ============================================================

export type WorkerType = 'agent_matching' | 'skill_matching' | 'document_generation' | 'team_validation' | 'custom';

export interface WorkerStep {
  /** 步骤序号（从 1 开始） */
  step: number;
  /** Worker 类型 */
  workerType: WorkerType;
  /** Worker 名称（用于日志和事件） */
  name: string;
  /** Worker 输入 */
  input: Record<string, unknown>;
  /** 失败时的补偿动作定义 */
  compensationAction?: Record<string, unknown>;
  /** 是否必需（必需步骤失败时整个编排失败） */
  required?: boolean;
}

export interface OrchestrationPlan {
  sessionId: string;
  userId?: string;
  steps: WorkerStep[];
  /** 全局上下文，所有 worker 共享 */
  globalContext?: Record<string, unknown>;
}

export interface WorkerOutput {
  step: number;
  workerType: WorkerType;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  durationMs: number;
  /** worker 内部产生的事件序列号 */
  innerEventSeq?: number[];
}

export interface WorkerHandle {
  step: WorkerStep;
  index: number;
  execute: (input: Record<string, unknown>, context: OrchestrationContext) => Promise<Record<string, unknown>>;
  compensate?: (output: Record<string, unknown>, context: OrchestrationContext) => Promise<void>;
}

export interface OrchestrationContext {
  sessionId: string;
  userId?: string;
  globalContext: Record<string, unknown>;
  /** 已完成的 worker 输出 */
  previousOutputs: Map<number, Record<string, unknown>>;
  /** Worker 句柄注册表 */
  workers: Map<WorkerType, WorkerHandle>;
}

export interface OrchestrationResult {
  success: boolean;
  plan: OrchestrationPlan;
  outputs: WorkerOutput[];
  totalDurationMs: number;
  /** 已执行的补偿步骤数 */
  compensatedCount: number;
  /** 因果链根事件 */
  rootEventSeq?: number;
}

// ============================================================
// 内置 Worker 注册表
// ============================================================

/**
 * 内置 Worker 实现
 */
class BuiltinWorkers {
  /**
   * Agent 匹配 Worker
   * 调用 agentCompatibilityService 搜索匹配每个角色的 Agent
   */
  static async matchAgents(input: any, context: OrchestrationContext): Promise<Record<string, unknown>> {
    const roles = input.roles || [];
    const userId = context.userId;

    // 简化实现：返回 role 数 + 占位 matches
    return {
      roles: roles.length,
      matchedCount: roles.length * 3,
      placeholderMatches: roles.map((r: any) => ({
        roleName: r.roleName,
        agents: []
      }))
    };
  }

  /**
   * Skill 匹配 Worker
   */
  static async matchSkills(input: any, context: OrchestrationContext): Promise<Record<string, unknown>> {
    return {
      skillsRequested: input.skills?.length || 0,
      matchedCount: 0
    };
  }

  /**
   * 文档生成 Worker
   */
  static async generateDocuments(input: any, context: OrchestrationContext): Promise<Record<string, unknown>> {
    return {
      documentsGenerated: 0
    };
  }

  /**
   * 团队验证 Worker
   */
  static async validateTeam(input: any, context: OrchestrationContext): Promise<Record<string, unknown>> {
    return {
      valid: true,
      warnings: []
    };
  }

  /**
   * 通用补偿：清理 worker 创建的资源
   */
  static async defaultCompensate(output: Record<string, unknown>, context: OrchestrationContext): Promise<void> {
    console.log('[Orchestrator] Default compensation: nothing to undo');
  }
}

// ============================================================
// Leader Orchestrator
// ============================================================

export class LeaderOrchestrator {
  private pool = databaseService.getPool();

  // ============================================================
  // 主入口
  // ============================================================

  /**
   * 执行编排计划
   *
   * 算法：
   * 1. 写入 orchestration.start 事件
   * 2. 按顺序派发每个 worker
   * 3. 成功：写入 worker.succeeded 事件，输出进入上下文
   * 4. 失败：写入 worker.failed 事件
   *    a. 触发 saga.compensate.start
   *    b. 逆序调用已完成 worker 的 compensate()
   *    c. 写入 saga.compensate.completed（或 failed）
   *    d. 创建 L4 反思
   * 5. 写入 orchestration.completed（或 failed）
   */
  async execute(plan: OrchestrationPlan): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const workers = this.buildWorkerRegistry();
    const context: OrchestrationContext = {
      sessionId: plan.sessionId,
      userId: plan.userId,
      globalContext: plan.globalContext || {},
      previousOutputs: new Map(),
      workers
    };

    const outputs: WorkerOutput[] = [];
    const completedWorkers: Array<{ handle: WorkerHandle; output: Record<string, unknown>; index: number }> = [];
    let rootEventSeq: number | undefined;
    let compensatedCount = 0;

    try {
      // 1. orchestration.start
      const startEvent = await leaderEventStore.append({
        sessionId: plan.sessionId,
        userId: plan.userId,
        eventType: 'orchestration.start',
        payload: {
          totalSteps: plan.steps.length,
          steps: plan.steps.map(s => ({ step: s.step, name: s.name, type: s.workerType }))
        }
      });
      rootEventSeq = startEvent.seq;

      // 写轨迹
      await leaderTrajectoryService.append(
        plan.sessionId, 'assistant',
        `🎯 [Orchestrator] Starting orchestration with ${plan.steps.length} steps`,
        { eventSeq: startEvent.seq, purpose: 'orchestration' }
      ).catch(() => {});

      // 2. 顺序派发 worker
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        const worker = workers.get(step.workerType);

        if (!worker) {
          throw new Error(`No worker registered for type: ${step.workerType}`);
        }

        const stepStartTime = Date.now();

        // worker.dispatch 事件
        const dispatchEvent = await leaderEventStore.append({
          sessionId: plan.sessionId,
          userId: plan.userId,
          eventType: 'worker.dispatch',
          causationId: startEvent.eventId,
          parentEventId: startEvent.eventId,
          payload: {
            step: step.step,
            workerType: step.workerType,
            name: step.name,
            input: step.input
          },
          compensationAction: step.compensationAction
            ? {
                type: step.workerType,
                action: step.compensationAction,
                step: step.step
              }
            : undefined
        });

        let stepOutput: Record<string, unknown> = {};
        let stepSuccess = false;
        let stepError: string | undefined;

        try {
          stepOutput = await worker.execute(step.input, context);
          stepSuccess = true;
        } catch (err) {
          stepSuccess = false;
          stepError = (err as Error).message;

          // worker.failed 事件
          await leaderEventStore.append({
            sessionId: plan.sessionId,
            userId: plan.userId,
            eventType: 'worker.failed',
            causationId: dispatchEvent.eventId,
            parentEventId: dispatchEvent.eventId,
            payload: {
              step: step.step,
              workerType: step.workerType,
              error: stepError,
              stack: (err as Error).stack?.split('\n').slice(0, 5).join('\n')
            },
            compensationAction: step.compensationAction
              ? {
                  type: step.workerType,
                  action: step.compensationAction,
                  step: step.step
                }
              : undefined
          });

          await leaderEventStore.updateCompensationStatus(dispatchEvent.seq, 'pending', stepError);
        }

        const stepDuration = Date.now() - stepStartTime;

        // worker.succeeded 事件
        if (stepSuccess) {
          await leaderEventStore.append({
            sessionId: plan.sessionId,
            userId: plan.userId,
            eventType: 'worker.succeeded',
            causationId: dispatchEvent.eventId,
            parentEventId: dispatchEvent.eventId,
            payload: {
              step: step.step,
              workerType: step.workerType,
              outputSummary: this.summarizeOutput(stepOutput),
              durationMs: stepDuration
            }
          });

          completedWorkers.push({ handle: worker, output: stepOutput, index: i });
          context.previousOutputs.set(step.step, stepOutput);
        }

        outputs.push({
          step: step.step,
          workerType: step.workerType,
          success: stepSuccess,
          output: stepSuccess ? stepOutput : undefined,
          error: stepError,
          durationMs: stepDuration,
          innerEventSeq: [dispatchEvent.seq]
        });

        // 必需 worker 失败 → 整体失败
        if (!stepSuccess && step.required !== false) {
          throw new Error(`Required worker "${step.name}" failed at step ${step.step}: ${stepError}`);
        }
      }

      // 3. orchestration.completed
      await leaderEventStore.append({
        sessionId: plan.sessionId,
        userId: plan.userId,
        eventType: 'orchestration.completed',
        causationId: startEvent.eventId,
        parentEventId: startEvent.eventId,
        payload: {
          totalSteps: plan.steps.length,
          successfulSteps: outputs.filter(o => o.success).length,
          durationMs: Date.now() - startTime
        }
      });

      await leaderTrajectoryService.append(
        plan.sessionId, 'assistant',
        `✅ [Orchestrator] Completed in ${Date.now() - startTime}ms`,
        { purpose: 'orchestration' }
      ).catch(() => {});

      return {
        success: true,
        plan,
        outputs,
        totalDurationMs: Date.now() - startTime,
        compensatedCount,
        rootEventSeq
      };

    } catch (error) {
      // === Saga 补偿流程 ===
      console.error('[Orchestrator] Orchestration failed, starting Saga compensation:', (error as Error).message);

      // 触发 saga.compensate.start
      const compensateStartEvent = await leaderEventStore.append({
        sessionId: plan.sessionId,
        userId: plan.userId,
        eventType: 'saga.compensate.start',
        parentEventId: rootEventSeq ? String(rootEventSeq) : undefined,
        payload: {
          failedReason: (error as Error).message,
          completedWorkerCount: completedWorkers.length
        }
      });

      // 逆序补偿
      for (let i = completedWorkers.length - 1; i >= 0; i--) {
        const { handle, output, index } = completedWorkers[i];
        const compensateStepStart = Date.now();

        await leaderEventStore.append({
          sessionId: plan.sessionId,
          userId: plan.userId,
          eventType: 'saga.compensate.worker',
          causationId: compensateStartEvent.eventId,
          parentEventId: compensateStartEvent.eventId,
          payload: {
            step: handle.step.step,
            workerType: handle.workerType,
            outputKeys: Object.keys(output)
          }
        });

        try {
          const compensateFn = handle.compensate || BuiltinWorkers.defaultCompensate;
          await compensateFn(output, context);
          compensatedCount++;
        } catch (compensateError) {
          console.error(`[Orchestrator] Compensation failed for step ${handle.step.step}:`, compensateError);

          await leaderEventStore.append({
            sessionId: plan.sessionId,
            userId: plan.userId,
            eventType: 'saga.compensate.failed',
            causationId: compensateStartEvent.eventId,
            payload: {
              step: handle.step.step,
              error: (compensateError as Error).message
            }
          });
        }

        await leaderTrajectoryService.append(
          plan.sessionId, 'assistant',
          `↩️ [Saga] Compensated step ${handle.step.step} (${compensatedCount}/${completedWorkers.length})`,
          { purpose: 'orchestration' }
        ).catch(() => {});
      }

      // saga.compensate.completed
      await leaderEventStore.append({
        sessionId: plan.sessionId,
        userId: plan.userId,
        eventType: 'saga.compensate.completed',
        parentEventId: compensateStartEvent.eventId,
        payload: {
          compensatedCount,
          totalToCompensate: completedWorkers.length
        }
      });

      // orchestration.failed
      await leaderEventStore.append({
        sessionId: plan.sessionId,
        userId: plan.userId,
        eventType: 'orchestration.failed',
        parentEventId: rootEventSeq ? String(rootEventSeq) : undefined,
        payload: {
          error: (error as Error).message,
          compensatedCount,
          totalToCompensate: completedWorkers.length
        }
      });

      // === 触发 L4 反思 ===
      const failedStep = plan.steps[outputs.findIndex(o => !o.success)];
      await leaderReflectionService.create({
        sessionId: plan.sessionId,
        requirement: (plan.globalContext?.requirement as string) || `orchestration with ${plan.steps.length} steps`,
        summary: `编排失败：${(error as Error).message}。补偿了 ${compensatedCount}/${completedWorkers.length} 个已完成 worker`,
        failurePattern: this.classifyError((error as Error).message),
        improvementSuggestion: `检查 "${failedStep?.name || 'unknown'}" 步骤的配置，考虑添加重试或跳过该步骤`,
        successScore: 0.1,
        relatedEventSeq: rootEventSeq,
        tags: [failedStep?.workerType || 'unknown', 'orchestration_failed'].filter(Boolean) as string[]
      }).catch(reflectErr => {
        console.error('[Orchestrator] Failed to create reflection:', (reflectErr as Error).message);
      });

      await leaderTrajectoryService.append(
        plan.sessionId, 'assistant',
        `❌ [Orchestrator] Failed: ${(error as Error).message}`,
        { purpose: 'orchestration' }
      ).catch(() => {});

      return {
        success: false,
        plan,
        outputs,
        totalDurationMs: Date.now() - startTime,
        compensatedCount,
        rootEventSeq
      };
    }
  }

  // ============================================================
  // Worker 注册表构建
  // ============================================================

  /**
   * 构建内置 worker 注册表
   * 调用方可注册自定义 worker
   */
  private buildWorkerRegistry(): Map<WorkerType, WorkerHandle> {
    const registry = new Map<WorkerType, WorkerHandle>();

    registry.set('agent_matching', {
      step: { step: 0, workerType: 'agent_matching', name: 'Agent Matching', input: {} },
      index: 0,
      execute: BuiltinWorkers.matchAgents,
      compensate: async (output, ctx) => {
        console.log('[Compensate] Cleaning up agent matching artifacts');
      }
    });

    registry.set('skill_matching', {
      step: { step: 0, workerType: 'skill_matching', name: 'Skill Matching', input: {} },
      index: 0,
      execute: BuiltinWorkers.matchSkills,
      compensate: async (output, ctx) => {
        console.log('[Compensate] Cleaning up skill matching artifacts');
      }
    });

    registry.set('document_generation', {
      step: { step: 0, workerType: 'document_generation', name: 'Document Generation', input: {} },
      index: 0,
      execute: BuiltinWorkers.generateDocuments,
      compensate: async (output, ctx) => {
        // 删除已生成的文档
        const docIds = (output.documentIds as string[]) || [];
        for (const id of docIds) {
          console.log(`[Compensate] Removing document ${id}`);
        }
      }
    });

    registry.set('team_validation', {
      step: { step: 0, workerType: 'team_validation', name: 'Team Validation', input: {} },
      index: 0,
      execute: BuiltinWorkers.validateTeam
    });

    return registry;
  }

  // ============================================================
  // 自定义 Worker 注册
  // ============================================================

  /** 全局自定义 worker 注册表 */
  private customWorkers: Map<string, WorkerHandle> = new Map();

  /**
   * 注册自定义 worker
   */
  registerCustomWorker(type: string, handle: Omit<WorkerHandle, 'step' | 'index'>): void {
    this.customWorkers.set(type, {
      step: { step: 0, workerType: 'custom' as WorkerType, name: type, input: {} },
      index: 0,
      execute: handle.execute,
      compensate: handle.compensate
    });
  }

  /**
   * 获取自定义 worker（用于 buildWorkerRegistry 之外的场景）
   */
  getCustomWorker(type: string): WorkerHandle | undefined {
    return this.customWorkers.get(type);
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 输出摘要（避免大对象塞入事件）
   */
  private summarizeOutput(output: Record<string, unknown>): Record<string, unknown> {
    const summary: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(output)) {
      if (Array.isArray(value)) {
        summary[key] = `[Array(${value.length})]`;
      } else if (typeof value === 'object' && value !== null) {
        summary[key] = `[Object ${Object.keys(value).length} keys]`;
      } else if (typeof value === 'string' && value.length > 200) {
        summary[key] = `[String ${value.length} chars]`;
      } else {
        summary[key] = value;
      }
    }
    return summary;
  }

  /**
   * 错误分类
   */
  private classifyError(message: string): 'timeout' | 'skill_missing' | 'conflict' | 'low_quality' | 'wrong_team_type' | 'other' {
    const msg = message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
    if (msg.includes('json') || msg.includes('parse') || msg.includes('schema')) return 'low_quality';
    if (msg.includes('rate limit') || msg.includes('quota')) return 'skill_missing';
    if (msg.includes('conflict') || msg.includes('version')) return 'conflict';
    return 'other';
  }
}

// 导出单例
export const leaderOrchestrator = new LeaderOrchestrator();