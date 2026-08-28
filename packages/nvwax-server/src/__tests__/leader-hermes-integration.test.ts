/**
 * Leader Agent Hermes 化 P0 集成测试
 *
 * 验证以下核心能力：
 * 1. LeaderSkillService CRUD
 * 2. LeaderSkillRouter 三段式召回（关键词+语义+LLM）
 * 3. LeaderReflectionService 反思创建+召回
 * 4. LeaderTrajectoryService L1 轨迹追加+查询
 * 5. 端到端：用户需求 → 路由 → 反思注入 → 团队配置生成
 *
 * 设计参考：
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §7
 */

/// <reference types="jest" />

import { leaderSkillService, LeaderSkill } from '../services/leader-skill.service.js';
import { leaderSkillRouter } from '../services/leader-router.service.js';
import { leaderReflectionService } from '../services/leader-reflection.service.js';
import { leaderTrajectoryService } from '../services/leader-trajectory.service.js';

// ============================================================
// 1. LeaderSkillService 测试
// ============================================================

describe('LeaderSkillService', () => {
  test('能列出所有内置 skills（迁移脚本应至少插入 6 个）', async () => {
    const skills = await leaderSkillService.getAllActive();
    expect(skills.length).toBeGreaterThanOrEqual(6);
    
    const skillIds = skills.map(s => s.skillId);
    expect(skillIds).toContain('marketing-director-v1');
    expect(skillIds).toContain('tech-lead-v1');
    expect(skillIds).toContain('creative-director-v1');
    expect(skillIds).toContain('customer-service-lead-v1');
    expect(skillIds).toContain('data-analyst-lead-v1');
    expect(skillIds).toContain('project-manager-v1');
  });

  test('marketing-director-v1 应有正确的 triggers', async () => {
    const skill = await leaderSkillService.getBySkillId('marketing-director-v1');
    expect(skill).toBeTruthy();
    expect(skill?.name).toBe('营销总监');
    expect(skill?.category).toBe('marketing');
    expect(skill?.triggers).toContain('营销');
    expect(skill?.triggers).toContain('marketing');
    expect(skill?.triggers).toContain('种草');
    expect(skill?.triggersEmbedding).toBeDefined();
    expect(skill?.triggersEmbedding?.length).toBeGreaterThan(0);
  });

  test('按 category 过滤', async () => {
    const marketingSkills = await leaderSkillService.getByCategory('marketing');
    expect(marketingSkills.length).toBeGreaterThan(0);
    marketingSkills.forEach(s => {
      expect(s.category).toBe('marketing');
    });
  });

  test('recordUsage 能更新统计', async () => {
    const before = await leaderSkillService.getBySkillId('tech-lead-v1');
    const beforeCount = before?.usageCount || 0;
    
    await leaderSkillService.recordUsage('tech-lead-v1', true);
    
    const after = await leaderSkillService.getBySkillId('tech-lead-v1');
    expect(after?.usageCount).toBe(beforeCount + 1);
    expect(after?.successCount).toBeGreaterThan(before?.successCount || 0);
  });
});

// ============================================================
// 2. LeaderSkillRouter 三段式路由测试
// ============================================================

