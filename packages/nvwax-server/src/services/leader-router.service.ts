/**
 * Leader Skill Router
 *
 * Leader Agent 的核心路由组件，对齐 Hermes Agent 的 Skill Router 设计。
 *
 * 三段式召回：
 * 1. 关键词召回：匹配 triggers 数组中的关键词（O(n) 字符串匹配）
 * 2. 语义召回：用 embedding 计算余弦相似度（Hermes L3 长期语义记忆）
 * 3. LLM 排序：注入 L4 反思经验，让 LLM 做最终排序
 *
 * 性能预算：
 * - 关键词召回：< 50ms
 * - 语义召回：< 200ms
 * - LLM 排序：< 2s（异步可选）
 * - 总计同步路径：< 300ms
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md §2.3
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §3.2
 */

import { leaderSkillService, LeaderSkill, LeaderSkillMatch } from './leader-skill.service.js';
import { leaderReflectionService } from './leader-reflection.service.js';
import { llmService } from './llm/llm.service.js';
import { databaseService } from './database.service.js';

export interface RouteOptions {
  topK?: number;
  category?: string;
  minScore?: number;
  useLLMReranking?: boolean;
  userId?: string;
}

export interface RouteResult {
  matches: LeaderSkillMatch[];
  totalCandidates: number;
  reflectionsUsed: number;
  llmReranked: boolean;
  latency: number;
}

export class LeaderSkillRouter {

  // ============================================================
  // 主路由方法
  // ============================================================

  /**
   * 三段式路由：关键词 → 语义 → LLM 排序
   */
  async route(requirement: string, options: RouteOptions = {}): Promise<RouteResult> {
    const startTime = Date.now();
    const topK = options.topK || 5;
    const minScore = options.minScore ?? 0.1;

    // 1. 关键词召回
    const keywordMatches = await this.keywordRoute(requirement, options.category);

    // 2. 语义召回
    const semanticMatches = await this.semanticRoute(requirement, keywordMatches, options.category);

    // 3. 合并去重（按 skillId）
    const merged = this.mergeMatches(keywordMatches, semanticMatches);

    // 4. 过滤低分
    const filtered = merged.filter(m => m.finalScore >= minScore);

    // 5. 按分数排序，取 topK
    filtered.sort((a, b) => b.finalScore - a.finalScore);
    const topMatches = filtered.slice(0, topK);

    // 6. LLM 排序（可选）
    let reflectionsUsed = 0;
    let llmReranked = false;
    if (options.useLLMReranking && topMatches.length > 1) {
      const reflections = await leaderReflectionService.recall(requirement, 5);
      reflectionsUsed = reflections.length;
      const reranked = await this.llmRerank(requirement, topMatches, reflections, options.userId);
      llmReranked = true;
      return {
        matches: reranked.slice(0, topK),
        totalCandidates: merged.length,
        reflectionsUsed,
        llmReranked,
        latency: Date.now() - startTime
      };
    }

    return {
      matches: topMatches,
      totalCandidates: merged.length,
      reflectionsUsed,
      llmReranked,
      latency: Date.now() - startTime
    };
  }

  /**
   * 路由并返回最匹配的单个 skill
   */
  async routeTopOne(requirement: string, options: RouteOptions = {}): Promise<LeaderSkill | null> {
    const result = await this.route(requirement, { ...options, topK: 1, useLLMReranking: true });
    return result.matches[0]?.skill || null;
  }

  // ============================================================
  // 段 1：关键词召回
  // ============================================================

