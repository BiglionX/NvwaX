import { Pool } from 'pg';
import { databaseService } from './database.service.js';

export interface UserTokenQuota {
  id: string;
  user_id: string;
  monthly_limit: number;
  used_this_month: number;
  total_used: number;
  overage_tokens: number;
  overage_cost: number;
  last_reset_at: Date;
  reset_day: number;
  created_at: Date;
  updated_at: Date;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  quota_id?: string;
  tokens_consumed: number;
  is_overage: boolean;
  overage_cost: number;
  endpoint?: string;
  source_type: string;
  description?: string;
  model?: string;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface TokenConsumptionBreakdown {
  source_type: string;
  endpoint: string;
  total_tokens: number;
  request_count: number;
}

export interface UserTokenStats {
  user_id: string;
  user_name: string;
  user_email: string;
  monthly_limit: number;
  used_this_month: number;
  remaining: number;
  usage_percent: number;
  overage_tokens: number;
  overage_cost: number;
  total_used: number;
  last_reset_at: Date;
}

export class TokenQuotaService {
  private pool: Pool;

  // 定价：超出后 ¥10 / 1,000,000 tokens
  private readonly OVERAGE_RATE = 10 / 1000000; // 0.00001 元/token

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * 获取用户的Token配额信息
   */
  async getUserQuota(userId: string): Promise<UserTokenQuota | null> {
    // 先检查是否需要重置月度配额
    await this.autoResetMonthlyQuota(userId);

    const result = await this.pool.query(
      'SELECT * FROM user_token_quotas WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatQuota(result.rows[0]);
  }

  /**
   * 检查用户是否有足够的Token额度，如果有则扣减
   * 返回扣减结果
   */
  async checkAndDeductTokens(
    userId: string,
    tokens: number,
    options?: {
      endpoint?: string;
      sourceType?: string;
      description?: string;
      model?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    allowed: boolean;
    remaining: number;
    isOverage: boolean;
    overageTokens: number;
    overageCost: number;
  }> {
    if (tokens <= 0) {
      return { allowed: true, remaining: 0, isOverage: false, overageTokens: 0, overageCost: 0 };
    }

    // 获取或创建配额记录
    let quota = await this.getUserQuota(userId);
    if (!quota) {
      quota = await this.createUserQuota(userId);
    }

    // 自动检查是否跨月需要重置
    await this.autoResetMonthlyQuota(userId);
    quota = await this.getUserQuota(userId);
    if (!quota) {
      quota = await this.createUserQuota(userId);
    }

    const remaining = Math.max(0, quota.monthly_limit - quota.used_this_month);
    let isOverage = false;
    let overageTokens = 0;
    let overageCost = 0;

    if (tokens <= remaining) {
      // 在免费额度内
      await this.pool.query(
        'UPDATE user_token_quotas SET used_this_month = used_this_month + $1, total_used = total_used + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [tokens, userId]
      );
    } else {
      // 超额消费
      isOverage = true;
      if (remaining > 0) {
        // 先消耗剩余的免费额度
        overageTokens = tokens - remaining;
        overageCost = overageTokens * this.OVERAGE_RATE;

        await this.pool.query(
          `UPDATE user_token_quotas SET 
            used_this_month = used_this_month + $1, 
            total_used = total_used + $1,
            overage_tokens = overage_tokens + $2,
            overage_cost = overage_cost + $3,
            updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $4`,
          [tokens, overageTokens, overageCost, userId]
        );
      } else {
        // 已经没有免费额度了，全部超额
        overageTokens = tokens;
        overageCost = overageTokens * this.OVERAGE_RATE;

        await this.pool.query(
          `UPDATE user_token_quotas SET 
            used_this_month = used_this_month + $1, 
            total_used = total_used + $1,
            overage_tokens = overage_tokens + $2,
            overage_cost = overage_cost + $3,
            updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $4`,
          [tokens, overageTokens, overageCost, userId]
        );
      }
    }

    // 记录消费明细
    await this.recordTransaction(userId, {
      quotaId: quota.id,
      tokensConsumed: tokens,
      isOverage,
      overageCost,
      endpoint: options?.endpoint,
      sourceType: options?.sourceType || 'api_call',
      description: options?.description,
      model: options?.model,
      metadata: options?.metadata || {}
    });

    const newRemaining = Math.max(0, quota.monthly_limit - quota.used_this_month - tokens);

    return {
      allowed: true, // 总是允许（超额收费模式）
      remaining: Math.max(0, newRemaining),
      isOverage,
      overageTokens,
      overageCost: Math.round(overageCost * 100) / 100
    };
  }

  /**
   * 创建用户配额记录
   */
  async createUserQuota(userId: string, monthlyLimit: number = 1000000): Promise<UserTokenQuota> {
    // 检查是否已存在
    const existing = await this.pool.query(
      'SELECT id FROM user_token_quotas WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return (await this.getUserQuota(userId))!;
    }

    const result = await this.pool.query(
      `INSERT INTO user_token_quotas (user_id, monthly_limit, reset_day)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, monthlyLimit, 1]
    );

    return this.formatQuota(result.rows[0]);
  }

  /**
   * 自动重置月度配额（如果跨月了）
   */
  async autoResetMonthlyQuota(userId: string): Promise<boolean> {
    const quota = await this.pool.query(
      'SELECT * FROM user_token_quotas WHERE user_id = $1',
      [userId]
    );

    if (quota.rows.length === 0) {
      return false;
    }

    const q = quota.rows[0];
    const now = new Date();
    const lastReset = new Date(q.last_reset_at);
    const resetDay = q.reset_day || 1;

    // 判断是否需要重置：上次重置日期和当前日期不在同月同周期
    const needReset = this.shouldResetMonthly(lastReset, now, resetDay);

    if (needReset) {
      await this.pool.query(
        `UPDATE user_token_quotas SET 
          used_this_month = 0,
          last_reset_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId]
      );
      return true;
    }

    return false;
  }

