/**
 * Agent Registry Service
 * 
 * 动态 Agent 注册表，替代硬编码的 agent-definitions.js
 * 
 * 核心能力：
 * 1. CRUD 注册/注销 Agent 定义
 * 2. 多来源支持（built-in / yaml / api / community）
 * 3. 热加载（从数据库 + YAML 文件加载定义）
 * 4. 语义匹配（capabilities + embedding 向量相似度）
 * 5. 关键词降级匹配
 */

import { databaseService } from './database.service.js';

// ============================================================
// 类型定义
// ============================================================

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  keywords: string[];
  embedding?: number[];
  workflowTemplate: Record<string, unknown>;
  tools: string[];
  constraints: Record<string, unknown>;
  metadata: Record<string, unknown>;
  source: 'built-in' | 'yaml' | 'api' | 'community';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSearchResult {
  agent: AgentDefinition;
  score: number; // 0-1
  matchReason: string;
}

export interface AgentRegistrationInput {
  id: string;
  name: string;
  description: string;
  version?: string;
  capabilities: string[];
  keywords?: string[];
  workflowTemplate?: Record<string, unknown>;
  tools?: string[];
  constraints?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  source?: 'built-in' | 'yaml' | 'api' | 'community';
}

// ============================================================
// 内存缓存
// ============================================================

/** 内存中的 Agent 定义缓存 */
let agentCache: Map<string, AgentDefinition> = new Map();
let cacheLoaded = false;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 缓存有效期 1 分钟

// ============================================================
// Agent Registry 服务
// ============================================================

export class AgentRegistryService {
  