  /**
   * 关键词匹配路由
   * 算法：对每个 skill，检查 triggers 中有多少个关键词出现在 requirement 中
   * 分数 = 命中数 / triggers 总数
   */
  private async keywordRoute(requirement: string, category?: string): Promise<LeaderSkillMatch[]> {
    const skills = category
      ? await leaderSkillService.getByCategory(category)
      : await leaderSkillService.getAllActive();

    const reqLower = requirement.toLowerCase();
    const reqWords = new Set(reqLower.split(/[\s,，、。；;！!？?\-\+\.]+/).filter(w => w.length > 1));

    const matches: LeaderSkillMatch[] = [];

    for (const skill of skills) {
      const triggers = skill.triggers.map(t => t.toLowerCase());
      let hitCount = 0;
      const hitWords: string[] = [];

      for (const trigger of triggers) {
        // 完整包含检查
        if (reqLower.includes(trigger)) {
          hitCount += 2; // 完整包含加权
          hitWords.push(trigger);
          continue;
        }
        // 单词级检查
        const triggerWords = trigger.split(/[\s,，、]+/).filter(w => w.length > 1);
        for (const tw of triggerWords) {
          if (reqWords.has(tw)) {
            hitCount += 1;
            if (!hitWords.includes(tw)) hitWords.push(tw);
          }
        }
      }

      if (hitCount > 0) {
        const keywordScore = Math.min(hitCount / Math.max(triggers.length, 3), 1);
        matches.push({
          skill,
          keywordScore,
          semanticScore: 0,
          finalScore: keywordScore,
          matchReason: `关键词命中: ${hitWords.join(', ')}`
        });
      }
    }

    return matches;
  }

  // ============================================================
  // 段 2：语义召回
  // ============================================================

  /**
   * 语义路由：用 embedding 余弦相似度
   * 复用关键词召回的 candidates，避免重复加载
   */
  private async semanticRoute(
    requirement: string,
    keywordMatches: LeaderSkillMatch[],
    category?: string
  ): Promise<LeaderSkillMatch[]> {
    // 如果关键词召回没有结果，回退到全量加载
    const candidateSkills = keywordMatches.length > 0
      ? keywordMatches.map(m => m.skill)
      : (category
        ? await leaderSkillService.getByCategory(category)
        : await leaderSkillService.getAllActive());

    if (candidateSkills.length === 0) {
      return [];
    }

    // 1. 为 requirement 生成 embedding（复用 service 内部的本地 hash 方案）
    const reqEmbedding = await this.embedText(requirement);

    // 2. 计算每个 skill 的语义相似度
    const matches: LeaderSkillMatch[] = [];
    for (const skill of candidateSkills) {
      if (!skill.triggersEmbedding || skill.triggersEmbedding.length === 0) continue;

      const similarity = leaderSkillService.cosineSimilarity(reqEmbedding, skill.triggersEmbedding);
      if (similarity > 0) {
        matches.push({
          skill,
          keywordScore: 0,
          semanticScore: similarity,
          finalScore: similarity,
          matchReason: `语义相似度: ${(similarity * 100).toFixed(1)}%`
        });
      }
    }

    return matches;
  }

  // ============================================================
  // 段 3：合并去重
  // ============================================================

  /**
   * 合并关键词和语义召回的结果
   * 同一 skillId 的两个匹配，合并分数 = 0.4 * keyword + 0.6 * semantic
   */
  private mergeMatches(keyword: LeaderSkillMatch[], semantic: LeaderSkillMatch[]): LeaderSkillMatch[] {
    const map = new Map<string, LeaderSkillMatch>();

    // 先放入语义结果作为基础（通常语义更可靠）
    for (const m of semantic) {
      map.set(m.skill.skillId, { ...m });
    }

    // 关键词结果合并
    for (const m of keyword) {
      const existing = map.get(m.skill.skillId);
      if (existing) {
        // 合并
        existing.keywordScore = m.keywordScore;
        existing.finalScore = 0.4 * m.keywordScore + 0.6 * existing.semanticScore;
        existing.matchReason = `${m.matchReason}; ${existing.matchReason}`;
      } else {
        map.set(m.skill.skillId, { ...m });
      }
    }

    return Array.from(map.values());
  }

  // ============================================================
  // 段 4：LLM 重排序（注入反思）
  // ============================================================

