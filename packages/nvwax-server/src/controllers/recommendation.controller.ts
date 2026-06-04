/**
 * RecommendationController
 * 
 * Agent 和 Skill 推荐 API 控制器
 * 对应 PRD v2.0 章节 2.5
 */

import { Request, Response } from 'express';
import { recommendationService } from '../services/recommendation.service.js';
import { RecommendationRequest } from '../types/plugin-capabilities.types.js';

export class RecommendationController {
  /**
   * POST /v2/agents/recommend
   * 提交插件 ID，返回推荐的 Agent 列表
   * 对应 PRD 2.5.1
   */
  async recommendAgents(req: Request, res: Response): Promise<void> {
    try {
      const { plugin_ids, industry_tags, limit, include_skills } = req.body;

      if (!plugin_ids || !Array.isArray(plugin_ids) || plugin_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'plugin_ids array is required with at least one plugin ID'
        });
        return;
      }

      console.log(`📥 Agent recommendation request for ${plugin_ids.length} plugin(s)`);

      const request: RecommendationRequest = {
        plugin_ids,
        industry_tags: industry_tags || [],
        limit: limit || 5,
        include_skills: include_skills !== false
      };

      const response = await recommendationService.getRecommendedAgents(request);

      res.json({
        success: true,
        data: response
      });
    } catch (error: any) {
      console.error('❌ Recommendation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get recommendations'
      });
    }
  }

  /**
   * GET /v2/agents/recommend-skills
   * 根据行业标签推荐 Skills
   */
  async recommendSkills(req: Request, res: Response): Promise<void> {
    try {
      const { industry_tags } = req.query;

      let tags: string[] = [];
      if (typeof industry_tags === 'string') {
        tags = industry_tags.split(',').map(t => t.trim()).filter(Boolean);
      } else if (Array.isArray(industry_tags)) {
        tags = industry_tags as string[];
      }

      if (tags.length === 0) {
        res.status(400).json({
          success: false,
          error: 'industry_tags query parameter is required (comma-separated)'
        });
        return;
      }

      console.log(`📥 Skill recommendation for industries: ${tags.join(', ')}`);

      const skills = await recommendationService.recommendSkills(tags);

      res.json({
        success: true,
        data: {
          recommended_skills: skills,
          total_skills: skills.length
        }
      });
    } catch (error: any) {
      console.error('❌ Skill recommendation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to recommend skills'
      });
    }
  }
}

export const recommendationController = new RecommendationController();
