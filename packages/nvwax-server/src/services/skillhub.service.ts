import axios from 'axios';
import { config } from '../config/index.js';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category?: string;
  usageCount?: number;
  [key: string]: any;
}

export class SkillHubService {
  private client = axios.create({
    baseURL: config.skillhubApiUrl,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  async searchSkills(query: string, page: number = 1, limit: number = 20): Promise<{ data: Skill[]; total: number }> {
    try {
      const response = await this.client.get('/tools/discovery', {
        params: { q: query, page, limit }
      });
      
      // 根据实际 API 响应结构调整
      return {
        data: response.data.data || response.data.tools || [],
        total: response.data.total || 0
      };
    } catch (error) {
      console.error('Error searching skills:', error);
      return { data: [], total: 0 };
    }
  }

  async getSkillDetail(id: string): Promise<Skill | null> {
    try {
      const response = await this.client.get(`/tools/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching skill detail:', error);
      return null;
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await this.client.get('/tools/categories');
      return response.data.categories || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * 按行业标签搜索技能
   * 用于推荐引擎从 SkillHub 获取行业相关技能
   */
  async searchSkillsByIndustry(industryTags: string[], limit: number = 10): Promise<Skill[]> {
    const allSkills: Skill[] = [];
    const seen = new Set<string>();

    for (const tag of industryTags) {
      try {
        const result = await this.searchSkills(tag, 1, limit);
        for (const skill of result.data) {
          if (!seen.has(skill.id)) {
            seen.add(skill.id);
            allSkills.push(skill);
          }
        }
      } catch (error) {
        console.warn(`Error searching skills by industry tag "${tag}":`, error);
      }
    }

    return allSkills.slice(0, limit);
  }

  /**
   * 获取行业技能推荐
   * 按行业标签搜索并关联到对应技能
   */
  async getSkillRecommendations(industryTags: string[]): Promise<{ skill: Skill; matchScore: number }[]> {
    const skills = await this.searchSkillsByIndustry(industryTags, 15);
    
    return skills.map(skill => {
      // 计算匹配分数：按标签匹配度排序
      let matchScore = 0;
      const skillText = `${skill.name} ${skill.description} ${skill.category || ''}`.toLowerCase();
      
      for (const tag of industryTags) {
        if (skillText.includes(tag.toLowerCase())) {
          matchScore += 1;
        }
      }
      
      // 如果有 usageCount，作为加分
      if (skill.usageCount) {
        matchScore += Math.min(skill.usageCount / 100, 0.5);
      }
      
      return {
        skill,
        matchScore: Math.min(matchScore, 1)
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }
}

export const skillHubService = new SkillHubService();