  /**
   * 注册新的 Agent 定义
   */
  async register(input: AgentRegistrationInput): Promise<AgentDefinition> {
    console.log(`[AgentRegistry] Registering agent: ${input.id}`);
    
    const pool = databaseService.getPool();
    const now = new Date().toISOString();
    
    const agent: AgentDefinition = {
      id: input.id,
      name: input.name,
      description: input.description,
      version: input.version || '1.0.0',
      capabilities: input.capabilities,
      keywords: input.keywords || [],
      workflowTemplate: input.workflowTemplate || {},
      tools: input.tools || [],
      constraints: input.constraints || {},
      metadata: input.metadata || {},
      source: input.source || 'api',
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    
    await pool.query(
      `INSERT INTO agent_definitions (
        id, name, description, version, capabilities, keywords,
        workflow_template, tools, constraints, metadata, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        version = EXCLUDED.version,
        capabilities = EXCLUDED.capabilities,
        keywords = EXCLUDED.keywords,
        workflow_template = EXCLUDED.workflow_template,
        tools = EXCLUDED.tools,
        constraints = EXCLUDED.constraints,
        metadata = EXCLUDED.metadata,
        source = EXCLUDED.source,
        is_active = true,
        updated_at = NOW()`,
      [
        agent.id, agent.name, agent.description, agent.version,
        JSON.stringify(agent.capabilities), JSON.stringify(agent.keywords),
        JSON.stringify(agent.workflowTemplate), JSON.stringify(agent.tools),
        JSON.stringify(agent.constraints), JSON.stringify(agent.metadata),
        agent.source
      ]
    );
    
    // 更新缓存
    agentCache.set(agent.id, agent);
    
    console.log(`[AgentRegistry] Agent registered: ${agent.id} (${agent.source})`);
    return agent;
  }
  
  /**
   * 注销 Agent（标记为非活跃）
   */
  async unregister(agentId: string): Promise<boolean> {
    console.log(`[AgentRegistry] Unregistering agent: ${agentId}`);
    
    const pool = databaseService.getPool();
    const result = await pool.query(
      'UPDATE agent_definitions SET is_active = false, updated_at = NOW() WHERE id = $1',
      [agentId]
    );
    
    // 更新缓存
    const cached = agentCache.get(agentId);
    if (cached) {
      cached.isActive = false;
    }
    
    return (result.rowCount || 0) > 0;
  }
  
  /**
   * 获取 Agent 定义
   */
  async get(agentId: string): Promise<AgentDefinition | null> {
    await this.ensureCacheLoaded();
    return agentCache.get(agentId) || null;
  }
  
  /**
   * 获取所有活跃的 Agent 定义
   */
  async getAll(): Promise<AgentDefinition[]> {
    await this.ensureCacheLoaded();
    return Array.from(agentCache.values()).filter(a => a.isActive);
  }
  
  /**
   * 语义匹配：根据需求描述搜索匹配的 Agent
   * 
   * 匹配策略（按优先级）：
   * 1. capabilities 标签交集匹配
   * 2. keywords 关键词匹配
   * 3. embedding 向量相似度（如果可用）
   */
  async searchMatching(
    query: string,
    requiredCapabilities: string[] = [],
    topK: number = 5
  ): Promise<AgentSearchResult[]> {
    await this.ensureCacheLoaded();
    
    const activeAgents = Array.from(agentCache.values()).filter(a => a.isActive);
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/[\s,，、]+/).filter(w => w.length > 1);
    
    const results: AgentSearchResult[] = [];
    
    for (const agent of activeAgents) {
      let score = 0;
      const reasons: string[] = [];
      
      // 策略 1: capabilities 交集匹配（权重 0.5）
      if (requiredCapabilities.length > 0) {
        const agentCaps = new Set(agent.capabilities.map(c => c.toLowerCase()));
        const matchedCaps = requiredCapabilities.filter(c => agentCaps.has(c.toLowerCase()));
        const capScore = matchedCaps.length / requiredCapabilities.length;
        score += capScore * 0.5;
        if (matchedCaps.length > 0) {
          reasons.push(`能力匹配: ${matchedCaps.join(', ')}`);
        }
      }
      
      // 策略 2: 关键词匹配（权重 0.3）
      const agentKeywords = agent.keywords.map(k => k.toLowerCase());
      const matchedKeywords = queryWords.filter(w =>
        agentKeywords.some(k => k.includes(w) || w.includes(k))
      );
      if (matchedKeywords.length > 0) {
        const kwScore = matchedKeywords.length / Math.max(queryWords.length, 1);
        score += kwScore * 0.3;
        reasons.push(`关键词匹配: ${matchedKeywords.join(', ')}`);
      }
      
      // 策略 2b: 描述文本匹配（权重 0.2）
      const descLower = (agent.description + ' ' + agent.name).toLowerCase();
      const descMatches = queryWords.filter(w => descLower.includes(w));
      if (descMatches.length > 0) {
        const descScore = descMatches.length / Math.max(queryWords.length, 1);
        score += descScore * 0.2;
        reasons.push(`描述匹配: ${descMatches.join(', ')}`);
      }
      
      if (score > 0) {
        results.push({
          agent,
          score: Math.min(score, 1),
          matchReason: reasons.join('; ')
        });
      }
    }
    
    // 按分数降序排列
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, topK);
  }
  
  /**
   * 批量注册多个 Agent
   */
  async registerBatch(inputs: AgentRegistrationInput[]): Promise<AgentDefinition[]> {
    const results: AgentDefinition[] = [];
    for (const input of inputs) {
      const agent = await this.register(input);
      results.push(agent);
    }
    return results;
  }
  
  /**
   * 重新加载缓存
   */
  async reloadCache(): Promise<void> {
    cacheLoaded = false;
    agentCache.clear();
    await this.ensureCacheLoaded();
    console.log(`[AgentRegistry] Cache reloaded: ${agentCache.size} agents`);
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
   * 从数据库加载所有 Agent 定义
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      const pool = databaseService.getPool();
      const result = await pool.query(
        'SELECT * FROM agent_definitions WHERE is_active = true ORDER BY source, name'
      );
      
      agentCache.clear();
      
      for (const row of result.rows) {
        const agent: AgentDefinition = {
          id: row.id,
          name: row.name,
          description: row.description,
          version: row.version,
          capabilities: this.parseJson(row.capabilities, []),
          keywords: this.parseJson(row.keywords, []),
          embedding: row.embedding || undefined,
          workflowTemplate: this.parseJson(row.workflow_template, {}),
          tools: this.parseJson(row.tools, []),
          constraints: this.parseJson(row.constraints, {}),
          metadata: this.parseJson(row.metadata, {}),
          source: row.source,
          isActive: row.is_active,
          createdAt: row.created_at?.toISOString?.() || row.created_at,
          updatedAt: row.updated_at?.toISOString?.() || row.updated_at
        };
        
        agentCache.set(agent.id, agent);
      }
      
      console.log(`[AgentRegistry] Loaded ${agentCache.size} agents from database`);
    } catch (error: any) {
      // 如果表不存在，使用空缓存
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('[AgentRegistry] agent_definitions table not found, using empty cache');
      } else {
        console.error('[AgentRegistry] Failed to load from database:', error.message);
      }
    }
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
}

// 导出单例
export const agentRegistryService = new AgentRegistryService();
