/**
 * Hermes-Style Leader Agent
 *
 * 对齐 Hermes Agent 的"自进化单体"设计哲学：
 * - 极简核心循环（< 10 行运行时）
 * - 四层内存：L1 JSONL 轨迹 + L2 定时任务 + L3 矢量索引 + L4 反思摘要
 * - 事件溯源 + Saga 补偿
 * - Skill 系统路由（SKILL.md）
 *
 * 与原 leader-agent.js 的核心差异：
 * 1. 通过 LeaderSkillRouter 而不是硬编码模板匹配
 * 2. 自动注入 L4 反思到 system prompt
 * 3. 每次决策都落 L1 轨迹
 * 4. 失败时触发 L4 反思创建
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md
 *
 * 与 nvwax-server 的集成：
 * - 本服务（skillhub-workflow）保留旧 Leader Agent 用于兜底
 * - nvwax-server 现在走新的 LeaderSkillRouter + HermesStyleLeaderAgent
 * - 本文件作为前端 / CLI / 内部调用入口
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';

// ============================================================
// 配置
// ============================================================

const LEADER_BACKEND_URL = process.env.LEADER_BACKEND_URL || 'http://localhost:3001';
const NVWAX_SERVER_URL = process.env.NVWAX_SERVER_URL || 'http://localhost:3001';

const LLM_CONFIG = {
  modelName: process.env.LEADER_MODEL || 'deepseek-v4-flash',
  temperature: 0.3,
  openAIApiKey: process.env.DEEPSEEK_API_KEY || 'mock-key',
  configuration: {
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  }
};

// ============================================================
// Hermes Style Leader Agent
// ============================================================

export class HermesStyleLeaderAgent {
  constructor(options = {}) {
    this.llm = options.llm || new ChatOpenAI(LLM_CONFIG);
    this.backendUrl = options.backendUrl || LEADER_BACKEND_URL;
    this.useRemoteRouter = options.useRemoteRouter !== false; // 默认远程调用 nvwax-server 的 LeaderSkillRouter
  }

  /**
   * 核心循环：orchestrate
   * 设计目标：让循环尽可能小（< 10 行运行时），其余都是反思层
   *
   * @param {Object} params
   * @param {string} params.requirement - 用户需求描述
   * @param {string} params.sessionId - 会话 ID（用于轨迹）
   * @param {string} params.userId - 用户 ID
   * @param {Object} params.teamContext - 团队上下文
   * @returns {Promise<Object>} 编排结果
   */
  async orchestrate({ requirement, sessionId, userId, teamContext = {} }) {
    console.log('\n🎯 [HermesLeader] Starting orchestrate');
    console.log(`   requirement: ${requirement.substring(0, 80)}...`);
    console.log(`   sessionId: ${sessionId}`);

    // === 1. 感知：从后端路由召回候选 leader skills + 反思 ===
    const [routingResult, reflections] = await Promise.all([
      this.callBackend('/api/leader-skills/route', {
        requirement,
        topK: 5,
        useLLMReranking: true,
        userId
      }).catch(err => ({ matches: [], totalCandidates: 0, reflectionsUsed: 0, llmReranked: false })),
      this.callBackend('/api/leader-reflections/recall', {
        requirement,
        topK: 5
      }).catch(err => [])
    ]);

    const candidates = routingResult.matches || [];
    console.log(`   📋 Candidates: ${candidates.length} (llmReranked: ${routingResult.llmReranked})`);
    console.log(`   📝 Reflections: ${(reflections || []).length}`);

    // === 2. 推理：构造 system prompt（注入反思 + 团队上下文）===
    const systemPrompt = this.buildSystemPrompt(candidates, reflections, teamContext);

    // === 3. 执行：调用 LLM 编排 ===
    const startTime = Date.now();
    const response = await this.llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`需求：${requirement}\n\n请作为团队 Leader，输出你的领导决策与协调方案。`)
    ]).catch(err => {
      console.error('[HermesLeader] LLM invoke failed:', err.message);
      return { content: this.fallbackResponse(requirement, candidates), _error: err.message };
    });
    const latency = Date.now() - startTime;

    // === 4. 落地：记录轨迹 + 事件 ===
    const result = {
      leaderDecision: response.content,
      selectedSkillId: candidates[0]?.skill?.skillId,
      selectedSkillName: candidates[0]?.skill?.name,
      matchScore: candidates[0]?.finalScore,
      matchReason: candidates[0]?.matchReason,
      reflectionsUsed: routingResult.reflectionsUsed,
      candidates: candidates.slice(0, 3).map(m => ({
        skillId: m.skill?.skillId,
        name: m.skill?.name,
        score: m.finalScore,
        reason: m.matchReason
      })),
      latencyMs: latency,
      timestamp: new Date().toISOString()
    };

    // 异步写轨迹（不影响主流程）
    this.callBackend('/api/leader-trajectories/append', {
      sessionId,
      role: 'assistant',
      content: response.content,
      leaderSkillId: result.selectedSkillId,
      purpose: 'orchestration',
      tokensUsed: response._lc_kwargs?.usage?.total_tokens,
      model: LLM_CONFIG.modelName,
      latencyMs: latency
    }).catch(err => console.warn('[HermesLeader] Failed to append trajectory:', err.message));

    console.log(`✅ [HermesLeader] Completed in ${latency}ms`);
    return result;
  }

  /**
   * 构造 system prompt：注入候选 skills + 反思 + 团队上下文
   */
  buildSystemPrompt(candidates, reflections, teamContext) {
    const sections = [];

    // 候选 leader skills
    if (candidates && candidates.length > 0) {
      const candidateBlock = candidates.map((m, i) => {
        const s = m.skill;
        return `${i + 1}. **${s.name}** (${s.category}, 匹配分: ${(m.finalScore * 100).toFixed(1)}%)
   - 职责: ${(s.responsibilities || []).slice(0, 3).join('、')}
   - 管理风格: ${s.managementStyle || '灵活'}
   - 匹配理由: ${m.matchReason}`;
      }).join('\n\n');

      sections.push(`## 候选 Leader Skills\n${candidateBlock}`);
    }

    // 反思经验
    if (reflections && reflections.length > 0) {
      const reflectionBlock = reflections.map((r, i) =>
        `${i + 1}. ${r.failurePattern ? `[${r.failurePattern}]` : '[经验]'} ${r.summary}` +
        (r.improvementSuggestion ? `\n   💡 ${r.improvementSuggestion}` : '')
      ).join('\n');
      sections.push(`## 📝 历史反思经验（请务必遵守）\n${reflectionBlock}`);
    }

    // 团队上下文
    if (teamContext && Object.keys(teamContext).length > 0) {
      const ctxLines = Object.entries(teamContext).map(([k, v]) => `- **${k}**: ${v}`);
      sections.push(`## 🎯 团队上下文\n${ctxLines.join('\n')}`);
    }

    // 顶部角色设定
    const header = `你是 Nvwax 多 Agent 团队的 Leader，负责协调团队成员完成用户需求。

【你的使命】
1. 基于候选 Leader Skills 中最匹配的一个，扮演该 Leader 角色
2. 应用历史反思经验，避免重复过去的错误
3. 输出专业的领导决策、协调方案、任务分配建议
4. 保持简洁、可执行、有数据支撑`;

    return [header, ...sections].join('\n\n');
  }

  /**
   * 降级响应（LLM 失败时使用）
   */
  fallbackResponse(requirement, candidates) {
    const topSkill = candidates[0]?.skill;
    if (topSkill) {
      return `基于需求 "${requirement}"，我推荐使用 **${topSkill.name}** 作为团队 Leader。

核心职责：${(topSkill.responsibilities || []).slice(0, 3).join('、')}

管理风格：${topSkill.managementStyle || '灵活适应'}

请确认此选择，或调整需求后重试。`;
    }
    return `已收到需求 "${requirement}"。当前无可用 Leader Skill 匹配，请补充需求描述或人工指定团队类型。`;
  }

  /**
   * 调用后端 API（带超时和降级）
   */
  async callBackend(path, body, timeoutMs = 3000) {
    const url = `${this.backendUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Backend ${path} failed: ${response.status}`);
      }
      const data = await response.json();
      return data.success !== false ? data.data : (data.data || []);
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  }

  /**
   * 记录一次成功执行（用于更新 skill 成功率）
   */
  async recordSuccess(skillId, sessionId) {
    return this.callBackend(`/api/leader-skills/${skillId}/record-usage`, { success: true, sessionId }, 2000)
      .catch(err => console.warn('[HermesLeader] recordSuccess failed:', err.message));
  }

  /**
   * 记录一次失败，并触发反思创建
   */
  async recordFailure(skillId, sessionId, requirement, failurePattern, summary) {
    return this.callBackend(`/api/leader-skills/${skillId}/record-usage`, { success: false, sessionId }, 2000)
      .catch(err => console.warn('[HermesLeader] recordFailure (usage) failed:', err.message));

    return this.callBackend('/api/leader-reflections', {
      sessionId,
      leaderSkillId: skillId,
      requirement,
      summary,
      failurePattern,
      successScore: 0.2,
      tags: [failurePattern].filter(Boolean)
    }, 2000).catch(err => console.warn('[HermesLeader] recordFailure (reflection) failed:', err.message));
  }
}

// 导出单例
export const hermesLeaderAgent = new HermesStyleLeaderAgent();