import { Pool } from 'pg';
import { databaseService } from './database.service.js';
import { tokenQuotaService } from './token-quota.service.js';

export interface PaymentConfig {
  id: string;
  provider: string;
  provider_label: string;
  enabled: boolean;
  qr_code_url: string | null;
  account_name: string | null;
  account_info: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface TokenOrder {
  id: string;
  user_id: string;
  amount: number;
  tokens: number;
  token_rate: number;
  payment_method: string;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: Date | null;
  confirmed_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export class PaymentService {
  private pool: Pool;

  // 定价：¥10 = 1,000,000 tokens
  private readonly TOKEN_RATE = 100000; // 每元兑换token数

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * 获取所有支付配置
   */
  async getPaymentConfigs(): Promise<PaymentConfig[]> {
    const result = await this.pool.query(
      'SELECT * FROM payment_configs ORDER BY sort_order ASC'
    );
    return result.rows.map(row => this.formatConfig(row));
  }

  /**
   * 获取单个支付配置
   */
  async getPaymentConfig(provider: string): Promise<PaymentConfig | null> {
    const result = await this.pool.query(
      'SELECT * FROM payment_configs WHERE provider = $1',
      [provider]
    );
    return result.rows.length > 0 ? this.formatConfig(result.rows[0]) : null;
  }

  /**
   * 获取已启用的支付配置（供用户端使用）
   */
  async getEnabledPaymentConfigs(): Promise<PaymentConfig[]> {
    const result = await this.pool.query(
      'SELECT * FROM payment_configs WHERE enabled = true ORDER BY sort_order ASC'
    );
    return result.rows.map(row => this.formatConfig(row));
  }

  /**
   * 保存/更新支付配置（upsert）
   */
  async savePaymentConfig(data: {
    provider: string;
    provider_label: string;
    qr_code_url?: string;
    account_name?: string;
    account_info?: string;
    sort_order?: number;
  }): Promise<PaymentConfig> {
    const result = await this.pool.query(
      `INSERT INTO payment_configs (provider, provider_label, qr_code_url, account_name, account_info, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (provider)
       DO UPDATE SET
         provider_label = $2,
         qr_code_url = $3,
         account_name = $4,
         account_info = $5,
         sort_order = $6,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        data.provider,
        data.provider_label,
        data.qr_code_url || null,
        data.account_name || null,
        data.account_info || null,
        data.sort_order ?? 0
      ]
    );
    return this.formatConfig(result.rows[0]);
  }

  /**
   * 启用/禁用支付配置
   */
  async togglePaymentConfig(provider: string, enabled: boolean): Promise<PaymentConfig | null> {
    const result = await this.pool.query(
      'UPDATE payment_configs SET enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2 RETURNING *',
      [enabled, provider]
    );
    return result.rows.length > 0 ? this.formatConfig(result.rows[0]) : null;
  }

  /**
   * 创建Token购买订单
   */
  async createOrder(userId: string, amount: number, paymentMethod: string): Promise<TokenOrder> {
    // 计算token数量：10元 = 100万token
    const tokens = Math.floor(amount * this.TOKEN_RATE);

    const result = await this.pool.query(
      `INSERT INTO token_orders (user_id, amount, tokens, token_rate, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [userId, amount, tokens, this.TOKEN_RATE, paymentMethod]
    );
    return this.formatOrder(result.rows[0]);
  }

  /**
   * 获取用户订单历史
   */
  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: TokenOrder[]; total: number }> {
    const offset = (page - 1) * limit;
    const [dataResult, countResult] = await Promise.all([
      this.pool.query(
        'SELECT * FROM token_orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      ),
      this.pool.query(
        'SELECT COUNT(*) FROM token_orders WHERE user_id = $1',
        [userId]
      )
    ]);

    return {
      data: dataResult.rows.map(row => this.formatOrder(row)),
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Admin：获取所有订单（分页）
   */
  async getAllOrders(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{ data: TokenOrder[]; total: number }> {
    const offset = (page - 1) * limit;
    let query = 'SELECT o.*, u.email as user_email, u.name as user_name FROM token_orders o LEFT JOIN users u ON o.user_id = u.id';
    let countQuery = 'SELECT COUNT(*) FROM token_orders';
    const params: any[] = [];
    const countParams: any[] = [];

    if (status) {
      query += ' WHERE o.status = $1';
      countQuery += ' WHERE status = $1';
      params.push(status);
      countParams.push(status);
    }

    query += ' ORDER BY o.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(query, params),
      this.pool.query(countQuery, countParams)
    ]);

    return {
      data: dataResult.rows.map(row => ({
        ...this.formatOrder(row),
        user_email: row.user_email,
        user_name: row.user_name
      })),
      total: parseInt(countResult.rows[0].count)
    };
  }

  /**
   * Admin确认付款 - 为用户增加token配额
   */
  async confirmOrder(orderId: string, adminId: string): Promise<TokenOrder | null> {
    // 开始事务
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 获取订单并锁定
      const orderResult = await client.query(
        'SELECT * FROM token_orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const order = orderResult.rows[0];
      if (order.status !== 'pending') {
        await client.query('ROLLBACK');
        return null;
      }

      // 更新订单状态
      const updateResult = await client.query(
        `UPDATE token_orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP, confirmed_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [adminId, orderId]
      );

      // 为用户增加token配额（添加到剩余可用额度）
      await tokenQuotaService.addPurchasedTokens(order.user_id, order.tokens);

      await client.query('COMMIT');
      return this.formatOrder(updateResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string): Promise<TokenOrder | null> {
    const result = await this.pool.query(
      `UPDATE token_orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending' RETURNING *`,
      [orderId]
    );
    return result.rows.length > 0 ? this.formatOrder(result.rows[0]) : null;
  }

  /**
   * 格式化配置记录
   */
  private formatConfig(row: any): PaymentConfig {
    return {
      id: row.id,
      provider: row.provider,
      provider_label: row.provider_label,
      enabled: row.enabled,
      qr_code_url: row.qr_code_url,
      account_name: row.account_name,
      account_info: row.account_info,
      sort_order: row.sort_order,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * 格式化订单记录
   */
  private formatOrder(row: any): TokenOrder {
    return {
      id: row.id,
      user_id: row.user_id,
      amount: parseFloat(row.amount),
      tokens: row.tokens,
      token_rate: row.token_rate,
      payment_method: row.payment_method,
      status: row.status,
      paid_at: row.paid_at ? new Date(row.paid_at) : null,
      confirmed_by: row.confirmed_by,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

export const paymentService = new PaymentService();
