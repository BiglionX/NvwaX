/**
 * RecommendationService
 * 
 * Agent 和 Skill 推荐引擎
 * 根据已安装的插件 ID 和行业标签推荐配套的 Agent 和 Skills
 * 对应 PRD v2.0 章节 2.4
 */

import { Pool } from 'pg';
import { databaseService } from './database.service.js';
import { pluginCapabilitiesService } from './plugin-capabilities.service.js';
import { skillHubService } from './skillhub.service.js';
import { skillMatchingService } from './skill-matching.service.js';
import {
  RecommendedAgent,
  RecommendedSkill,
  RecommendationRequest,
  RecommendationResponse
} from '../types/plugin-capabilities.types.js';

export class RecommendationService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * 核心推荐方法
   * 根据插件 IDs 和行业标签推荐 Agent 和 Skills
   * 对应 PRD 2.4.2 推荐流程
   */
  async getRecommendedAgents(request: RecommendationRequest): Promise<RecommendationResponse> {
    const {
      plugin_ids = [],
      industry_tags = [],
      limit = 5,
      include_skills = true
    } = request;

    console.log(`🔍 Recommending agents for plugins: ${plugin_ids.join(', ')}, industries: ${industry_tags.join(', ')}`);

    // 获取插件能力定义
    const capabilities = await this.getPluginCapabilities(plugin_ids);

    // 收集行业标签（来自插件能力 + 请求中的行业标签）
    const allIndustryTags = this.collectIndustryTags(capabilities, industry_tags);

    // Step 1: 精确匹配 - 插件 manifest 显式声明的推荐 Agent
    const exactMatches = await this.matchByExactDeclaration(capabilities);

    // Step 2: 行业匹配 - 从 agent_metadata 中按行业标签匹配
    const industryMatches = await this.matchByIndustry(allIndustryTags);

    // Step 3: 热榜优先 - 从 agent_metadata 获取热门 Agent
    const topRated = await this.getTopRated(limit);

    // 合并并排序
    const merged = this.mergeAndRank(exactMatches, industryMatches, topRated, limit);

    // 推荐 Skills
    let recommendedSkills: RecommendedSkill[] = [];
    if (include_skills) {
      recommendedSkills = await this.recommendSkills(allIndustryTags);
    }

    return {
      recommended_agents: merged.slice(0, limit),
      recommended_skills: recommendedSkills,
      total_agents: merged.length,
      total_skills: recommendedSkills.length
    };
  }

  /**
   * 获取插件的完整能力定义
   */
  private async getPluginCapabilities(pluginIds: string[]): Promise<any[]> {
    const capabilities = [];
    for (const pluginId of pluginIds) {
      const record = await pluginCapabilitiesService.getCapability(pluginId);
      if (record) {
        capabilities.push(record);
      }
    }
    return capabilities;
  }

  /**
   * 收集所有行业标签
   */
  private collectIndustryTags(capabilities: any[], requestTags: string[]): string[] {
    const tagSet = new Set<string>();
    
    // 从插件能力的 skill_ids 中提取行业标签
    for (const cap of capabilities) {
      if (cap.skill_ids && Array.isArray(cap.skill_ids)) {
        cap.skill_ids.forEach((id: string) => {
          // skill_ids 可能包含行业标签格式如 "catering", "餐饮"
          tagSet.add(id);
        });
      }
    }
    
    // 添加请求中的行业标签
    requestTags.forEach(tag => tagSet.add(tag));
    
    return Array.from(tagSet);
  }

  /**
   * 精确匹配：通过插件 manifest 中声明的推荐 Agent
   * 权重: 50%
   */
  private async matchByExactDeclaration(capabilities: any[]): Promise<RecommendedAgent[]> {
    if (capabilities.length === 0) return [];

    // 从 plugin_capabilities 的 actions 中提取 plugin_id 作为关联标识
    const pluginIds = capabilities.map(c => c.plugin_id);
    
    // 在 agent_metadata 中查找标签包含 plugin_id 的 Agent
    const result = await this.pool.query(
      `SELECT * FROM agent_metadata WHERE 
       tags::jsonb ?| $1::text[]
       OR category = ANY($1::text[])
       ORDER BY downloads DESC NULLS LAST, stars DESC NULLS LAST
       LIMIT 20`,
      [pluginIds]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      version: '1.0.0',
      capabilities: row.tags || [],
      plugin_id: pluginIds.find(id => 
        (row.tags || []).includes(id) || row.category === id
      ),
      downloads: row.downloads || 0,
      rating: this.calculateRating(row.stars || 0, row.downloads || 0),
      match_score: 0.95, // 精确匹配高权重
      match_reason: '该 Agent 与已安装的插件直接关联'
    }));
  }

  /**
   * 行业匹配：根据行业标签匹配 Agent
   * 权重: 30%
   */
  private async matchByIndustry(industryTags: string[]): Promise<RecommendedAgent[]> {
    if (industryTags.length === 0) return [];

    const conditions = industryTags.map((_, i) => 
      `(tags::jsonb ? $${i + 1} OR category ILIKE $${i + 1 + industryTags.length})`
    ).join(' OR ');

    // 构建模糊匹配参数
    const likeParams = industryTags.map(t => `%${t}%`);
    const allParams = [...industryTags, ...likeParams];

    const query = `SELECT * FROM agent_metadata WHERE ${conditions}
                   ORDER BY downloads DESC NULLS LAST, stars DESC NULLS LAST
                   LIMIT 20`;

    const result = await this.pool.query(query, allParams);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      version: '1.0.0',
      capabilities: row.tags || [],
      downloads: row.downloads || 0,
      rating: this.calculateRating(row.stars || 0, row.downloads || 0),
      match_score: 0.7, // 行业匹配中等权重
      match_reason: '该 Agent 与您的行业领域相关'
    }));
  }

  /**
   * 热榜优先：获取平台上最热门的 Agent
   * 权重: 15%
   */
  private async getTopRated(limit: number): Promise<RecommendedAgent[]> {
    const result = await this.pool.query(
      `SELECT * FROM agent_metadata 
       ORDER BY (COALESCE(downloads, 0) + COALESCE(stars, 0) * 10) DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      version: '1.0.0',
      capabilities: row.tags || [],
      downloads: row.downloads || 0,
      rating: this.calculateRating(row.stars || 0, row.downloads || 0),
      match_score: 0.5, // 热榜权重较低
      match_reason: '平台热门推荐 Agent'
    }));
  }

  /**
   * 合并并排序推荐结果
   * 排序权重:
   * 1. match_score (降序)
   * 2. downloads + stars 综合热度 (降序)
   * 3. rating (降序)
   */
  private mergeAndRank(
    exact: RecommendedAgent[],
    industry: RecommendedAgent[],
    topRated: RecommendedAgent[],
    limit: number
  ): RecommendedAgent[] {
    const seen = new Set<string>();
    const merged: RecommendedAgent[] = [];

    // 优先级: 精确匹配 > 行业匹配 > 热榜
    const addIfNotSeen = (agents: RecommendedAgent[]) => {
      for (const agent of agents) {
        if (!seen.has(agent.id)) {
          seen.add(agent.id);
          merged.push(agent);
        }
      }
    };

    addIfNotSeen(exact);
    addIfNotSeen(industry);
    addIfNotSeen(topRated);

    // 根据 match_score 和热度综合排序
    merged.sort((a, b) => {
      // 先按 match_score 排序
      const scoreDiff = (b.match_score || 0) - (a.match_score || 0);
      if (Math.abs(scoreDiff) > 0.01) return scoreDiff;

      // match_score 相同，按热度排序
      const heatA = a.downloads + (a.rating * 100);
      const heatB = b.downloads + (b.rating * 100);
      return heatB - heatA;
    });

    return merged;
  }

  /**
   * 推荐 Skills（从 SkillHub 拉取）
   * 对应 PRD 2.4.3
   */
  async recommendSkills(industryTags: string[]): Promise<RecommendedSkill[]> {
    if (industryTags.length === 0) return [];

    const skills: RecommendedSkill[] = [];
    const seen = new Set<string>();

    // 1. 从 SkillHub 搜索行业相关技能
    for (const tag of industryTags) {
      try {
        const result = await skillHubService.searchSkills(tag, 1, 5);
        if (result.data) {
          for (const skill of result.data) {
            if (!seen.has(skill.id || skill.name)) {
              seen.add(skill.id || skill.name);
              skills.push({
                id: skill.id || skill.name,
                name: skill.name,
                type: 'knowledge',
                source: 'skillhub',
                description: skill.description,
                industry_tags: [tag],
                match_score: 0.8
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Error searching skills for tag ${tag}:`, error);
      }
    }

    // 2. 使用 skill-matching service 补充匹配
    try {
      const matchPromises = industryTags.map(tag => 
        skillMatchingService.searchSkill(tag)
      );
      const matches = await Promise.all(matchPromises);
      
      for (const match of matches) {
        if (match.found && !seen.has(match.skillName)) {
          seen.add(match.skillName);
          skills.push({
            id: match.skillName,
            name: match.skillName,
            type: 'knowledge',
            source: 'skillhub',
            description: match.description,
            match_score: 0.7
          });
        }
      }
    } catch (error) {
      console.warn('Error in skill matching:', error);
    }

    return skills;
  }

  /**
   * 根据星级和下载量计算评分 (1-5)
   */
  private calculateRating(stars: number, downloads: number): number {
    const starScore = Math.min(stars / 100, 5);
    const downloadScore = Math.min(downloads / 10000, 1) * 5;
    return Math.min(Math.max(starScore * 0.7 + downloadScore * 0.3, 1), 5);
  }
}

export const recommendationService = new RecommendationService();
