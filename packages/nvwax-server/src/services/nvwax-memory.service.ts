import { databaseService } from './database.service.js';

/**
 * NvwaX 记忆记录
 */
export interface NvwaXMemory {
  id: string;
  userId: string;
  teamType: string;
  industry?: string;
  requirements: Record<string, unknown>;
  teamConfig: Record<string, unknown>;
  agentMatches: Record<string, unknown>;
  skillMatches: Record<string, unknown>;
  successScore: number; // 0-1，成功评分
  userFeedback?: string;
  usageStats: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 最佳实践
 */
export interface BestPractice {
  teamType: string;
  pattern: string;
  description: string;
  confidence: number; // 置信度
  occurrences: number; // 出现次数
  avgSuccessScore: number; // 平均成功评分
}

/**
 * NvwaX Memory Service
 * 
 * 负责：
 * - 存储创建历史
 * - 记录用户反馈
 * - 提取最佳实践
 * - 提供智能推荐
 */
export class NvwaXMemoryService {
  
  /**
   * 保存创建记忆
   */
  async saveMemory(
    userId: string,
    teamType: string,
    data: {
      industry?: string;
      requirements: Record<string, unknown>;
      teamConfig: Record<string, unknown>;
      agentMatches: Record<string, unknown>;
      skillMatches: Record<string, unknown>;
      successScore?: number;
      userFeedback?: string;
    }
  ): Promise<string> {
    console.log(`💾 Saving NvwaX memory for ${teamType}...`);
    
    const pool = databaseService.getPool();
    const id = crypto.randomUUID();
    
    await pool.query(
      `INSERT INTO nvwax_memories (
        id, user_id, team_type, industry, requirements,
        team_config, agent_matches, skill_matches,
        success_score, user_feedback, usage_stats
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        userId,
        teamType,
        data.industry || null,
        JSON.stringify(data.requirements),
        JSON.stringify(data.teamConfig),
        JSON.stringify(data.agentMatches),
        JSON.stringify(data.skillMatches),
        data.successScore || 0.5,
        data.userFeedback || null,
        JSON.stringify({})
      ]
    );
    
    console.log(`✅ Memory saved: ${id}`);
    return id;
  }
  
  /**
   * 更新记忆的成功评分和反馈
   */
  async updateMemoryFeedback(
    memoryId: string,
    successScore: number,
    userFeedback?: string
  ): Promise<void> {
    console.log(`📝 Updating memory feedback: ${memoryId}`);
    
    const pool = databaseService.getPool();
    
    await pool.query(
      `UPDATE nvwax_memories 
       SET success_score = $1, user_feedback = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [successScore, userFeedback || null, memoryId]
    );
    
    console.log(`✅ Feedback updated`);
  }
  
  /**
   * 获取相似团队的最佳配置
   */
  async getBestPractices(
    teamType: string,
    limit: number = 5
  ): Promise<BestPractice[]> {
    console.log(`🔍 Fetching best practices for ${teamType}...`);
    
    const pool = databaseService.getPool();
    
    // 查询高评分的历史记录
    const result = await pool.query(
      `SELECT 
        team_type,
        requirements,
        team_config,
        agent_matches,
        skill_matches,
        success_score,
        COUNT(*) OVER() as total_count
       FROM nvwax_memories
       WHERE team_type = $1 AND success_score >= 0.8
       ORDER BY success_score DESC
       LIMIT $2`,
      [teamType, limit]
    );
    
    const practices: BestPractice[] = [];
    
    // 分析模式并提取最佳实践
    for (const row of result.rows) {
      const practice = this.extractPattern(row);
      if (practice) {
        practices.push(practice);
      }
    }
    
    console.log(`✅ Found ${practices.length} best practices`);
    return practices;
  }
  
