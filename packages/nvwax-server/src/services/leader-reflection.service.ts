/**
 * Leader Reflection Service (L4 Memory)
 *
 * Leader Agent 的反思记忆层，对齐 Hermes Agent 的 L4 反思摘要设计。
 *
 * 核心职责：
 * 1. 反思 CRUD：创建、查询、标记已采纳
 * 2. 相似度召回：根据新需求召回历史反思（用 embedding 余弦相似度）
 * 3. Prompt 注入：把反思条目格式化为可注入 system prompt 的文本
 *
 * 反思触发时机：
 * - 用户显式反馈（差评/任务失败）
 * - 工作流执行成功率显著下降
 * - 定时任务：每 24h 触发一次全局反思
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md §1.1, §2.4
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §3.2
 */

import { Pool } from 'pg';
import { databaseService } from './database.service.js';

export interface LeaderReflection {
  id: string;
  sessionId: string;
  leaderSkillId?: string;
  requirementEmbedding?: number[];
  summary: string;
  failurePattern?: 'timeout' | 'skill_missing' | 'conflict' | 'low_quality' | 'wrong_team_type' | 'other';
  improvementSuggestion?: string;
  successScore: number;
  impactScore: number;
  injectedCount: number;
  resolvedCount: number;
  relatedEventSeq?: number;
  tags: string[];
  createdAt: string;
  expiresAt?: string;
}

export interface CreateReflectionInput {
  sessionId: string;
  leaderSkillId?: string;
  requirement: string;
  summary: string;
  failurePattern?: LeaderReflection['failurePattern'];
  improvementSuggestion?: string;
  successScore: number;
  impactScore?: number;
  relatedEventSeq?: number;
  tags?: string[];
  expiresAt?: Date;
}