  /**
   * 用 LLM 对 top-K 候选做最终排序
   * 把 L4 反思经验注入到 system prompt
   */
  private async llmRerank(
    requirement: string,
    candidates: LeaderSkillMatch[],
    reflections: any[],
    userId?: string
  ): Promise<LeaderSkillMatch[]> {
    if (!llmService || candidates.length === 0) {
      return candidates;
    }

    // 构造 prompt
    const candidateList = candidates.map((m, i) =>
      `${i + 1}. ${m.skill.name} (${m.skill.category})\n` +
      `   描述: ${m.skill.description || m.skill.systemPrompt.substring(0, 100)}\n` +
      `   综合分: ${(m.finalScore * 100).toFixed(1)}`
    ).join('\n\n');

    const reflectionBlock = reflections.length > 0
      ? `\n\n## 历史反思经验（务必遵守）\n${reflections.map((r, i) =>
          `${i + 1}. ${r.summary}`
        ).join('\n')}`
      : '';

    const prompt = `你是 Leader Skill 路由专家。请根据用户需求，从以下候选 Leader Skill 中选出最合适的一个。

【用户需求】
${requirement}

【候选 Leader Skill】（按综合分排序）
${candidateList}
${reflectionBlock}

【任务】
请用 JSON 格式输出最匹配的下标（从 1 开始）和理由：
{
  "bestIndex": 1,
  "confidence": 0.85,
  "reason": "因为这个 skill 的 triggers 完全覆盖了用户需求中的关键词 X、Y，且其管理风格 Z 与用户场景匹配"
}

只返回 JSON，不要有其他文字。`;

    try {
      const response = await llmService.createCompletion({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: '你是 Leader Skill 路由专家，擅长从候选中选出最合适的。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        maxTokens: 300,
        purpose: 'reflection'
      });

      // 解析响应
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return candidates;

      const result = JSON.parse(jsonMatch[0]);
      const bestIdx = result.bestIndex - 1;

      if (bestIdx >= 0 && bestIdx < candidates.length) {
        // 给 LLM 选中的候选打高分
        const reranked = [...candidates];
        reranked[bestIdx].llmScore = result.confidence || 0.8;
        reranked[bestIdx].finalScore = 0.3 * reranked[bestIdx].keywordScore
                                      + 0.3 * reranked[bestIdx].semanticScore
                                      + 0.4 * (result.confidence || 0.8);
        reranked[bestIdx].matchReason = `LLM 选中（置信度 ${((result.confidence || 0.8) * 100).toFixed(0)}%）: ${result.reason || ''}`;

        // 重新排序
        reranked.sort((a, b) => b.finalScore - a.finalScore);
        return reranked;
      }
    } catch (error) {
      console.warn('[LeaderSkillRouter] LLM rerank failed, using heuristic ranking:', (error as Error).message);
    }

    return candidates;
  }

  // ============================================================
  // Embedding 生成（内部）
  // ============================================================

  /**
   * 为任意文本生成 embedding
   * 这里直接复用 LeaderSkillService 的本地方案
   * 实际生产应该走 OpenAI API
   */
  private async embedText(text: string): Promise<number[]> {
    // 简化：用本地 hash embedding
    // 真实场景应通过 LeaderSkillService 注入 embedding 模型
    const vec = new Array(384).fill(0);
    const tokens = text.toLowerCase().split(/[\s,，、。；;！!？?\-\+\.]+/).filter(t => t.length > 0);

    for (const token of tokens) {
      for (let i = 0; i < 3; i++) {
        const hash = this.simpleHash(token + i);
        const idx = Math.abs(hash) % 384;
        const sign = hash % 2 === 0 ? 1 : -1;
        vec[idx] += sign * 0.1;
      }
    }

    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  }

  private simpleHash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & 0xFFFFFFFF;
    }
    return hash;
  }
}

// 导出单例
export const leaderSkillRouter = new LeaderSkillRouter();