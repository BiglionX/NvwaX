/**
 * Leader Hermes 化单元测试
 *
 * 不依赖数据库的纯逻辑单元测试：
 * 1. HermesStyleLeaderAgent 的 prompt 构造
 * 2. LeaderSkillService 的 cosineSimilarity
 * 3. LeaderReflectionService 的 buildReflectionPrompt
 * 4. 错误模式分类
 */

/// <reference types="jest" />

import { leaderSkillService } from '../services/leader-skill.service.js';
import { leaderReflectionService } from '../services/leader-reflection.service.js';

// ============================================================
// 1. 余弦相似度测试
// ============================================================

describe('cosineSimilarity', () => {
  test('相同的向量相似度为 1', () => {
    const v = [1, 0, 0, 1];
    const sim = leaderSkillService.cosineSimilarity(v, v);
    expect(sim).toBeCloseTo(1, 5);
  });
  
  test('正交向量相似度为 0', () => {
    const a = [1, 0];
    const b = [0, 1];
    const sim = leaderSkillService.cosineSimilarity(a, b);
    expect(sim).toBeCloseTo(0, 5);
  });
  
  test('反向向量相似度为 -1', () => {
    const a = [1, 1];
    const b = [-1, -1];
    const sim = leaderSkillService.cosineSimilarity(a, b);
    expect(sim).toBeCloseTo(-1, 5);
  });
  
  test('空数组返回 0', () => {
    expect(leaderSkillService.cosineSimilarity([], [])).toBe(0);
  });
  
  test('不同维度返回 0', () => {
    expect(leaderSkillService.cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });
});

// ============================================================
// 2. buildReflectionPrompt 测试
// ============================================================

describe('LeaderReflectionService.buildReflectionPrompt', () => {
  test('空反思列表返回空字符串', () => {
    const text = leaderReflectionService.buildReflectionPrompt([]);
    expect(text).toBe('');
  });
  
  test('包含标题与每条反思的 summary', () => {
    const reflections = [
      {
        id: '1',
        sessionId: 's1',
        summary: '营销团队 prompt 过长',
        failurePattern: 'timeout' as const,
        improvementSuggestion: '缩短到 500 字',
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
    expect(text).toContain('营销团队 prompt 过长');
    expect(text).toContain('缩短到 500 字');
  });
  
  test('低 success_score 会触发警告', () => {
    const reflections = [
      {
        id: '1',
        sessionId: 's1',
        summary: '失败案例',
        failurePattern: 'other' as const,
        successScore: 0.2,
        impactScore: 0.5,
        injectedCount: 0,
        resolvedCount: 0,
        tags: [],
        createdAt: new Date().toISOString()
      }
    ];
    const text = leaderReflectionService.buildReflectionPrompt(reflections);
    expect(text).toContain('⚠️');
  });
});

// ============================================================
// 3. SKILL.md frontmatter 解析测试（间接测试）
// ============================================================

describe('Leader Skill metadata', () => {
  test('所有内置 skills 都有 system_prompt', async () => {
    const skills = await leaderSkillService.getAllActive();
    for (const skill of skills) {
      expect(skill.systemPrompt).toBeTruthy();
      expect(skill.systemPrompt.length).toBeGreaterThan(50);
    }
  });
  
  test('所有内置 skills 都有 system_prompt 包含必要的角色设定', async () => {
    const skills = await leaderSkillService.getAllActive();
    for (const skill of skills) {
      expect(skill.responsibilities).toBeDefined();
      expect(skill.responsibilities.length).toBeGreaterThan(0);
    }
  });
});