import { agentSearchService, Agent } from './agent-search.service.js';
import { skillHubService, Skill } from './skillhub.service.js';

/**
 * Agent 兼容性评分结果
 */
export interface CompatibilityScore {
  agentId: string;
  agentName: string;
  overallScore: number;        // 总体评分 (0-100)
  dimensionScores: {
    functionalMatch: number;   // 功能匹配度 (0-100)
    skillCoverage: number;     // 技能覆盖率 (0-100)
    qualityScore: number;      // 质量评分 (0-100)
    popularityScore: number;   // 流行度评分 (0-100)
  };
  matchedSkills: Skill[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended';
}

/**
 * 角色需求定义
 */
export interface RoleRequirement {
  roleName: string;
  description: string;
  responsibilities: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
}

/**
 * Agent 兼容性评分服务
 * 
 * 用于评估开源 Agent 与虚拟公司角色需求的匹配程度
 */
export class AgentCompatibilityService {
  
  /**
   * 为角色需求搜索并评分匹配的 Agent
   */
  async searchAndScoreAgents(
    roleRequirement: RoleRequirement,
    limit: number = 5
  ): Promise<CompatibilityScore[]> {
    try {
      console.log(`🔍 Searching agents for role: ${roleRequirement.roleName}`);

      // 1. 构建搜索查询
      const searchQuery = this.buildSearchQuery(roleRequirement);
      
      // 2. 搜索 Agent
      const searchResult = await agentSearchService.searchAgents(searchQuery, 1, limit * 2);
      
      if (searchResult.data.length === 0) {
        console.log('⚠️ No agents found');
        return [];
      }

      // 3. 为每个 Agent 计算兼容性评分
      const scoredAgents = await Promise.all(
        searchResult.data.map(agent => 
          this.calculateCompatibilityScore(agent, roleRequirement)
        )
      );

      // 4. 按评分排序并返回前 N 个
      const sorted = scoredAgents
        .filter(score => score.overallScore > 30) // 过滤低分
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, limit);

      console.log(`✅ Found ${sorted.length} compatible agents`);
      return sorted;
    } catch (error) {
      console.error('Error in searchAndScoreAgents:', error);
      return [];
    }
  }

  /**
   * 计算单个 Agent 的兼容性评分
   */
  async calculateCompatibilityScore(
    agent: Agent,
    roleRequirement: RoleRequirement
  ): Promise<CompatibilityScore> {
    // 1. 功能匹配度评分
    const functionalMatch = this.calculateFunctionalMatch(agent, roleRequirement);

    // 2. 技能覆盖率评分
    const { skillCoverage, matchedSkills, missingSkills } = 
      await this.calculateSkillCoverage(agent, roleRequirement);

    // 3. 质量评分
    const qualityScore = this.calculateQualityScore(agent);

    // 4. 流行度评分
    const popularityScore = this.calculatePopularityScore(agent);

    // 5. 计算总体评分（加权平均）
    const overallScore = Math.round(
      functionalMatch * 0.35 +      // 功能匹配权重 35%
      skillCoverage * 0.30 +        // 技能覆盖权重 30%
      qualityScore * 0.20 +         // 质量权重 20%
      popularityScore * 0.15        // 流行度权重 15%
    );

    // 6. 生成优势和劣势分析
    const { strengths, weaknesses } = this.analyzeStrengthsAndWeaknesses(
      agent,
      roleRequirement,
      { functionalMatch, skillCoverage, qualityScore, popularityScore }
    );

    // 7. 确定推荐级别
    const recommendation = this.getRecommendationLevel(overallScore);

    return {
      agentId: agent.id,
      agentName: agent.name,
      overallScore,
      dimensionScores: {
        functionalMatch,
        skillCoverage,
        qualityScore,
        popularityScore
      },
      matchedSkills,
      missingSkills,
      strengths,
      weaknesses,
      recommendation
    };
  }

  /**
   * 构建搜索查询
   */
  private buildSearchQuery(roleRequirement: RoleRequirement): string {
    const keywords = [
      roleRequirement.roleName,
      ...roleRequirement.responsibilities.slice(0, 2),
      ...(roleRequirement.requiredSkills || []).slice(0, 2)
    ];
    
    return keywords.join(' ');
  }

  /**
   * 计算功能匹配度
   */
  private calculateFunctionalMatch(
    agent: Agent,
    roleRequirement: RoleRequirement
  ): number {
    let score = 0;
    const maxScore = 100;

    // 1. 名称匹配 (20%)
    const nameMatch = this.calculateTextSimilarity(
      agent.name.toLowerCase(),
      roleRequirement.roleName.toLowerCase()
    );
    score += nameMatch * 20;

    // 2. 描述匹配 (40%)
    const descriptionMatch = this.calculateDescriptionRelevance(
      agent.description || '',
      roleRequirement
    );
    score += descriptionMatch * 40;

    // 3. 标签/主题匹配 (40%)
    const tags = agent.tags || [];
    const responsibilityKeywords = roleRequirement.responsibilities
      .flatMap(r => r.toLowerCase().split(/\s+/));
    
    const tagMatches = tags.filter(tag => 
      responsibilityKeywords.some(keyword => 
        tag.toLowerCase().includes(keyword)
      )
    ).length;

    const tagScore = Math.min(tagMatches / Math.max(responsibilityKeywords.length, 1), 1) * 100;
    score += tagScore * 40;

    return Math.min(Math.round(score), maxScore);
  }

