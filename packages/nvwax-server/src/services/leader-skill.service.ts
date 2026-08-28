/**
 * Leader Skill Service
 *
 * Leader Agent 的 Skill 注册表，对齐 Hermes Agent 的 SKILL.md 规范。
 *
 * 核心职责：
 * 1. CRUD：创建、读取、更新、删除 Leader Skill
 * 2. 缓存：内存缓存加速查询
 * 3. 同步：与 skillhub-workflow/src/skills/leader-skills/ 目录下的 SKILL.md 文件同步
 * 4. Embedding：自动为 triggers 生成 embedding 向量
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §2.2
 */

import { Pool } from 'pg';
import { databaseService } from './database.service.js';

// ============================================================
// 类型定义
// ============================================================

export interface LeaderSkill {
  id: string;
  skillId: string;
  name: string;
  category: string;
  version: string;
  triggers: string[];
  triggersEmbedding?: number[];
  toolsRequired: string[];
  riskLevel: 'low' | 'medium' | 'high';
  responsibilities: string[];
  systemPrompt: string;
  managementStyle?: string;
  decisionRules: string[];
  defaultSkills: string[];
  bundle?: string;
  description?: string;
  usageCount: number;
  successCount: number;
  failureCount: number;
  avgSuccessScore?: number;
  isActive: boolean;
  authorId?: string;
  supersededBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderSkillInput {
  skillId: string;
  name: string;
  category: string;
  version?: string;
  triggers: string[];
  toolsRequired?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
  responsibilities: string[];
  systemPrompt: string;
  managementStyle?: string;
  decisionRules?: string[];
  defaultSkills?: string[];
  bundle?: string;
  description?: string;
  authorId?: string;
}

export interface LeaderSkillMatch {
  skill: LeaderSkill;
  keywordScore: number;     // 关键词命中分数 0~1
  semanticScore: number;    // 语义相似度 0~1
  llmScore?: number;        // LLM 排序分数 0~1
  finalScore: number;       // 综合分数
  matchReason: string;
}

// ============================================================
// 内存缓存
// ============================================================

let skillCache: Map<string, LeaderSkill> = new Map();
let cacheLoaded = false;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 分钟

// ============================================================
// Leader Skill Service
// ============================================================

export class LeaderSkillService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  // ============================================================
  // CRUD 操作
  // ============================================================

  /**
   * 创建或更新 Leader Skill（upsert 语义）
   */
  async upsert(input: LeaderSkillInput): Promise<LeaderSkill> {
    console.log(`[LeaderSkill] Upserting: ${input.skillId}`);

    const now = new Date().toISOString();
    const triggersEmbedding = await this.generateEmbedding(input.triggers.join(' '));

    const result = await this.pool.query(
      `INSERT INTO leader_skills (
        skill_id, name, category, version, triggers, triggers_embedding,
        tools_required, risk_level, responsibilities, system_prompt,
        management_style, decision_rules, default_skills, bundle,
        description, author_id, is_active, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true, NOW())
      ON CONFLICT (skill_id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        version = EXCLUDED.version,
        triggers = EXCLUDED.triggers,
        triggers_embedding = EXCLUDED.triggers_embedding,
        tools_required = EXCLUDED.tools_required,
        risk_level = EXCLUDED.risk_level,
        responsibilities = EXCLUDED.responsibilities,
        system_prompt = EXCLUDED.system_prompt,
        management_style = EXCLUDED.management_style,
        decision_rules = EXCLUDED.decision_rules,
        default_skills = EXCLUDED.default_skills,
        bundle = EXCLUDED.bundle,
        description = EXCLUDED.description,
        updated_at = NOW()
      RETURNING *`,
      [
        input.skillId,
        input.name,
        input.category,
        input.version || '1.0.0',
        JSON.stringify(input.triggers),
        triggersEmbedding ? `{${triggersEmbedding.join(',')}}` : null,
        JSON.stringify(input.toolsRequired || []),
        input.riskLevel || 'low',
        JSON.stringify(input.responsibilities),
        input.systemPrompt,
        input.managementStyle || null,
        JSON.stringify(input.decisionRules || []),
        JSON.stringify(input.defaultSkills || []),
        input.bundle || null,
        input.description || null,
        input.authorId || null
      ]
    );

    // 更新缓存
    cacheLoaded = false;
    const skill = this.rowToSkill(result.rows[0]);
    skillCache.set(skill.skillId, skill);

    console.log(`[LeaderSkill] Upserted: ${input.skillId} (${input.category})`);
    return skill;
  }

