/**
 * 悬赏控制器
 */

import { Request, Response } from 'express';
import { BountyService } from '../services/bounty.service.js';
import { databaseService } from '../services/database.service.js';

const bountyService = new BountyService(databaseService.getPool());

export class BountyController {
  /**
   * 创建悬赏
   */
  async createBounty(req: Request, res: Response) {
    try {
      const userId = req.user?.id; // 从 JWT 中间件获取
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '需要登录' },
        });
      }
      
      const { title, description, requiredSkills, rewardAmount, currency, deadline } = req.body;
      
      // 验证必填字段
      if (!title || !description || !requiredSkills || !rewardAmount) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '缺少必填字段' },
        });
      }
      
      const bounty = await bountyService.createBounty({
        title,
        description,
        requiredSkills,
        rewardAmount,
        currency,
        deadline: deadline ? new Date(deadline) : undefined,
        creatorId: userId,
      });
      
      res.status(201).json({
        success: true,
        message: '悬赏发布成功',
        data: bounty,
      });
      
    } catch (error: any) {
      console.error('Create bounty error:', error);
      
      if (error.message.includes('INSUFFICIENT_POINTS')) {
        return res.status(400).json({
          success: false,
          error: { code: 'INSUFFICIENT_POINTS', message: error.message },
        });
      }
      
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '服务器错误' },
      });
    }
  }

  /**
   * 获取悬赏列表
   */
  async getBounties(req: Request, res: Response) {
    try {
      const { status, creatorId, claimerId, skill, minReward, q, page = 1, limit = 20 } = req.query;
      
      const result = await bountyService.getBounties({
        status: status as string,
        creatorId: creatorId as string,
        claimerId: claimerId as string,
        skill: skill as string,
        searchQuery: q as string,
        minReward: minReward ? parseFloat(minReward as string) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      
      res.json({
        success: true,
        data: {
          bounties: result.bounties,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: result.total,
            totalPages: Math.ceil(result.total / parseInt(limit as string)),
          },
        },
      });
      
    } catch (error) {
      console.error('Get bounties error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '服务器错误' },
      });
    }
  }

  /**
   * 获取悬赏详情
   */
  async getBountyById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const bounty = await bountyService.getBountyById(id as string);
      
      if (!bounty) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '悬赏不存在' },
        });
      }
      
      res.json({
        success: true,
        data: bounty,
      });
      
    } catch (error) {
      console.error('Get bounty error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '服务器错误' },
      });
    }
  }

  /**
   * 领取悬赏
   */
  async claimBounty(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '需要登录' },
        });
      }
      
      const { id } = req.params;
      
      const bounty = await bountyService.claimBounty(id as string, userId);
      
      res.json({
        success: true,
        message: '悬赏领取成功',
        data: bounty,
      });
      
    } catch (error: any) {
      console.error('Claim bounty error:', error);
      
      if (error.message.includes('BOUNTY_NOT_FOUND')) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '悬赏不存在' },
        });
      }
      
      if (error.message.includes('BOUNTY_NOT_AVAILABLE') || error.message.includes('CANNOT_CLAIM_OWN')) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OPERATION', message: error.message },
        });
      }
      
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '服务器错误' },
      });
    }
  }

  /**
   * 提交成果
   */
  async submitBounty(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '需要登录' },
        });
      }
      
      const { id } = req.params;
      const { submissionUrl } = req.body;
      
      if (!submissionUrl) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '请提供提交链接' },
        });
      }
      
      const bounty = await bountyService.submitBounty(id as string, userId, submissionUrl);
      
      res.json({
        success: true,
        message: '成果提交成功，等待发布者验证',
        data: bounty,
      });
      
    } catch (error: any) {
      console.error('Submit bounty error:', error);
      
      if (error.message.includes('NOT_CLAIMER') || error.message.includes('INVALID_STATUS')) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OPERATION', message: error.message },
        });
      }
      
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '服务器错误' },
      });
    }
  }

  /**
   * 验证并支付悬赏
   */
  async verifyBounty(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '需要登录' },
        });
      }
      
      const { id } = req.params;
      const { approved, notes } = req.body;
      
      if (approved === undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '请指定是否批准' },
        });
      }
      
      const bounty = await bountyService.verifyBounty(id as string, userId, approved, notes);
      
      res.json({
        success: true,
        message: approved ? '验证通过，积分已发放' : '验证未通过',
        data: bounty,
      });
      
    } catch (error: any) {
      console.error('Verify bounty error:', error);
      
      if (error.message.includes('NOT_CREATOR') || error.message.includes('INVALID_STATUS')) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OPERATION', message: error.message },
        });
      }
      
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '服务器错误' },
      });
    }
  }

  /**
   * 取消悬赏
   */
  async cancelBounty(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '需要登录' },
        });
      }
      
      const { id } = req.params;
      
      const bounty = await bountyService.cancelBounty(id as string, userId);
      
      res.json({
        success: true,
        message: '悬赏已取消，积分已退还',
        data: bounty,
      });
      
    } catch (error: any) {
      console.error('Cancel bounty error:', error);
      
      if (error.message.includes('NOT_CREATOR') || error.message.includes('INVALID_STATUS')) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_OPERATION', message: error.message },
        });
      }
      
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '服务器错误' },
      });
    }
  }

  /**
   * 获取热门搜索词
   */
  async getPopularSearches(req: Request, res: Response) {
    try {
      const { limit = 10 } = req.query;
      
      const popularSearches = await bountyService.getPopularSearches(
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        data: popularSearches,
      });
      
    } catch (error) {
      console.error('Get popular searches error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '服务器错误' },
      });
    }
  }

  /**
   * 获取搜索建议
   */
  async getSearchSuggestions(req: Request, res: Response) {
    try {
      const { q, limit = 5 } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.json({
          success: true,
          data: [],
        });
      }
      
      const suggestions = await bountyService.getSearchSuggestions(
        q,
        parseInt(limit as string)
      );
      
      res.json({
        success: true,
        data: suggestions,
      });
      
    } catch (error) {
      console.error('Get search suggestions error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '服务器错误' },
      });
    }
  }
}

export const bountyController = new BountyController();
