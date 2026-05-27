import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { tokenQuotaService } from '../services/token-quota.service.js';
import { paymentService } from '../services/payment.service.js';

export class UserController {
  // 获取当前用户信息
  async getProfile(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const user = await userService.getUserById(userId as string);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  // 更新用户信息
  async updateProfile(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { name, avatar, bio } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const user = await userService.updateUser(userId as string, { name, avatar, bio });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  }

  // 获取用户统计数据
  async getStats(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const stats = await userService.getUserStats(userId as string);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  }

  // ========== Token配额相关 ==========

  /**
   * 获取当前用户的Token配额和消耗情况
   */
  async getTokenQuota(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const quota = await tokenQuotaService.getUserQuota(userId);
      if (!quota) {
        return res.json({
          data: null,
          message: 'No quota record yet'
        });
      }

      res.json({
        data: {
          monthlyLimit: quota.monthly_limit,
          usedThisMonth: quota.used_this_month,
          remaining: Math.max(0, quota.monthly_limit - quota.used_this_month),
          usagePercent: Math.min(100, Math.round((quota.used_this_month / quota.monthly_limit) * 100)),
          overageTokens: quota.overage_tokens,
          overageCost: quota.overage_cost,
          totalUsed: quota.total_used,
          lastResetAt: quota.last_reset_at
        }
      });
    } catch (error) {
      console.error('Error fetching token quota:', error);
      res.status(500).json({ error: 'Failed to fetch token quota' });
    }
  }

  /**
   * 获取当前用户的Token消费记录
   */
  async getTokenTransactions(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const result = await tokenQuotaService.getUserConsumptionDetail(userId, page, limit);
      res.json({
        data: result.data,
        total: result.total,
        page,
        limit
      });
    } catch (error) {
      console.error('Error fetching token transactions:', error);
      res.status(500).json({ error: 'Failed to fetch token transactions' });
    }
  }

  /**
   * 获取当前用户的Token购买订单
   */
  async getTokenOrders(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const result = await paymentService.getUserOrders(userId, page, limit);
      res.json({
        data: result.data,
        total: result.total,
        page,
        limit
      });
    } catch (error) {
      console.error('Error fetching token orders:', error);
      res.status(500).json({ error: 'Failed to fetch token orders' });
    }
  }

  /**
   * 创建Token购买订单
   */
  async createTokenOrder(req: Request, res: Response) {
    try {
      const userId = req.body.userId;
      const { amount, paymentMethod } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      if (!amount || amount < 1) {
        return res.status(400).json({ error: 'amount must be at least 1' });
      }

      if (!paymentMethod || !['wechat', 'alipay'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'paymentMethod must be wechat or alipay' });
      }

      const order = await paymentService.createOrder(userId, amount, paymentMethod);
      
      // 获取对应的支付配置
      const paymentConfig = await paymentService.getPaymentConfig(paymentMethod);

      res.status(201).json({
        data: {
          order,
          paymentConfig: paymentConfig ? {
            provider: paymentConfig.provider,
            provider_label: paymentConfig.provider_label,
            qr_code_url: paymentConfig.qr_code_url,
            account_name: paymentConfig.account_name,
            account_info: paymentConfig.account_info
          } : null
        }
      });
    } catch (error) {
      console.error('Error creating token order:', error);
      res.status(500).json({ error: 'Failed to create token order' });
    }
  }

  /**
   * 获取可用的支付方式
   */
  async getPaymentConfigs(req: Request, res: Response) {
    try {
      const configs = await paymentService.getEnabledPaymentConfigs();
      res.json({
        data: configs.map(c => ({
          provider: c.provider,
          provider_label: c.provider_label,
          qr_code_url: c.qr_code_url,
          account_name: c.account_name,
          account_info: c.account_info
        }))
      });
    } catch (error) {
      console.error('Error fetching payment configs:', error);
      res.status(500).json({ error: 'Failed to fetch payment configs' });
    }
  }
}

export const userController = new UserController();