describe('LeaderSkillRouter', () => {
  test('关键词命中："小红书种草" 应路由到 marketing', async () => {
    const result = await leaderSkillRouter.route('我想做小红书种草内容营销', {
      topK: 3,
      useLLMReranking: false  // 跳过 LLM 加快测试
    });
    
    expect(result.matches.length).toBeGreaterThan(0);
    const top = result.matches[0];
    expect(top.skill.category).toBe('marketing');
    expect(top.keywordScore).toBeGreaterThan(0);
    expect(top.finalScore).toBeGreaterThan(0);
  });

  test('关键词命中："开发 API" 应路由到 tech-lead', async () => {
    const result = await leaderSkillRouter.route('我需要开发一个 RESTful API', {
      topK: 3,
      useLLMReranking: false
    });
    
    const techMatch = result.matches.find(m => m.skill.skillId === 'tech-lead-v1');
    expect(techMatch).toBeTruthy();
    expect(techMatch?.keywordScore).toBeGreaterThan(0);
  });

  test('关键词命中："设计海报" 应路由到 creative-director', async () => {
    const result = await leaderSkillRouter.route('我要设计一组品牌海报', {
      topK: 3,
      useLLMReranking: false
    });
    
    const designMatch = result.matches.find(m => m.skill.skillId === 'creative-director-v1');
    expect(designMatch).toBeTruthy();
  });

  test('语义召回也能召回（不依赖关键词命中）', async () => {
    // 用同义词测试语义召回
    const result = await leaderSkillRouter.route('我想让品牌的声量变得更大', {
      topK: 3,
      useLLMReranking: false
    });
    
    // "声量" 不是直接 trigger，但语义上接近营销
    expect(result.matches.length).toBeGreaterThan(0);
    // 至少有一个结果有语义分
    const hasSemantic = result.matches.some(m => m.semanticScore > 0);
    expect(hasSemantic).toBe(true);
  });

  test('综合排序：营销相关需求应优先 marketing-director', async () => {
    const result = await leaderSkillRouter.route('小红书种草短视频运营', {
      topK: 3,
      useLLMReranking: false
    });
    
    expect(result.matches[0].skill.skillId).toBe('marketing-director-v1');
  });

  test('LLM 重排序（可选，本测试跳过以避免依赖 LLM）', async () => {
    const result = await leaderSkillRouter.route('客服咨询问题', {
      topK: 3,
      useLLMReranking: false  // 测试环境跳过 LLM
    });
    
    expect(result.llmReranked).toBe(false);
    expect(result.matches.length).toBeGreaterThan(0);
  });
});

// ============================================================
// 3. LeaderReflectionService 测试
// ============================================================

describe('LeaderReflectionService', () => {
  test('创建一条反思', async () => {
    const reflection = await leaderReflectionService.create({
      sessionId: 'test-session-' + Date.now(),
      summary: '营销团队配置生成失败：Schema validation error',
      failurePattern: 'low_quality',
      improvementSuggestion: '降低 maxTokens 并改用更简单的 schema',
      successScore: 0.2,
      tags: ['marketing', 'low_quality']
    });
    
    expect(reflection.id).toBeTruthy();
    expect(reflection.summary).toContain('营销团队');
    expect(reflection.failurePattern).toBe('low_quality');
  });

  test('按需求相似度召回反思', async () => {
    const sessionId = 'test-recall-' + Date.now();
    
    // 创建几个反思
    await leaderReflectionService.create({
      sessionId,
      summary: '小红书种草内容生成时 prompt 太长导致超时',
      failurePattern: 'timeout',
      successScore: 0.3,
      tags: ['xiaohongshu']
    });
    
    await leaderReflectionService.create({
      sessionId,
      summary: 'API 开发时 schema 过于复杂导致重试多次',
      failurePattern: 'low_quality',
      successScore: 0.4,
      tags: ['api']
    });
    
    // 召回：相似需求应能找到相关反思
    const reflections = await leaderReflectionService.recall('我想做小红书营销', 5);
    expect(reflections.length).toBeGreaterThan(0);
  });

  test('buildReflectionPrompt 生成可注入的文本', async () => {
    const reflections = [
      {
        id: '1',
        sessionId: 'test',
        summary: '营销团队配置时 prompt 太长',
        failurePattern: 'timeout' as const,
        successScore: 0.2,
        impactScore: 0.5,
        injectedCount: 0,
        resolvedCount: 0,
        tags: [],
        createdAt: new Date().toISOString()
      }
    ];
    
    const text = leaderReflectionService.buildReflectionPrompt(reflections);
    expect(text).toContain('历史反思经验');
    expect(text).toContain('营销团队配置');
    expect(text).toContain('[超时]');
  });
});