  /**
   * 根据 skillId 获取 Leader Skill
   */
  async getBySkillId(skillId: string): Promise<LeaderSkill | null> {
    await this.ensureCacheLoaded();
    return skillCache.get(skillId) || null;
  }

  /**
   * 根据主键 id 获取
   */
  async getById(id: string): Promise<LeaderSkill | null> {
    await this.ensureCacheLoaded();
    for (const skill of skillCache.values()) {
      if (skill.id === id) return skill;
    }
    return null;
  }

  /**
   * 获取所有活跃的 Leader Skills
   */
  async getAllActive(): Promise<LeaderSkill[]> {
    await this.ensureCacheLoaded();
    return Array.from(skillCache.values()).filter(s => s.isActive);
  }

  /**
   * 根据 category 获取
   */
  async getByCategory(category: string): Promise<LeaderSkill[]> {
    await this.ensureCacheLoaded();
    return Array.from(skillCache.values()).filter(s => s.isActive && s.category === category);
  }

  /**
   * 列出所有 Skill（含分页与过滤）
   */
  async list(options: {
    category?: string;
    bundle?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: LeaderSkill[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (options.category) {
      conditions.push(`category = $${paramIdx++}`);
      params.push(options.category);
    }
    if (options.bundle) {
      conditions.push(`bundle = $${paramIdx++}`);
      params.push(options.bundle);
    }
    if (options.activeOnly !== false) {
      conditions.push('is_active = true');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const itemsResult = await this.pool.query(
      `SELECT * FROM leader_skills ${whereClause}
       ORDER BY avg_success_score DESC NULLS LAST, usage_count DESC, name
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    const totalResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM leader_skills ${whereClause}`,
      params
    );

    return {
      items: itemsResult.rows.map(row => this.rowToSkill(row)),
      total: parseInt(totalResult.rows[0].count, 10)
    };
  }

  /**
   * 停用 Skill（软删除）
   */
  async deactivate(skillId: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE leader_skills SET is_active = false, updated_at = NOW() WHERE skill_id = $1',
      [skillId]
    );
    cacheLoaded = false;
    return (result.rowCount || 0) > 0;
  }

  /**
   * 记录使用次数
   */
  async recordUsage(skillId: string, success: boolean): Promise<void> {
    const field = success ? 'success_count' : 'failure_count';
    await this.pool.query(
      `UPDATE leader_skills SET
        usage_count = usage_count + 1,
        ${field} = ${field} + 1,
        avg_success_score = CASE
          WHEN usage_count + 1 > 0
          THEN (success_count + $${success ? 2 : 3})::decimal / (usage_count + 1)
          ELSE 0
        END,
        updated_at = NOW()
       WHERE skill_id = $1`,
      [skillId, success ? 1 : 0, success ? 0 : 1]
    );
  }

  // ============================================================
  // 缓存管理
  // ============================================================

  /**
   * 重新加载缓存
   */
  async reloadCache(): Promise<void> {
    cacheLoaded = false;
    await this.ensureCacheLoaded();
    console.log(`[LeaderSkill] Cache reloaded: ${skillCache.size} skills`);
  }

  /**
   * 确保缓存已加载
   */
  private async ensureCacheLoaded(): Promise<void> {
    if (cacheLoaded && (Date.now() - cacheTimestamp) < CACHE_TTL_MS) {
      return;
    }
    await this.loadFromDatabase();
    cacheLoaded = true;
    cacheTimestamp = Date.now();
  }

  /**
   * 从数据库加载
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM leader_skills
         WHERE is_active = true
         ORDER BY avg_success_score DESC NULLS LAST, usage_count DESC, name`
      );

      skillCache.clear();
      for (const row of result.rows) {
        const skill = this.rowToSkill(row);
        skillCache.set(skill.skillId, skill);
      }

      console.log(`[LeaderSkill] Loaded ${skillCache.size} skills from database`);
    } catch (error: any) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('[LeaderSkill] leader_skills table not found, using empty cache');
      } else {
        console.error('[LeaderSkill] Failed to load from database:', error.message);
      }
    }
  }

  // ============================================================
  // Embedding 生成
  // ============================================================

  /**
   * 为文本生成 embedding 向量
   * 优先使用 OpenAI API，降级到简单的 one-hot / TF-IDF
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    // 方案 1：调用 OpenAI Embedding API
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && !openaiKey.startsWith('sk-mock')) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text.substring(0, 8000) // 限长
          })
        });
        if (response.ok) {
          const data = await response.json();
          return data.data?.[0]?.embedding || null;
        }
      } catch (error) {
        console.warn('[LeaderSkill] OpenAI embedding failed, falling back to local:', (error as Error).message);
      }
    }

    // 方案 2：本地 hash-based 向量（确定性、可复现、降级方案）
    return this.localHashEmbedding(text, 384);
  }

  /**
   * 本地 hash-based embedding
   * 用哈希函数把 token 映射到固定维度的向量
   * 优点：无需外部 API，可复现，跨语言
   * 缺点：精度不如 OpenAI，但对路由已够用
   */
  private localHashEmbedding(text: string, dim: number = 384): number[] {
    const vec = new Array(dim).fill(0);
    const tokens = text.toLowerCase().split(/[\s,，、。；;！!？?]+/).filter(t => t.length > 0);

    for (const token of tokens) {
      // 对每个 token 计算多个 hash，模拟 subword embedding
      for (let i = 0; i < 3; i++) {
        const hash = this.simpleHash(token + i);
        const idx = Math.abs(hash) % dim;
        const sign = hash % 2 === 0 ? 1 : -1;
        vec[idx] += sign * 0.1;
      }
    }

    // L2 normalize
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / norm);
  }

  /**
   * 简单的字符串哈希
   */
  private simpleHash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & 0xFFFFFFFF;
    }
    return hash;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 数据库行映射为对象
   */
  private rowToSkill(row: any): LeaderSkill {
    return {
      id: row.id,
      skillId: row.skill_id,
      name: row.name,
      category: row.category,
      version: row.version,
      triggers: this.parseJson(row.triggers, []),
      triggersEmbedding: row.triggers_embedding
        ? (typeof row.triggers_embedding === 'string'
          ? row.triggers_embedding.slice(1, -1).split(',').map(Number)
          : row.triggers_embedding)
        : undefined,
      toolsRequired: this.parseJson(row.tools_required, []),
      riskLevel: row.risk_level,
      responsibilities: this.parseJson(row.responsibilities, []),
      systemPrompt: row.system_prompt,
      managementStyle: row.management_style,
      decisionRules: this.parseJson(row.decision_rules, []),
      defaultSkills: this.parseJson(row.default_skills, []),
      bundle: row.bundle,
      description: row.description,
      usageCount: row.usage_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      avgSuccessScore: row.avg_success_score ? parseFloat(row.avg_success_score) : undefined,
      isActive: row.is_active,
      authorId: row.author_id,
      supersededBy: row.superseded_by,
      createdAt: row.created_at?.toISOString?.() || row.created_at,
      updatedAt: row.updated_at?.toISOString?.() || row.updated_at
    };
  }

  /**
   * 安全解析 JSON
   */
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
   * 计算两个 embedding 的余弦相似度
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }
}

// 导出单例
export const leaderSkillService = new LeaderSkillService();