  /**
   * 基于历史数据推荐配置
   */
  async recommendConfiguration(
    teamType: string,
    requirements: Record<string, unknown>
  ): Promise<{
    recommendedRoles: Array<{ roleName: string; priority: string }>;
    recommendedSkills: string[];
    confidence: number;
  }> {
    console.log(`🎯 Generating recommendations for ${teamType}...`);
    
    const pool = databaseService.getPool();
    
    // 查询相似需求的历史记录
    const result = await pool.query(
      `SELECT 
        team_config,
        skill_matches,
        success_score
       FROM nvwax_memories
       WHERE team_type = $1 AND success_score >= 0.7
       ORDER BY success_score DESC
       LIMIT 10`,
      [teamType]
    );
    
    if (result.rows.length === 0) {
      console.log('⚠️ No historical data found, using defaults');
      return this.getDefaultRecommendation(teamType);
    }
    
    // 分析高频角色和技能
    const roleFrequency: Record<string, number> = {};
    const skillFrequency: Record<string, number> = {};
    let totalScore = 0;
    
    for (const row of result.rows) {
      const config = typeof row.team_config === 'string' 
        ? JSON.parse(row.team_config) 
        : row.team_config;
      
      const skills = typeof row.skill_matches === 'string'
        ? JSON.parse(row.skill_matches)
        : row.skill_matches;
      
      // 统计角色
      if (config.roles && Array.isArray(config.roles)) {
        config.roles.forEach((role: any) => {
          const roleName = role.roleName || role.name;
          if (roleName) {
            roleFrequency[roleName] = (roleFrequency[roleName] || 0) + 1;
          }
        });
      }
      
      // 统计技能
      if (skills && typeof skills === 'object') {
        Object.keys(skills).forEach(skillName => {
          skillFrequency[skillName] = (skillFrequency[skillName] || 0) + 1;
        });
      }
      
      totalScore += parseFloat(row.success_score);
    }
    
    // 计算平均成功率
    const avgSuccessRate = totalScore / result.rows.length;
    
    // 提取高频角色（出现次数 >= 50%）
    const threshold = result.rows.length * 0.5;
    const recommendedRoles = Object.entries(roleFrequency)
      .filter(([_, count]) => count >= threshold)
      .map(([roleName, count]) => ({
        roleName,
        priority: count >= result.rows.length * 0.8 ? 'required' : 'recommended'
      }))
      .sort((a, b) => {
        const aCount = roleFrequency[a.roleName];
        const bCount = roleFrequency[b.roleName];
        return bCount - aCount;
      })
      .slice(0, 5);
    
    // 提取高频技能（出现次数 >= 40%）
    const skillThreshold = result.rows.length * 0.4;
    const recommendedSkills = Object.entries(skillFrequency)
      .filter(([_, count]) => count >= skillThreshold)
      .map(([skillName]) => skillName)
      .sort((a, b) => skillFrequency[b] - skillFrequency[a])
      .slice(0, 10);
    
    console.log(`✅ Recommendations generated (confidence: ${(avgSuccessRate * 100).toFixed(0)}%)`);
    
    return {
      recommendedRoles,
      recommendedSkills,
      confidence: avgSuccessRate
    };
  }
  
