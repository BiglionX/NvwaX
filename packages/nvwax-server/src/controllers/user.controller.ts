import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { tokenQuotaService } from '../services/token-quota.service.js';
import { paymentService } from '../services/payment.service.js';
import { successResponse, paginatedResponse, errorResponse } from '../utils/api-response.js';

export class UserController {
  // 获取当前用户信息
  async getProfile(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return errorResponse(res, 400, 'INVALID_REQUEST', 'userId is required');
      }

      const user = await userService.getUserById(userId as string);

      if (!user) {
        return errorResponse(res, 404, 'NOT_FOUND', 'User not found');
      }

      return successResponse(res, user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch user profile');
    }
  }

  // 更新用户信息
  async updateProfile(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { name, avatar, bio } = req.body;

      if (!userId) {
        return errorResponse(res, 400, 'INVALID_REQUEST', 'userId is required');
      }

      const user = await userService.updateUser(userId as string, { name, avatar, bio });

      if (!user) {
        return errorResponse(res, 404, 'NOT_FOUND', 'User not found');
      }

      return successResponse(res, user);
    } catch (error) {
      console.error('Error updating user profile:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to update user profile');
    }
  }

  // 获取用户统计数据
  async getStats(req: Request, res: Response) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return errorResponse(res, 400, 'INVALID_REQUEST', 'userId is required');
      }

      const stats = await userService.getUserStats(userId as string);
      return successResponse(res, stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch user stats');
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
        return errorResponse(res, 400, 'INVALID_REQUEST', 'userId is required');
      }

      const quota = await tokenQuotaService.getUserQuota(userId);
      if (!quota) {
        return successResponse(res, null);
      }

      return successResponse(res, {
        monthlyLimit: quota.monthly_limit,
        usedThisMonth: quota.used_this_month,
        remaining: Math.max(0, quota.monthly_limit - quota.used_this_month),
        usagePercent: Math.min(100, Math.round((quota.used_this_month / quota.monthly_limit) * 100)),
        overageTokens: quota.overage_tokens,
        overageCost: quota.overage_cost,
        totalUsed: quota.total_used,
        lastResetAt: quota.last_reset_at
      });
    } catch (error) {
      console.error('Error fetching token quota:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch token quota');
    }
  }

  /**
   * 获取当前用户的Token消费记录
   */
  async getTokenTransactions(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      if (!userId) {
        return errorResponse(res, 400, 'INVALID_REQUEST', 'userId is required');
      }

      const result = await tokenQuotaService.getUserConsumptionDetail(userId, page, limit);
      return paginatedResponse(res, result.data, result.total, page, limit);
    } catch (error) {
      console.error('Error fetching token transactions:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch token transactions');
    }
  }

  /**
   * 获取当前用户的Token购买订单
   */
  async getTokenOrders(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      if (!userId) {
        return errorResponse(res, 400, 'INVALID_REQUEST', 'userId is required');
      }

      const result = await paymentService.getUserOrders(userId, page, limit);
      return paginatedResponse(res, result.data, result.total, page, limit);
    } catch (error) {
      console.error('Error fetching token orders:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch token orders');
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
        return errorResponse(res, 400, 'INVALID_REQUEST', 'userId is required');
      }

      if (!amount || amount < 1) {
        return errorResponse(res, 400, 'INVALID_AMOUNT', 'amount must be at least 1');
      }

      if (!paymentMethod || !['wechat', 'alipay'].includes(paymentMethod)) {
        return errorResponse(res, 400, 'INVALID_PAYMENT_METHOD', 'paymentMethod must be wechat or alipay');
      }

      const order = await paymentService.createOrder(userId, amount, paymentMethod);
      
      // 获取对应的支付配置
      const paymentConfig = await paymentService.getPaymentConfig(paymentMethod);

      return successResponse(res, {
        order,
        paymentConfig: paymentConfig ? {
          provider: paymentConfig.provider,
          provider_label: paymentConfig.provider_label,
          qr_code_url: paymentConfig.qr_code_url,
          account_name: paymentConfig.account_name,
          account_info: paymentConfig.account_info
        } : null
      }, 201);
    } catch (error) {
      console.error('Error creating token order:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to create token order');
    }
  }

  /**
   * 创建 Stripe Checkout Session
   */
  async createStripeCheckoutSession(req: Request, res: Response) {
    try {
      const { userId, amount } = req.body;

      if (!userId) {
        return errorResponse(res, 400, 'INVALID_REQUEST', 'userId is required');
      }

      if (!amount || amount < 1) {
        return errorResponse(res, 400, 'INVALID_AMOUNT', 'amount must be at least 1');
      }

      if (!paymentService.isStripeAvailable()) {
        return errorResponse(res, 503, 'SERVICE_UNAVAILABLE', 'Stripe is not configured');
      }

      const result = await paymentService.createStripeCheckoutSession(userId, amount);

      return successResponse(res, result);
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to create Stripe checkout session');
    }
  }

  /**
   * 获取可用的支付方式
   */
  async getPaymentConfigs(req: Request, res: Response) {
    try {
      const configs = await paymentService.getEnabledPaymentConfigs();
      return successResponse(res, {
        providers: configs.map(c => ({
          provider: c.provider,
          provider_label: c.provider_label,
          qr_code_url: c.qr_code_url,
          account_name: c.account_name,
          account_info: c.account_info
        })),
        stripeAvailable: paymentService.isStripeAvailable()
      });
    } catch (error) {
      console.error('Error fetching payment configs:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch payment configs');
    }
  }
}

export const userController = new UserController();