  /**
   * 计算技能覆盖率
   */
  private async calculateSkillCoverage(
    agent: Agent,
    roleRequirement: RoleRequirement
  ): Promise<{
    skillCoverage: number;
    matchedSkills: Skill[];
    missingSkills: string[];
  }> {
    const requiredSkills = roleRequirement.requiredSkills || [];
    const preferredSkills = roleRequirement.preferredSkills || [];
    const allSkills = [...requiredSkills, ...preferredSkills];

    if (allSkills.length === 0) {
      return { skillCoverage: 50, matchedSkills: [], missingSkills: [] };
    }

    // 搜索相关 Skills
    const matchedSkills: Skill[] = [];
    const missingSkills: string[] = [];

    for (const skillName of allSkills) {
      try {
        const result = await skillHubService.searchSkills(skillName, 1, 1);
        if (result.data.length > 0) {
          matchedSkills.push(result.data[0]);
        } else {
          missingSkills.push(skillName);
        }
      } catch (error) {
        console.warn(`Failed to search skill: ${skillName}`);
        missingSkills.push(skillName);
      }
    }

    // 计算覆盖率
    const coverage = Math.round((matchedSkills.length / allSkills.length) * 100);

    return {
      skillCoverage: coverage,
      matchedSkills,
      missingSkills
    };
  }

  /**
   * 计算质量评分
   */
  private calculateQualityScore(agent: Agent): number {
    let score = 50; // 基础分

    // 1. 是否有详细描述 (+20)
    if (agent.description && agent.description.length > 50) {
      score += 20;
    }

    // 2. 是否有标签/分类 (+10)
    if (agent.tags && agent.tags.length > 0) {
      score += 10;
    }

    // 3. 是否有作者信息 (+10)
    if (agent.author) {
      score += 10;
    }

    // 4. 是否有许可证 (+10)
    if (agent.license) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * 计算流行度评分
   */
  private calculatePopularityScore(agent: Agent): number {
    const stars = agent.stars || 0;
    const downloads = agent.downloads || 0;

    // GitHub Stars 评分
    let starScore = 0;
    if (stars > 10000) starScore = 100;
    else if (stars > 5000) starScore = 80;
    else if (stars > 1000) starScore = 60;
    else if (stars > 100) starScore = 40;
    else if (stars > 10) starScore = 20;

    // 下载量评分
    let downloadScore = 0;
    if (downloads > 100000) downloadScore = 100;
    else if (downloads > 10000) downloadScore = 80;
    else if (downloads > 1000) downloadScore = 60;
    else if (downloads > 100) downloadScore = 40;

    // 综合评分
    return Math.round((starScore + downloadScore) / 2);
  }

  /**
   * 分析优势和劣势
   */
  private analyzeStrengthsAndWeaknesses(
    agent: Agent,
    roleRequirement: RoleRequirement,
    scores: {
      functionalMatch: number;
      skillCoverage: number;
      qualityScore: number;
      popularityScore: number;
    }
  ): { strengths: string[]; weaknesses: string[] } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // 优势分析
    if (scores.functionalMatch >= 80) {
      strengths.push('功能匹配度高');
    }
    if (scores.skillCoverage >= 80) {
      strengths.push('技能覆盖全面');
    }
    if (scores.qualityScore >= 80) {
      strengths.push('文档和质量优秀');
    }
    if (scores.popularityScore >= 70) {
      strengths.push('社区活跃，使用广泛');
    }
    if (agent.stars && agent.stars > 1000) {
      strengths.push(`GitHub Stars: ${agent.stars}`);
    }

    // 劣势分析
    if (scores.functionalMatch < 50) {
      weaknesses.push('功能匹配度较低');
    }
    if (scores.skillCoverage < 50) {
      weaknesses.push('部分必需技能缺失');
    }
    if (scores.qualityScore < 50) {
      weaknesses.push('文档或质量有待完善');
    }
    if (!agent.description || agent.description.length < 50) {
      weaknesses.push('描述信息不足');
    }

    return { strengths, weaknesses };
  }

  /**
   * 获取推荐级别
   */
  private getRecommendationLevel(score: number): CompatibilityScore['recommendation'] {
    if (score >= 80) return 'highly_recommended';
    if (score >= 60) return 'recommended';
    if (score >= 40) return 'consider';
    return 'not_recommended';
  }

  /**
   * 计算文本相似度（简单实现）
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    let matches = 0;
    words1.forEach(word => {
      if (words2.has(word)) matches++;
    });

    const similarity = matches / Math.max(words1.size, words2.size);
    return Math.min(similarity * 100, 100);
  }

  /**
   * 计算描述相关性
   */
  private calculateDescriptionRelevance(
    description: string,
    roleRequirement: RoleRequirement
  ): number {
    if (!description) return 0;

    const descLower = description.toLowerCase();
    const keywords = [
      roleRequirement.roleName.toLowerCase(),
      ...roleRequirement.responsibilities.map(r => r.toLowerCase())
    ];

    let matchCount = 0;
    keywords.forEach(keyword => {
      if (descLower.includes(keyword)) {
        matchCount++;
      }
    });

    return Math.min((matchCount / keywords.length) * 100, 100);
  }
}

// 导出单例
export const agentCompatibilityService = new AgentCompatibilityService();