  /**
   * 获取用户的创建历史
   */
  async getUserHistory(
    userId: string,
    limit: number = 10
  ): Promise<NvwaXMemory[]> {
    const pool = databaseService.getPool();
    
    const result = await pool.query(
      `SELECT * FROM nvwax_memories
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows.map(this.mapRowToMemory);
  }
  
  /**
   * 获取统计数据
   */
  async getStatistics(): Promise<{
    totalMemories: number;
    avgSuccessScore: number;
    topTeamTypes: Array<{ teamType: string; count: number }>;
  }> {
    const pool = databaseService.getPool();
    
    // 总记忆数
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM nvwax_memories');
    const totalMemories = parseInt(totalResult.rows[0].count);
    
    // 平均成功率
    const avgResult = await pool.query('SELECT AVG(success_score) as avg_score FROM nvwax_memories');
    const avgSuccessScore = parseFloat(avgResult.rows[0].avg_score) || 0;
    
    // 热门团队类型
    const typesResult = await pool.query(
      `SELECT team_type, COUNT(*) as count
       FROM nvwax_memories
       GROUP BY team_type
       ORDER BY count DESC
       LIMIT 5`
    );
    
    const topTeamTypes = typesResult.rows.map(row => ({
      teamType: row.team_type,
      count: parseInt(row.count)
    }));
    
    return {
      totalMemories,
      avgSuccessScore,
      topTeamTypes
    };
  }
  
  /**
   * 从历史记录中提取模式
   */
  private extractPattern(row: any): BestPractice | null {
    try {
      const config = typeof row.team_config === 'string' 
        ? JSON.parse(row.team_config) 
        : row.team_config;
      
      // 简单的模式提取：识别常见的角色组合
      if (!config.roles || !Array.isArray(config.roles)) {
        return null;
      }
      
      const roleNames = config.roles.map((r: any) => r.roleName || r.name).filter(Boolean);
      const pattern = roleNames.join(', ');
      
      return {
        teamType: row.team_type,
        pattern,
        description: `常见配置: ${pattern}`,
        confidence: parseFloat(row.success_score),
        occurrences: 1, // 简化处理
        avgSuccessScore: parseFloat(row.success_score)
      };
    } catch (error) {
      console.error('Error extracting pattern:', error);
      return null;
    }
  }
  
  /**
   * 获取默认推荐（无历史数据时）
   */
  private getDefaultRecommendation(teamType: string): {
    recommendedRoles: Array<{ roleName: string; priority: string }>;
    recommendedSkills: string[];
    confidence: number;
  } {
    const defaults: Record<string, any> = {
      '营销团队': {
        roles: [
          { roleName: '内容创作者', priority: 'required' },
          { roleName: '社交媒体经理', priority: 'required' },
          { roleName: '数据分析师', priority: 'recommended' }
        ],
        skills: ['content_strategy', 'social_media_analytics', 'campaign_management']
      },
      '客服团队': {
        roles: [
          { roleName: '客服专员', priority: 'required' },
          { roleName: '技术支持', priority: 'required' },
          { roleName: '质量监控', priority: 'recommended' }
        ],
        skills: ['customer_communication', 'problem_solving', 'sentiment_analysis']
      },
      '开发团队': {
        roles: [
          { roleName: '前端工程师', priority: 'required' },
          { roleName: '后端工程师', priority: 'required' },
          { roleName: 'DevOps工程师', priority: 'recommended' }
        ],
        skills: ['technical_architecture', 'code_review', 'project_management']
      },
      '数据分析团队': {
        roles: [
          { roleName: '数据工程师', priority: 'required' },
          { roleName: '数据分析师', priority: 'required' },
          { roleName: 'BI专家', priority: 'recommended' }
        ],
        skills: ['data_mining', 'statistical_analysis', 'business_intelligence']
      }
    };
    
    const default_ = defaults[teamType] || defaults['营销团队'];
    
    return {
      recommendedRoles: default_.roles,
      recommendedSkills: default_.skills,
      confidence: 0.5 // 默认置信度较低
    };
  }
  
  /**
   * 将数据库行映射为记忆对象
   */
  private mapRowToMemory(row: any): NvwaXMemory {
    return {
      id: row.id,
      userId: row.user_id,
      teamType: row.team_type,
      industry: row.industry,
      requirements: typeof row.requirements === 'string' ? JSON.parse(row.requirements) : row.requirements,
      teamConfig: typeof row.team_config === 'string' ? JSON.parse(row.team_config) : row.team_config,
      agentMatches: typeof row.agent_matches === 'string' ? JSON.parse(row.agent_matches) : row.agent_matches,
      skillMatches: typeof row.skill_matches === 'string' ? JSON.parse(row.skill_matches) : row.skill_matches,
      successScore: parseFloat(row.success_score),
      userFeedback: row.user_feedback,
      usageStats: typeof row.usage_stats === 'string' ? JSON.parse(row.usage_stats) : row.usage_stats,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

// 导出单例
export const nvwaxMemoryService = new NvwaXMemoryService();
