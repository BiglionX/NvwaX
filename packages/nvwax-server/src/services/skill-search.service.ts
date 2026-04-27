import { skillHubService } from './skillhub.service.js';

export interface SkillRecommendation {
  id: string;
  name: string;
  description: string;
  category?: string;
  relevanceScore: number;
}

export class SkillSearchService {
  /**
   * 根据搜索关键词推荐相关的 Skills
   * @param query 搜索关键词
   * @param limit 返回数量限制
   */
  async recommendSkillsForQuery(query: string, limit: number = 5): Promise<SkillRecommendation[]> {
    try {
      console.log(`Recommending skills for query: ${query}`);
      
      // 从 SkillHub 搜索相关技能
      const result = await skillHubService.searchSkills(query, 1, limit);
      
      // 转换为推荐格式
      const recommendations: SkillRecommendation[] = result.data.map((skill, index) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        relevanceScore: this.calculateRelevanceScore(skill, query, index)
      }));

      // 按相关性排序
      recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

      console.log(`Found ${recommendations.length} relevant skills`);
      return recommendations;
    } catch (error) {
      console.error('Error recommending skills:', error);
      return [];
    }
  }

  /**
   * 计算技能与查询的相关性分数
   */
  private calculateRelevanceScore(skill: any, query: string, index: number): number {
    let score = 100 - (index * 10); // 基础分数，排名越前分数越高

    // 名称匹配加分
    if (skill.name && skill.name.toLowerCase().includes(query.toLowerCase())) {
      score += 20;
    }

    // 描述匹配加分
    if (skill.description && skill.description.toLowerCase().includes(query.toLowerCase())) {
      score += 10;
    }

    // 分类匹配加分
    if (skill.category && skill.category.toLowerCase().includes(query.toLowerCase())) {
      score += 15;
    }

    return Math.min(score, 100); // 最高 100 分
  }

  /**
   * 获取可用于构建 Agent 的热门 Skills
   */
  async getPopularSkillsForAgentBuilding(limit: number = 10): Promise<SkillRecommendation[]> {
    try {
      console.log('Fetching popular skills for agent building');
      
      // 这里可以调用 SkillHub API 获取热门技能
      // 暂时使用搜索空字符串来获取所有技能
      const result = await skillHubService.searchSkills('', 1, limit);
      
      const recommendations: SkillRecommendation[] = result.data.map((skill, index) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        relevanceScore: 100 - (index * 5)
      }));

      return recommendations;
    } catch (error) {
      console.error('Error fetching popular skills:', error);
      return [];
    }
  }
}

export const skillSearchService = new SkillSearchService();
