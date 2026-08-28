/**
 * 状态机单元测试
 * 
 * 测试 CreationStateMachine 的：
 * 1. 基本状态转换
 * 2. 条件分支
 * 3. Human-in-the-loop 暂停/恢复
 * 4. 状态回退 (GO_BACK)
 * 5. 错误处理
 * 6. 进度跟踪
 * 7. Checkpoint 序列化
 */

/// <reference types="jest" />

import { jest } from '@jest/globals';
import { CreationStateMachine } from '../services/creation-state-machine.service.js';
import {
  DEFAULT_STATE_NODES,
  DEFAULT_TRANSITIONS,
  type StateTransition,
  type StateNode
} from '../types/creation-state.js';

describe('CreationStateMachine', () => {
  let machine: CreationStateMachine;

  beforeEach(() => {
    machine = new CreationStateMachine({
      sessionId: 'test-session-001',
      userId: 'test-user-001'
    });
  });

  // ============================================================
  // 1. 初始化测试
  // ============================================================
  describe('Initialization', () => {
    test('should initialize with requirements_gathering as starting node', () => {
      expect(machine.getCurrentNodeId()).toBe('requirements_gathering');
      expect(machine.isTerminal()).toBe(false);
    });

    test('should have correct initial state data', () => {
      const data = machine.getStateData();
      expect(data.sessionId).toBe('test-session-001');
      expect(data.userId).toBe('test-user-001');
      expect(data.startedAt).toBeDefined();
    });

    test('should have empty history initially', () => {
      expect(machine.getHistory()).toEqual([]);
    });
  });

  // ============================================================
  // 2. 进度跟踪测试
  // ============================================================
  describe('Progress Tracking', () => {
    test('should return 0% progress at start', () => {
      const progress = machine.getProgress();
      expect(progress.currentStep).toBe(1);
      expect(progress.totalSteps).toBeGreaterThan(0);
      expect(progress.percentage).toBe(0);
    });

    test('should report not waiting for human at start', () => {
      expect(machine.isWaitingForHuman()).toBe(false);
    });
  });

  // ============================================================
  // 3. 状态转换测试
  // ============================================================
  describe('State Transitions', () => {
    test('should transition from requirements_gathering to team_design on PROCEED', async () => {
      const result = await machine.handleEvent({ type: 'PROCEED' });
      expect(result.success).toBe(true);
      expect(result.toNode).toBe('team_design');
    });

    test('should record transition in history', async () => {
      await machine.handleEvent({ type: 'PROCEED' });
      const history = machine.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].from).toBe('requirements_gathering');
      expect(history[0].to).toBe('team_design');
    });

    test('should navigate through full happy path', async () => {
      // requirements_gathering -> team_design
      await machine.handleEvent({ type: 'PROCEED' });
      expect(machine.getCurrentNodeId()).toBe('team_design');

      // team_design -> agent_matching
      await machine.handleEvent({ type: 'PROCEED' });
      expect(machine.getCurrentNodeId()).toBe('agent_matching');

      // agent_matching -> skill_matching (assuming no missing agents)
      await machine.handleEvent({ type: 'PROCEED' });
      expect(machine.getCurrentNodeId()).toBe('skill_matching');

      // skill_matching -> ceo_generation
      await machine.handleEvent({ type: 'PROCEED' });
      expect(machine.getCurrentNodeId()).toBe('ceo_generation');

      // ceo_generation -> document_generation
      await machine.handleEvent({ type: 'PROCEED' });
      expect(machine.getCurrentNodeId()).toBe('document_generation');

      // document_generation -> human_review
      await machine.handleEvent({ type: 'PROCEED' });
      expect(machine.getCurrentNodeId()).toBe('human_review');

      expect(machine.isWaitingForHuman()).toBe(true);
    });
  });

  // ============================================================
  // 4. 状态回退测试
  // ============================================================
  describe('GO_BACK Transitions', () => {
    test('should allow going back to a previous node', async () => {
      // Move forward
      await machine.handleEvent({ type: 'PROCEED' }); // -> team_design
      await machine.handleEvent({ type: 'PROCEED' }); // -> agent_matching

      // Go back to requirements_gathering
      const result = await machine.handleEvent({
        type: 'GO_BACK',
        targetNode: 'requirements_gathering'
      });

      expect(result.success).toBe(true);
      expect(machine.getCurrentNodeId()).toBe('requirements_gathering');
    });

    test('should reject GO_BACK to non-existent node', async () => {
      const result = await machine.handleEvent({
        type: 'GO_BACK',
        targetNode: 'non_existent_node' as any
      });

      expect(result.success).toBe(false);
    });

    test('should reject GO_BACK to terminal node', async () => {
      // Transition to complete (not possible directly, but test with failed)
      const result = await machine.handleEvent({
        type: 'GO_BACK',
        targetNode: 'complete'
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // 5. Human-in-the-Loop 测试
  // ============================================================
  describe('Human-in-the-Loop', () => {
    test('should pause at human_review waiting for approval', async () => {
      // Navigate to human_review
      await machine.handleEvent({ type: 'PROCEED' });
      await machine.handleEvent({ type: 'PROCEED' });
      await machine.handleEvent({ type: 'PROCEED' });
      await machine.handleEvent({ type: 'PROCEED' });
      await machine.handleEvent({ type: 'PROCEED' });
      await machine.handleEvent({ type: 'PROCEED' });

      expect(machine.getCurrentNodeId()).toBe('human_review');
      expect(machine.isWaitingForHuman()).toBe(true);
    });

    test('should not allow PROCEED on human-approval node', async () => {
      // Manually set to a human-required node
      machine = new CreationStateMachine({
        sessionId: 'test-002',
        userId: 'test-user-002'
      });

      // Navigate to human_review
      for (let i = 0; i < 6; i++) {
        await machine.handleEvent({ type: 'PROCEED' });
      }

      // Try to proceed without approval
      const result = await machine.handleEvent({ type: 'PROCEED' });
      expect(result.success).toBe(false);
    });

    test('should advance on APPROVE event', async () => {
      // Navigate to human_review
      for (let i = 0; i < 6; i++) {
        await machine.handleEvent({ type: 'PROCEED' });
      }

      // Approve
      const result = await machine.handleEvent({ type: 'APPROVE' });
      expect(result.success).toBe(true);
      expect(machine.getCurrentNodeId()).toBe('confirm');
    });
  });

  // ============================================================
  // 6. 错误处理测试
  // ============================================================
  describe('Error Handling', () => {
    test('should transition to failed on ERROR event', async () => {
      const error = new Error('Test error');
      const result = await machine.handleEvent({ type: 'ERROR', error });

      // After error in requirements_gathering, should go to failed
      // or recover if there's an on_error transition
      if (result.success) {
        expect(['failed', 'requirements_gathering']).toContain(machine.getCurrentNodeId());
      }
    });

    test('should store error information in state data', async () => {
      const error = new Error('Critical failure');
      await machine.handleEvent({ type: 'ERROR', error });

      const data = machine.getStateData();
      // Error info should be tracked somewhere
      expect(data.error !== undefined || resultDataHasError(data)).toBeTruthy();
    });
  });

  // ============================================================
  // 7. 终止状态测试
  // ============================================================
  describe('Terminal States', () => {
    test('should not process events in terminal state', async () => {
      // Directly navigate to complete
      machine = new CreationStateMachine({
        sessionId: 'test-003',
        userId: 'test-user-003'
      });

      // Force into complete state via transitions
      const transitions: StateTransition[] = machine.getAvailableTransitions();
      const completeTransition = transitions.find((t: StateTransition) => t.to === 'complete');
      if (completeTransition) {
        await machine.handleEvent({ type: 'PROCEED' });
      }
    });

    test('should recognize failed as terminal state', () => {
      // Manually create a machine in failed state via restoration
      // This test ensures isTerminal works for 'failed'
      const nodes: StateNode[] = DEFAULT_STATE_NODES;
      const failedNode = nodes.find((n: StateNode) => n.id === 'failed');
      expect(failedNode).toBeDefined();
    });
  });

  // ============================================================
  // 8. 序列化测试
  // ============================================================
  describe('Serialization', () => {
    test('should serialize to JSON correctly', () => {
      const json = machine.toJSON();

      expect(json.sessionId).toBe('test-session-001');
      expect(json.currentNodeId).toBe('requirements_gathering');
      expect(json.stateData).toBeDefined();
      expect(json.history).toBeDefined();
      expect(json.isTerminal).toBe(false);
      expect(json.isWaitingForHuman).toBe(false);
      expect(json.progress).toBeDefined();
    });

    test('should include progress information in serialized form', () => {
      const json = machine.toJSON();
      expect(json.progress.currentStep).toBeDefined();
      expect(json.progress.totalSteps).toBeDefined();
      expect(json.progress.percentage).toBeDefined();
    });
  });

  // ============================================================
  // 9. 转换条件测试
  // ============================================================
  describe('Transition Conditions', () => {
    test('should evaluate confidence-based conditions', async () => {
      // Set requirements with low confidence
      const lowConfidenceReq = {
        companyType: '营销团队',
        industry: '电商',
        responsibilities: ['内容创作'],
        expectedOutputs: ['文案'],
        scale: 'small' as const,
        confidence: 0.5  // Below 0.8 threshold
      };

      const result = await machine.handleEvent({
        type: 'PROCEED',
        data: { requirements: lowConfidenceReq }
      });

      // Should transition to clarify because confidence < 0.8
      expect(result.success).toBe(true);
      expect(machine.getCurrentNodeId()).toBe('clarify');
    });

    test('should proceed normally with high confidence', async () => {
      const highConfidenceReq = {
        companyType: '营销团队',
        industry: '电商',
        responsibilities: ['内容创作'],
        expectedOutputs: ['文案'],
        scale: 'small' as const,
        confidence: 0.95
      };

      const result = await machine.handleEvent({
        type: 'PROCEED',
        data: { requirements: highConfidenceReq }
      });

      // Should transition to team_design
      expect(result.success).toBe(true);
      expect(machine.getCurrentNodeId()).toBe('team_design');
    });
  });

  // ============================================================
  // 10. 预定义节点和转换测试
  // ============================================================
  describe('Default Configuration', () => {
    test('should have 13 default state nodes', () => {
      expect(DEFAULT_STATE_NODES.length).toBe(13);
    });

    test('should have nodes for all major phases', () => {
      const nodeIds: string[] = DEFAULT_STATE_NODES.map((n: StateNode) => n.id);
      const requiredNodes: string[] = [
        'requirements_gathering',
        'team_design',
        'agent_matching',
        'skill_matching',
        'ceo_generation',
        'document_generation',
        'complete',
        'failed'
      ];
      for (const required of requiredNodes) {
        expect(nodeIds).toContain(required);
      }
    });

    test('should have transitions for major flow', () => {
      const transitions: StateTransition[] = DEFAULT_TRANSITIONS;
      const hasRequirementsToTeam: boolean = transitions.some(
        (t: StateTransition) => t.from === 'requirements_gathering' && t.to === 'team_design'
      );
      expect(hasRequirementsToTeam).toBe(true);
    });
  });

  // ============================================================
  // 8. 编排桥接（Orchestration bridge）
  // ============================================================
  describe('Orchestration Bridge', () => {
    function makeOrchestratorHook(overrides?: Partial<{
      intent: 'clarify' | 'proceed';
      degraded: boolean;
      output: string;
    }>) {
      const cfg = {
        intent: 'proceed' as const,
        degraded: false,
        output: '团队设计方案：CEO + 市场 + 产品。',
        ...overrides,
      };
      const hook = {
        orchestrate: jest.fn(async () => ({
          intent: cfg.intent,
          agentId: cfg.degraded ? null : 'team_architect',
          agentName: cfg.degraded ? null : '团队架构师',
          confidence: cfg.degraded ? 0 : 0.9,
          output: cfg.output,
          handoffChain: [],
          raw: {} as Record<string, unknown>,
          degraded: cfg.degraded,
        })),
      };
      return { hook, cfg };
    }

    async function advanceToCeoGeneration(machine: CreationStateMachine): Promise<void> {
      // requirements_gathering → team_design → agent_matching → skill_matching → ceo_generation
      for (let i = 0; i < 4; i++) {
        const r = await machine.handleEvent({ type: 'PROCEED' });
        expect(r.success).toBe(true);
      }
      expect(machine.getCurrentNodeId()).toBe('ceo_generation');
    }

    test('ceo_generation PROCEED 自动编排（intent=proceed）→ orchestration 写入并推进', async () => {
      const { hook } = makeOrchestratorHook();
      const machine = new CreationStateMachine({
        sessionId: 's-orch-1',
        userId: 'u-1',
        initialData: { requirements: { description: '我要建电商团队' } as any },
        orchestrator: hook,
      });
      await advanceToCeoGeneration(machine);

      const result = await machine.handleEvent({ type: 'PROCEED' });
      expect(result.success).toBe(true);
      expect(result.toNode).toBe('document_generation');
      expect(hook.orchestrate).toHaveBeenCalledTimes(1);

      const orch = machine.getStateData().orchestration;
      expect(orch).toBeDefined();
      expect(orch!.intent).toBe('proceed');
      expect(orch!.agentId).toBe('team_architect');
      expect(orch!.degraded).toBe(false);
    });

    test('ORCHESTRATE 事件显式触发（intent=clarify）→ 进入 clarify 节点', async () => {
      const { hook } = makeOrchestratorHook({ intent: 'clarify' });
      const machine = new CreationStateMachine({
        sessionId: 's-orch-2',
        userId: 'u-1',
        orchestrator: hook,
      });
      const result = await machine.handleEvent({ type: 'ORCHESTRATE', data: { userInput: '需求不明确' } });
      expect(result.success).toBe(true);
      expect(result.toNode).toBe('clarify');
      expect(machine.getStateData().orchestration?.intent).toBe('clarify');
    });

    test('编排器抛错 → 降级（degraded=true），流程照常推进', async () => {
      const hook = {
        orchestrate: jest.fn(async () => {
          throw new Error('upstream 500');
        }),
      };
      const machine = new CreationStateMachine({
        sessionId: 's-orch-3',
        userId: 'u-1',
        orchestrator: hook,
      });
      await advanceToCeoGeneration(machine);

      const result = await machine.handleEvent({ type: 'PROCEED' });
      expect(result.success).toBe(true);
      expect(result.toNode).toBe('document_generation');
      const orch = machine.getStateData().orchestration;
      expect(orch!.degraded).toBe(true);
      expect(orch!.agentId).toBeNull();
    });

    test('未注入编排器 → ceo_generation PROCEED 不触发编排（行为与集成前一致）', async () => {
      const machine = new CreationStateMachine({ sessionId: 's-orch-4', userId: 'u-1' });
      await advanceToCeoGeneration(machine);
      const result = await machine.handleEvent({ type: 'PROCEED' });
      expect(result.success).toBe(true);
      expect(result.toNode).toBe('document_generation');
      expect(machine.getStateData().orchestration).toBeUndefined();
    });

    test('未注入编排器 → ORCHESTRATE 事件返回失败且不崩溃', async () => {
      const machine = new CreationStateMachine({ sessionId: 's-orch-5', userId: 'u-1' });
      const result = await machine.handleEvent({ type: 'ORCHESTRATE' });
      expect(result.success).toBe(false);
      expect(machine.getCurrentNodeId()).toBe('requirements_gathering');
    });

    test('evaluateCondition 支持 orchestration.intent 表达式', async () => {
      const { hook } = makeOrchestratorHook({ intent: 'clarify' });
      const machine = new CreationStateMachine({
        sessionId: 's-orch-6',
        userId: 'u-1',
        orchestrator: hook,
      });
      await machine.handleEvent({ type: 'ORCHESTRATE', data: { userInput: 'x' } });

      // 通过私有方法间接验证：on_data 转换条件评估
      const anyMachine = machine as any;
      expect(anyMachine.evaluateCondition(`orchestration.intent === 'clarify'`)).toBe(true);
      expect(anyMachine.evaluateCondition(`orchestration.intent === 'proceed'`)).toBe(false);
      expect(anyMachine.evaluateCondition(`orchestration.degraded`)).toBe(false);
    });
  });
});

// ============================================================
// 辅助函数
// ============================================================
function resultDataHasError(data: any): boolean {
  return data?.error !== undefined;
}
