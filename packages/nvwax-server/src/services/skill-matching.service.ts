import { skillHubService } from './skillhub.service.js';

/**
 * Skill 匹配结果
 */
export interface SkillMatchResult {
  found: boolean;
  skillName: string;
  url?: string;
  version?: string;
  dependencies?: string[];
  description?: string;
}

/**
 * Skill 匹配服务
 * 
 * 负责在 SkillHub 中搜索和验证 Skills
 */
export class SkillMatchingService {
  
  /**
   * 搜索 Skill
   */
  async searchSkill(skillName: string): Promise<SkillMatchResult> {
    try {
      console.log(`🔍 Searching skill: ${skillName}`);
      
      // 调用 SkillHub API 搜索
      const result = await skillHubService.searchSkills(skillName, 1);
      
      if (result && result.data && result.data.length > 0) {
        const skill = result.data[0];
        return {
          found: true,
          skillName: skill.name || skillName,
          url: skill.url || `https://skillhub.proclaw.cc/skills/${skill.id}`,
          version: skill.version,
          dependencies: skill.dependencies || [],
          description: skill.description
        };
      }
      
      // 未找到
      return {
        found: false,
        skillName,
        url: `https://skillhub.proclaw.cc/create?name=${encodeURIComponent(skillName)}`
      };
    } catch (error) {
      console.error(`Error searching skill ${skillName}:`, error);
      return {
        found: false,
        skillName,
        url: `https://skillhub.proclaw.cc/create?name=${encodeURIComponent(skillName)}`
      };
    }
  }

  /**
   * 批量搜索 Skills
   */
  async searchSkills(skillNames: string[]): Promise<Record<string, SkillMatchResult>> {
    const results: Record<string, SkillMatchResult> = {};
    
    for (const skillName of skillNames) {
      results[skillName] = await this.searchSkill(skillName);
    }
    
    return results;
  }

  /**
   * 验证 Skill 依赖
   */
  async validateDependencies(skillName: string): Promise<{
    valid: boolean;
    missing: string[];
  }> {
    try {
      const match = await this.searchSkill(skillName);
      
      if (!match.found || !match.dependencies || match.dependencies.length === 0) {
        return { valid: true, missing: [] };
      }
      
      const missing: string[] = [];
      
      for (const dep of match.dependencies) {
        const depMatch = await this.searchSkill(dep);
        if (!depMatch.found) {
          missing.push(dep);
        }
      }
      
      return {
        valid: missing.length === 0,
        missing
      };
    } catch (error) {
      console.error(`Error validating dependencies for ${skillName}:`, error);
      return { valid: false, missing: [] };
    }
  }
}

// 导出单例
export const skillMatchingService = new SkillMatchingService();