  /**
   * 判断是否需要重置月度配额
   */
  private shouldResetMonthly(lastReset: Date, now: Date, resetDay: number): boolean {
    const lastResetMonth = lastReset.getMonth();
    const lastResetYear = lastReset.getFullYear();
    const nowMonth = now.getMonth();
    const nowYear = now.getFullYear();

    // 跨月即需要重置
    if (lastResetYear < nowYear) return true;
    if (lastResetYear === nowYear && lastResetMonth < nowMonth) return true;

    return false;
  }

  /**
   * 全局重置所有用户的月度配额（定时任务调用）
   */
  async resetAllMonthlyQuotas(): Promise<number> {
    const now = new Date();
    const result = await this.pool.query(
      `UPDATE user_token_quotas SET 
        used_this_month = 0,
        last_reset_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE last_reset_at < $1
       RETURNING id`,
      [new Date(now.getFullYear(), now.getMonth(), 1)]
    );

    console.log(`[TokenQuota] Reset ${result.rows.length} user quotas for new month`);
    return result.rows.length;
  }

  /**
   * 记录Token消费明细
   */
  async recordTransaction(
    userId: string,
    data: {
      quotaId?: string;
      tokensConsumed: number;
      isOverage: boolean;
      overageCost: number;
      endpoint?: string;
      sourceType?: string;
      description?: string;
      model?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<TokenTransaction> {
    const result = await this.pool.query(
      `INSERT INTO token_transactions 
       (user_id, quota_id, tokens_consumed, is_overage, overage_cost, endpoint, source_type, description, model, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        data.quotaId || null,
        data.tokensConsumed,
        data.isOverage,
        data.overageCost,
        data.endpoint || null,
        data.sourceType || 'api_call',
        data.description || null,
        data.model || null,
        JSON.stringify(data.metadata || {})
      ]
    );

    return this.formatTransaction(result.rows[0]);
  }

  /**
   * 获取用户Token消耗明细（分页）
   */
  async getUserConsumptionDetail(
    userId: string,
    page: number = 1,
    limit: number = 20,
    sourceType?: string
  ): Promise<{ data: TokenTransaction[]; total: number }> {
    let query = 'SELECT * FROM token_transactions WHERE user_id = $1';
    const params: any[] = [userId];

    if (sourceType) {
      query += ' AND source_type = $2';
      params.push(sourceType);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, (page - 1) * limit);

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(query, params),
      this.pool.query(countQuery, sourceType ? [userId, sourceType] : [userId])
    ]);

    return {
      data: dataResult.rows.map(row => this.formatTransaction(row)),
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Admin：获取所有用户的Token统计
   */
  async getAllUsersTokenStats(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<{ data: UserTokenStats[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];

    if (search) {
      whereClause = `WHERE (u.email ILIKE $1 OR u.name ILIKE $1)`;
      params.push(`%${search}%`);
    }

    const paramOffset = params.length;
    params.push(limit, (page - 1) * limit);

    const query = `
      SELECT 
        u.id as user_id,
        u.email as user_email,
        u.name as user_name,
        COALESCE(q.monthly_limit, 1000000) as monthly_limit,
        COALESCE(q.used_this_month, 0) as used_this_month,
        COALESCE(q.total_used, 0) as total_used,
        COALESCE(q.overage_tokens, 0) as overage_tokens,
        COALESCE(q.overage_cost, 0) as overage_cost,
        COALESCE(q.last_reset_at, u.created_at) as last_reset_at
      FROM users u
      LEFT JOIN user_token_quotas q ON u.id = q.user_id
      ${whereClause}
      ORDER BY COALESCE(q.used_this_month, 0) DESC
      LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) FROM users u
      LEFT JOIN user_token_quotas q ON u.id = q.user_id
      ${whereClause}
    `;

    const searchParams = search ? [params[0]] : [];
    const [dataResult, countResult] = await Promise.all([
      this.pool.query(query, params),
      this.pool.query(countQuery, searchParams)
    ]);

    const data = dataResult.rows.map(row => ({
      user_id: row.user_id,
      user_name: row.user_name || row.user_email,
      user_email: row.user_email,
      monthly_limit: parseInt(row.monthly_limit),
      used_this_month: parseInt(row.used_this_month),
      remaining: Math.max(0, parseInt(row.monthly_limit) - parseInt(row.used_this_month)),
      usage_percent: Math.min(100, Math.round((parseInt(row.used_this_month) / parseInt(row.monthly_limit)) * 100)),
      overage_tokens: parseInt(row.overage_tokens),
      overage_cost: parseFloat(row.overage_cost),
      total_used: parseInt(row.total_used),
      last_reset_at: new Date(row.last_reset_at)
    }));

    return {
      data,
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Admin：Token消耗来源分类统计
   */
  async getTokenConsumptionBreakdown(
    period: 'day' | 'week' | 'month' = 'month'
  ): Promise<TokenConsumptionBreakdown[]> {
    let interval: string;
    switch (period) {
      case 'day':
        interval = '24 hours';
        break;
      case 'week':
        interval = '7 days';
        break;
      case 'month':
      default:
        interval = '30 days';
        break;
    }

    const result = await this.pool.query(
      `SELECT 
        source_type,
        COALESCE(endpoint, 'unknown') as endpoint,
        SUM(tokens_consumed) as total_tokens,
        COUNT(*) as request_count
       FROM token_transactions
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY source_type, COALESCE(endpoint, 'unknown')
       ORDER BY total_tokens DESC
       LIMIT 20`
    );

    return result.rows.map(row => ({
      source_type: row.source_type,
      endpoint: row.endpoint,
      total_tokens: parseInt(row.total_tokens),
      request_count: parseInt(row.request_count)
    }));
  }

  /**
   * Admin：获取Token消费总览统计
   */
  async getTokenOverviewStats(): Promise<{
    totalUsers: number;
    totalTokensThisMonth: number;
    totalOverageTokens: number;
    totalOverageCost: number;
    averageUsagePercent: number;
  }> {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COALESCE(SUM(used_this_month), 0) as total_tokens_this_month,
        COALESCE(SUM(overage_tokens), 0) as total_overage_tokens,
        COALESCE(SUM(overage_cost), 0) as total_overage_cost,
        COALESCE(AVG(
          CASE WHEN monthly_limit > 0 
            THEN (used_this_month::decimal / monthly_limit * 100) 
            ELSE 0 
          END
        ), 0) as avg_usage_percent
      FROM user_token_quotas
    `);

    const row = result.rows[0];
    return {
      totalUsers: parseInt(row.total_users),
      totalTokensThisMonth: parseInt(row.total_tokens_this_month),
      totalOverageTokens: parseInt(row.total_overage_tokens),
      totalOverageCost: parseFloat(row.total_overage_cost),
      averageUsagePercent: Math.round(parseFloat(row.avg_usage_percent))
    };
  }

  /**
   * 为已付款用户增加购买的Token配额（增加monthly_limit）
   */
  async addPurchasedTokens(userId: string, tokens: number): Promise<void> {
    // 确保用户有配额记录
    let quota = await this.getUserQuota(userId);
    if (!quota) {
      quota = await this.createUserQuota(userId);
    }

    await this.pool.query(
      `UPDATE user_token_quotas SET 
        monthly_limit = monthly_limit + $1,
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [tokens, userId]
    );

    console.log(`[TokenQuota] Added ${tokens} purchased tokens to user ${userId}`);
  }

  /**
   * 格式化配额记录
   */
  private formatQuota(row: any): UserTokenQuota {
    return {
      id: row.id,
      user_id: row.user_id,
      monthly_limit: parseInt(row.monthly_limit),
      used_this_month: parseInt(row.used_this_month),
      total_used: parseInt(row.total_used),
      overage_tokens: parseInt(row.overage_tokens),
      overage_cost: parseFloat(row.overage_cost),
      last_reset_at: new Date(row.last_reset_at),
      reset_day: row.reset_day,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * 格式化交易记录
   */
  private formatTransaction(row: any): TokenTransaction {
    return {
      id: row.id,
      user_id: row.user_id,
      quota_id: row.quota_id,
      tokens_consumed: parseInt(row.tokens_consumed),
      is_overage: row.is_overage,
      overage_cost: parseFloat(row.overage_cost),
      endpoint: row.endpoint,
      source_type: row.source_type,
      description: row.description,
      model: row.model,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      created_at: new Date(row.created_at)
    };
  }
}

export const tokenQuotaService = new TokenQuotaService();