// ============================================================
// 4. LeaderTrajectoryService 测试
// ============================================================

describe('LeaderTrajectoryService', () => {
  test('追加单条轨迹', async () => {
    const sessionId = 'test-trajectory-' + Date.now();
    
    const entry = await leaderTrajectoryService.append(sessionId, 'user', '测试需求', {
      purpose: 'routing',
      tokensUsed: 100
    });
    
    expect(entry.id).toBeTruthy();
    expect(entry.role).toBe('user');
    expect(entry.content).toBe('测试需求');
  });

  test('查询 session 的轨迹', async () => {
    const sessionId = 'test-stats-' + Date.now();
    
    await leaderTrajectoryService.append(sessionId, 'system', 'system prompt', { purpose: 'generation' });
    await leaderTrajectoryService.append(sessionId, 'user', 'user message', { purpose: 'generation' });
    await leaderTrajectoryService.append(sessionId, 'assistant', 'assistant response', { purpose: 'generation', tokensUsed: 200 });
    
    const entries = await leaderTrajectoryService.getBySession(sessionId);
    expect(entries.length).toBe(3);
    
    const stats = await leaderTrajectoryService.getStats(sessionId);
    expect(stats.total).toBe(3);
    expect(stats.byRole.system).toBe(1);
    expect(stats.byRole.user).toBe(1);
    expect(stats.byRole.assistant).toBe(1);
    expect(stats.totalTokens).toBe(200);
  });
});

// ============================================================
// 5. 端到端集成测试
// ============================================================

describe('Leader Agent Hermes 化端到端', () => {
  test('完整流程：需求 → 路由 → 反思 → 团队配置', async () => {
    const sessionId = 'e2e-test-' + Date.now();
    
    // 1. 路由
    const routingResult = await leaderSkillRouter.route('为新产品做小红书种草内容营销', {
      topK: 3,
      useLLMReranking: false  // 测试环境跳过 LLM
    });
    expect(routingResult.matches[0].skill.skillId).toBe('marketing-director-v1');
    
    // 2. 写入轨迹
    await leaderTrajectoryService.append(sessionId, 'user', '为新产品做小红书种草内容营销', {
      purpose: 'routing'
    });
    await leaderTrajectoryService.append(sessionId, 'assistant', JSON.stringify(routingResult.matches[0]), {
      purpose: 'routing',
      tokensUsed: 50
    });
    
    // 3. 创建反思（模拟上次失败）
    await leaderReflectionService.create({
      sessionId: sessionId + '-reflection',
      summary: '上次生成营销团队配置时，prompt 太长导致 timeout',
      failurePattern: 'timeout',
      improvementSuggestion: '将需求描述限制在 500 字以内',
      successScore: 0.3,
      tags: ['marketing']
    });
    
    // 4. 召回反思（应该能找到刚才创建的）
    const reflections = await leaderReflectionService.recall('小红书营销', 5);
    expect(reflections.length).toBeGreaterThan(0);
    
    // 5. 验证系统状态
    const skills = await leaderSkillService.getAllActive();
    const marketingSkill = skills.find(s => s.skillId === 'marketing-director-v1');
    expect(marketingSkill).toBeTruthy();
    
    // 6. 记录成功使用
    await leaderSkillService.recordUsage('marketing-director-v1', true);
    const after = await leaderSkillService.getBySkillId('marketing-director-v1');
    expect(after?.successCount).toBeGreaterThan(0);
  }, 30000); // 30s 超时
});

// ============================================================
// 6. 性能测试
// ============================================================

describe('性能预算', () => {
  test('路由延迟应 < 500ms（无 LLM 重排序）', async () => {
    const start = Date.now();
    await leaderSkillRouter.route('测试需求', { topK: 5, useLLMReranking: false });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
  
  test('路由延迟应 < 3000ms（含 LLM 重排序）', async () => {
    const start = Date.now();
    await leaderSkillRouter.route('测试需求', { topK: 5, useLLMReranking: true });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  }, 10000);
});