export class LeaderReflectionService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  // ============================================================
  // 创建反思
  // ============================================================

  /**
   * 创建一条反思记录
   */
  async create(input: CreateReflectionInput): Promise<LeaderReflection> {
    console.log(`[LeaderReflection] Creating reflection for session ${input.sessionId}`);

    const requirementEmbedding = await this.embedText(input.requirement);

    const result = await this.pool.query(
      `INSERT INTO leader_reflections (
        session_id, leader_skill_id, requirement_embedding,
        summary, failure_pattern, improvement_suggestion,
        success_score, impact_score, related_event_seq, tags, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        input.sessionId,
        input.leaderSkillId || null,
        requirementEmbedding ? `{${requirementEmbedding.join(',')}}` : null,
        input.summary,
        input.failurePattern || null,
        input.improvementSuggestion || null,
        input.successScore,
        input.impactScore ?? 0.5,
        input.relatedEventSeq || null,
        JSON.stringify(input.tags || []),
        input.expiresAt || null
      ]
    );

    const reflection = this.rowToReflection(result.rows[0]);
    console.log(`[LeaderReflection] Created: ${reflection.id} (pattern=${reflection.failurePattern || 'general'})`);
    return reflection;
  }

  // ============================================================
  // 召回反思（注入 prompt 用）
  // ============================================================

  /**
   * 根据新需求召回相似的历史反思
   * 优先按 embedding 余弦相似度，再按 success_score，最后按 created_at
   */
  async recall(requirement: string, topK: number = 5): Promise<LeaderReflection[]> {
    const requirementEmbedding = await this.embedText(requirement);

    // 方案 1：基于 embedding 召回
    let semanticResults: any[] = [];
    if (requirementEmbedding) {
      try {
        const result = await this.pool.query(
          `SELECT *, (requirement_embedding IS NOT NULL) AS has_embedding
           FROM leader_reflections
           WHERE (expires_at IS NULL OR expires_at > NOW())
           ORDER BY created_at DESC
           LIMIT 100`,
          []
        );
        semanticResults = result.rows
          .filter(row => row.requirement_embedding)
          .map(row => ({
            row,
            similarity: this.cosineSimilarity(
              requirementEmbedding,
              typeof row.requirement_embedding === 'string'
                ? row.requirement_embedding.slice(1, -1).split(',').map(Number)
                : row.requirement_embedding
            )
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topK)
          .map(x => x.row);
      } catch (error) {
        console.warn('[LeaderReflection] Embedding recall failed:', (error as Error).message);
      }
    }

    // 方案 2：回退到最新 + 最痛（low score）排序
    if (semanticResults.length === 0) {
      const result = await this.pool.query(
        `SELECT * FROM leader_reflections
         WHERE (expires_at IS NULL OR expires_at > NOW())
         ORDER BY success_score ASC, created_at DESC
         LIMIT $1`,
        [topK]
      );
      semanticResults = result.rows;
    }

    // 触发计数 +1（表示这些反思被召回了）
    if (semanticResults.length > 0) {
      const ids = semanticResults.map(r => r.id);
      await this.pool.query(
        `UPDATE leader_reflections SET injected_count = injected_count + 1
         WHERE id = ANY($1::uuid[])`,
        [ids]
      );
    }

    return semanticResults.map(row => this.rowToReflection(row));
  }

  /**
   * 标记反思被采纳（即解决了同类问题）
   */
  async markResolved(reflectionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE leader_reflections SET resolved_count = resolved_count + 1 WHERE id = $1`,
      [reflectionId]
    );
  }

  /**
   * 列出反思（管理用）
   */
  async list(options: {
    sessionId?: string;
    leaderSkillId?: string;
    failurePattern?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: LeaderReflection[]; total: number }> {
    const conditions: string[] = ['(expires_at IS NULL OR expires_at > NOW())'];
    const params: any[] = [];
    let paramIdx = 1;

    if (options.sessionId) {
      conditions.push(`session_id = $${paramIdx++}`);
      params.push(options.sessionId);
    }
    if (options.leaderSkillId) {
      conditions.push(`leader_skill_id = $${paramIdx++}`);
      params.push(options.leaderSkillId);
    }
    if (options.failurePattern) {
      conditions.push(`failure_pattern = $${paramIdx++}`);
      params.push(options.failurePattern);
    }

    const whereClause = conditions.join(' AND ');
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const itemsResult = await this.pool.query(
      `SELECT * FROM leader_reflections WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    const totalResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM leader_reflections WHERE ${whereClause}`,
      params
    );

    return {
      items: itemsResult.rows.map(row => this.rowToReflection(row)),
      total: parseInt(totalResult.rows[0].count, 10)
    };
  }

  // ============================================================
  // Prompt 注入格式化
  // ============================================================

  /**
   * 把反思列表格式化为可注入 prompt 的文本
   * 这是核心：决定反思如何影响 leader 决策
   */
  buildReflectionPrompt(reflections: LeaderReflection[]): string {
    if (!reflections || reflections.length === 0) {
      return '';
    }

    const lines: string[] = ['## 📝 历史反思经验（请务必遵守）', ''];

    reflections.forEach((r, i) => {
      const patternLabel = r.failurePattern ? `[${this.translatePattern(r.failurePattern)}]` : '[经验]';
      lines.push(`${i + 1}. ${patternLabel} ${r.summary}`);
      if (r.improvementSuggestion) {
        lines.push(`   💡 建议: ${r.improvementSuggestion}`);
      }
      if (r.successScore < 0.5) {
        lines.push(`   ⚠️  原始任务成功率较低 (${(r.successScore * 100).toFixed(0)}%)，请格外注意`);
      }
    });

    return lines.join('\n');
  }

  /**
   * 翻译失败模式为中文
   */
  private translatePattern(pattern: string): string {
    const map: Record<string, string> = {
      'timeout': '超时',
      'skill_missing': '技能缺失',
      'conflict': '冲突',
      'low_quality': '质量不足',
      'wrong_team_type': '团队类型错误',
      'other': '其他'
    };
    return map[pattern] || pattern;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 数据库行映射为对象
   */
  private rowToReflection(row: any): LeaderReflection {
    return {
      id: row.id,
      sessionId: row.session_id,
      leaderSkillId: row.leader_skill_id,
      requirementEmbedding: row.requirement_embedding
        ? (typeof row.requirement_embedding === 'string'
          ? row.requirement_embedding.slice(1, -1).split(',').map(Number)
          : row.requirement_embedding)
        : undefined,
      summary: row.summary,
      failurePattern: row.failure_pattern,
      improvementSuggestion: row.improvement_suggestion,
      successScore: parseFloat(row.success_score),
      impactScore: parseFloat(row.impact_score || '0.5'),
      injectedCount: row.injected_count,
      resolvedCount: row.resolved_count,
      relatedEventSeq: row.related_event_seq,
      tags: this.parseJson(row.tags, []),
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      expiresAt: row.expires_at?.toISOString?.() || row.expires_at
    };
  }

  private parseJson<T>(value: unknown, defaultValue: T): T {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'object') return value as T;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  /**
   * Embedding（与 router 复用同一种本地方案）
   */
  private async embedText(text: string): Promise<number[] | null> {
    // 简化：本地 hash embedding（与 LeaderSkillService 一致）
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

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
  }
}

// 导出单例
export const leaderReflectionService = new LeaderReflectionService();