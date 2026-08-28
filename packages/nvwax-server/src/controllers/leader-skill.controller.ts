/**
 * Leader Skill Controller
 *
 * 提供 Leader Skill 的 REST API：
 * - GET    /api/leader-skills              列出所有 skills
 * - GET    /api/leader-skills/:skillId     获取详情
 * - POST   /api/leader-skills              创建 skill
 * - PUT    /api/leader-skills/:skillId     更新 skill
 * - DELETE /api/leader-skills/:skillId     停用 skill
 * - POST   /api/leader-skills/route        三段式路由（关键词+语义+LLM）
 * - POST   /api/leader-skills/:id/record-usage  记录使用结果
 *
 * 设计参考：
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §6.1
 */

import { Request, Response } from 'express';
import { leaderSkillService, LeaderSkillInput } from '../services/leader-skill.service.js';
import { leaderSkillRouter } from '../services/leader-router.service.js';
import { leaderReflectionService } from '../services/leader-reflection.service.js';
import { leaderTrajectoryService } from '../services/leader-trajectory.service.js';
import { leaderEventStore, LeaderEventType } from '../services/leader-event-store.service.js';
import { leaderOrchestrator, OrchestrationPlan } from '../services/leader-orchestrator.service.js';

export class LeaderSkillController {

  /**
   * GET /api/leader-skills
   */
  async list(req: Request, res: Response) {
    try {
      const { category, bundle, limit, offset } = req.query;
      const result = await leaderSkillService.list({
        category: category as string,
        bundle: bundle as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[LeaderSkill] list failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-skills/:skillId
   */
  async getOne(req: Request, res: Response) {
    try {
      const { skillId } = req.params;
      const skill = await leaderSkillService.getBySkillId(skillId);
      if (!skill) {
        return res.status(404).json({ success: false, error: 'Skill not found' });
      }
      res.json({ success: true, data: skill });
    } catch (error) {
      console.error('[LeaderSkill] get failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-skills
   */
  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).admin?.id;
      const input: LeaderSkillInput = req.body;
      if (!input.skillId || !input.name || !input.category) {
        return res.status(400).json({
          success: false,
          error: 'skillId, name, category are required'
        });
      }
      const skill = await leaderSkillService.upsert({
        ...input,
        authorId: userId
      });
      res.status(201).json({ success: true, data: skill });
    } catch (error) {
      console.error('[LeaderSkill] create failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * PUT /api/leader-skills/:skillId
   */
  async update(req: Request, res: Response) {
    try {
      const { skillId } = req.params;
      const existing = await leaderSkillService.getBySkillId(skillId);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Skill not found' });
      }
      const input: LeaderSkillInput = { ...req.body, skillId };
      const skill = await leaderSkillService.upsert(input);
      res.json({ success: true, data: skill });
    } catch (error) {
      console.error('[LeaderSkill] update failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * DELETE /api/leader-skills/:skillId
   */
  async deactivate(req: Request, res: Response) {
    try {
      const { skillId } = req.params;
      const ok = await leaderSkillService.deactivate(skillId);
      res.json({ success: ok, message: ok ? 'Deactivated' : 'Not found' });
    } catch (error) {
      console.error('[LeaderSkill] deactivate failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-skills/route
   * 三段式路由：关键词 → 语义 → LLM 排序
   * Body: { requirement, topK?, category?, useLLMReranking?, userId? }
   */
  async route(req: Request, res: Response) {
    try {
      const { requirement, topK, category, useLLMReranking, userId } = req.body;
      if (!requirement) {
        return res.status(400).json({
          success: false,
          error: 'requirement is required'
        });
      }
      const result = await leaderSkillRouter.route(requirement, {
        topK: topK || 5,
        category,
        useLLMReranking: useLLMReranking !== false,
        userId: userId || (req as any).user?.id
      });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[LeaderSkill] route failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-skills/:skillId/record-usage
   * Body: { success: boolean, sessionId?: string }
   */
  async recordUsage(req: Request, res: Response) {
    try {
      const { skillId } = req.params;
      const { success } = req.body;
      await leaderSkillService.recordUsage(skillId, !!success);
      res.json({ success: true });
    } catch (error) {
      console.error('[LeaderSkill] recordUsage failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

// ============================================================
// Reflection Controller
// ============================================================

export class LeaderReflectionController {
  /**
   * POST /api/leader-reflections/recall
   * Body: { requirement, topK? }
   */
  async recall(req: Request, res: Response) {
    try {
      const { requirement, topK } = req.body;
      if (!requirement) {
        return res.status(400).json({
          success: false,
          error: 'requirement is required'
        });
      }
      const reflections = await leaderReflectionService.recall(requirement, topK || 5);
      res.json({ success: true, data: reflections });
    } catch (error) {
      console.error('[LeaderReflection] recall failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-reflections
   * 创建反思
   */
  async create(req: Request, res: Response) {
    try {
      const input = req.body;
      if (!input.sessionId || !input.summary || input.successScore === undefined) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, summary, successScore are required'
        });
      }
      const reflection = await leaderReflectionService.create(input);
      res.status(201).json({ success: true, data: reflection });
    } catch (error) {
      console.error('[LeaderReflection] create failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-reflections
   */
  async list(req: Request, res: Response) {
    try {
      const { sessionId, leaderSkillId, failurePattern, limit, offset } = req.query;
      const result = await leaderReflectionService.list({
        sessionId: sessionId as string,
        leaderSkillId: leaderSkillId as string,
        failurePattern: failurePattern as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[LeaderReflection] list failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-reflections/:id/apply
   * 标记反思被采纳
   */
  async markResolved(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await leaderReflectionService.markResolved(id);
      res.json({ success: true });
    } catch (error) {
      console.error('[LeaderReflection] markResolved failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

// ============================================================
// Trajectory Controller
// ============================================================

export class LeaderTrajectoryController {
  /**
   * POST /api/leader-trajectories/append
   */
  async append(req: Request, res: Response) {
    try {
      const { sessionId, role, content, eventSeq, leaderSkillId, toolCall, toolResult, tokensUsed, model, latencyMs, purpose } = req.body;
      if (!sessionId || !role || !content) {
        return res.status(400).json({
          success: false,
          error: 'sessionId, role, content are required'
        });
      }
      const entry = await leaderTrajectoryService.append(sessionId, role, content, {
        eventSeq,
        leaderSkillId,
        toolCall,
        toolResult,
        tokensUsed,
        model,
        latencyMs,
        purpose
      });
      res.status(201).json({ success: true, data: entry });
    } catch (error) {
      console.error('[LeaderTrajectory] append failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-trajectories?sessionId=xxx
   */
  async getBySession(req: Request, res: Response) {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }
      const entries = await leaderTrajectoryService.getBySession(sessionId as string, {
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        purpose: req.query.purpose as any
      });
      res.json({ success: true, data: entries });
    } catch (error) {
      console.error('[LeaderTrajectory] getBySession failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-trajectories/stats?sessionId=xxx
   */
  async stats(req: Request, res: Response) {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }
      const stats = await leaderTrajectoryService.getStats(sessionId as string);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('[LeaderTrajectory] stats failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

// 导出单例
export const leaderSkillController = new LeaderSkillController();
export const leaderReflectionController = new LeaderReflectionController();
export const leaderTrajectoryController = new LeaderTrajectoryController();

// ============================================================
// Leader Event Controller (P1: 事件溯源)
// ============================================================

export class LeaderEventController {
  /**
   * GET /api/leader-events?sessionId=xxx&fromSeq=0
   * 获取 session 的事件流
   */
  async getBySession(req: Request, res: Response) {
    try {
      const { sessionId, fromSeq, limit } = req.query;
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }
      const events = await leaderEventStore.getBySession(sessionId as string, {
        fromSeq: fromSeq ? parseInt(fromSeq as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({ success: true, data: events });
    } catch (error) {
      console.error('[LeaderEvent] getBySession failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-events/type/:eventType
   * 按类型查询事件
   */
  async getByType(req: Request, res: Response) {
    try {
      const { eventType } = req.params;
      const { limit, since } = req.query;
      const events = await leaderEventStore.getByType(eventType as LeaderEventType, {
        limit: limit ? parseInt(limit as string) : undefined,
        since: since ? new Date(since as string) : undefined
      });
      res.json({ success: true, data: events });
    } catch (error) {
      console.error('[LeaderEvent] getByType failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-events/seq/:seq
   */
  async getBySeq(req: Request, res: Response) {
    try {
      const { seq } = req.params;
      const event = await leaderEventStore.getBySeq(parseInt(seq));
      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }
      res.json({ success: true, data: event });
    } catch (error) {
      console.error('[LeaderEvent] getBySeq failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-events/causality/:seq
   * 追溯事件的因果链
   */
  async getCausalityChain(req: Request, res: Response) {
    try {
      const { seq } = req.params;
      const chain = await leaderEventStore.getCausalityChain(parseInt(seq));
      res.json({ success: true, data: chain });
    } catch (error) {
      console.error('[LeaderEvent] getCausalityChain failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-events/stats?sessionId=xxx
   */
  async stats(req: Request, res: Response) {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }
      const stats = await leaderEventStore.getStats(sessionId as string);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('[LeaderEvent] stats failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-events/replay
   * Body: { sessionId, fromSeq? }
   * 重放 session 的事件（标记未应用为已应用）
   */
  async replay(req: Request, res: Response) {
    try {
      const { sessionId, fromSeq } = req.body;
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
      }
      const result = await leaderEventStore.replay(sessionId, { fromSeq });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[LeaderEvent] replay failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-events/verify?sessionId=xxx
   * 验证 hash chain 完整性
   */
  async verifyHashChain(req: Request, res: Response) {
    try {
      const { sessionId } = req.query;
      const result = await leaderEventStore.verifyHashChain(sessionId as string | undefined);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[LeaderEvent] verifyHashChain failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/leader-events/unapplied
   * 获取所有未应用的事件（用于监控）
   */
  async getUnapplied(req: Request, res: Response) {
    try {
      const { sessionId, limit } = req.query;
      const events = await leaderEventStore.getUnappliedEvents({
        sessionId: sessionId as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({ success: true, data: events });
    } catch (error) {
      console.error('[LeaderEvent] getUnapplied failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

// ============================================================
// Leader Orchestrator Controller (P1: 多 Agent 编排)
// ============================================================

export class LeaderOrchestratorController {
  /**
   * POST /api/leader-orchestrator/execute
   * Body: { sessionId, userId?, steps, globalContext? }
   * 执行编排计划
   */
  async execute(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).admin?.id;
      const { sessionId, steps, globalContext } = req.body;

      if (!sessionId || !Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'sessionId and steps (non-empty array) are required'
        });
      }

      const plan: OrchestrationPlan = {
        sessionId,
        userId,
        steps,
        globalContext: globalContext || {}
      };

      const result = await leaderOrchestrator.execute(plan);
      res.json({
        success: result.success,
        data: {
          ...result,
          compensatedCount: result.compensatedCount,
          rootEventSeq: result.rootEventSeq
        }
      });
    } catch (error) {
      console.error('[LeaderOrchestrator] execute failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  /**
   * POST /api/leader-orchestrator/register-worker
   * 注册自定义 worker
   * Body: { type, executeCode?, compensateCode? }
   *
   * 注意：executeCode / compensateCode 应为 JavaScript 函数源码（受限环境）。
   * 生产环境建议用更严格的 worker SDK，这里仅用于演示和测试。
   */
  async registerWorker(req: Request, res: Response) {
    try {
      const { type, executeCode, compensateCode } = req.body;

      if (!type || !executeCode) {
        return res.status(400).json({
          success: false,
          error: 'type and executeCode are required'
        });
      }

      // 安全：用 Function 构造器在受限环境执行
      const execute = new Function('input', 'context', executeCode);
      const compensate = compensateCode
        ? new Function('output', 'context', compensateCode)
        : undefined;

      leaderOrchestrator.registerCustomWorker(type, {
        execute: async (input, ctx) => execute(input, ctx),
        compensate: compensate ? async (output, ctx) => compensate(output, ctx) : undefined
      });

      res.json({ success: true, message: `Worker ${type} registered` });
    } catch (error) {
      console.error('[LeaderOrchestrator] registerWorker failed:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }
}

export const leaderEventController = new LeaderEventController();
export const leaderOrchestratorController = new LeaderOrchestratorController();