import { Request, Response } from 'express';
import { agentSearchService } from '../services/agent-search.service.js';
import { skillHubService } from '../services/skillhub.service.js';
import { skillSearchService } from '../services/skill-search.service.js';
import { crawlerSchedulerService } from '../services/crawler-scheduler.service.js';

export class SearchController {
  async searchAgents(req: Request, res: Response) {
    try {
      const { q, page, limit } = req.query;
      const query = q as string || '';
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;

      const result = await agentSearchService.searchAgents(query, pageNum, limitNum);
      
      res.json(result);
    } catch (error) {
      console.error('Error in searchAgents:', error);
      res.status(500).json({ error: 'Failed to search agents' });
    }
  }

  async searchSkills(req: Request, res: Response) {
    try {
      const { q, page, limit } = req.query;
      const query = q as string || '';
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;

      const result = await skillHubService.searchSkills(query, pageNum, limitNum);
      
      res.json(result);
    } catch (error) {
      console.error('Error in searchSkills:', error);
      res.status(500).json({ error: 'Failed to search skills' });
    }
  }

  async unifiedSearch(req: Request, res: Response) {
    try {
      const { q, page, limit } = req.body;
      const query = q || '';
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;

      const [agentsResult, skillsResult] = await Promise.all([
        agentSearchService.searchAgents(query, pageNum, Math.floor(limitNum / 2)),
        skillHubService.searchSkills(query, pageNum, Math.floor(limitNum / 2))
      ]);

      res.json({
        agents: agentsResult,
        skills: skillsResult
      });
    } catch (error) {
      console.error('Error in unifiedSearch:', error);
      res.status(500).json({ error: 'Failed to perform unified search' });
    }
  }

  /**
   * 当搜索无结果时，推荐相关的 Skills
   */
  async recommendSkills(req: Request, res: Response) {
    try {
      const { q, limit } = req.query;
      const query = q as string || '';
      const limitNum = parseInt(limit as string) || 5;

      const recommendations = await skillSearchService.recommendSkillsForQuery(query, limitNum);
      
      res.json({
        query,
        recommendations,
        message: '未找到相关 Agent，但发现以下 Skills 可帮助您构建所需的 Agent'
      });
    } catch (error) {
      console.error('Error in recommendSkills:', error);
      res.status(500).json({ error: 'Failed to recommend skills' });
    }
  }

  /**
   * 获取可用于构建 Agent 的热门 Skills
   */
  async getPopularSkills(req: Request, res: Response) {
    try {
      const { limit } = req.query;
      const limitNum = parseInt(limit as string) || 10;

      const skills = await skillSearchService.getPopularSkillsForAgentBuilding(limitNum);
      
      res.json({
        skills,
        message: '以下是可用于构建 Agent 的热门 Skills'
      });
    } catch (error) {
      console.error('Error in getPopularSkills:', error);
      res.status(500).json({ error: 'Failed to fetch popular skills' });
    }
  }

  /**
   * 手动触发爬虫任务
   */
  async triggerCrawl(req: Request, res: Response) {
    try {
      const result = await crawlerSchedulerService.triggerManualCrawl();
      
      res.json({
        success: true,
        message: '爬取任务已启动',
        result
      });
    } catch (error) {
      console.error('Error in triggerCrawl:', error);
      res.status(500).json({ error: 'Failed to trigger crawl' });
    }
  }

  /**
   * 获取爬虫状态
   */
  async getCrawlerStatus(req: Request, res: Response) {
    try {
      const status = crawlerSchedulerService.getStatus();
      
      res.json(status);
    } catch (error) {
      console.error('Error in getCrawlerStatus:', error);
      res.status(500).json({ error: 'Failed to get crawler status' });
    }
  }
}

export const searchController = new SearchController();
