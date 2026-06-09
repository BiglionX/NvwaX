import { Pool } from 'pg';
import { databaseService } from './database.service.js';
import { tokenQuotaService } from './token-quota.service.js';
import Stripe from 'stripe';

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
  stripe_session_id: string | null;
  paid_at: Date | null;
  confirmed_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface StripeSessionResult {
  sessionId: string;
  sessionUrl: string;
  orderId: string;
}

export class PaymentService {
  private pool: Pool;
  private stripe: Stripe | null = null;

  // 定价：¥10 = 1,000,000 tokens
  private readonly TOKEN_RATE = 100000; // 每元兑换token数

  constructor() {
    this.pool = databaseService.getPool();

    // 初始化 Stripe（如果配置了密钥）
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2026-05-27.dahlia'
      });
      console.log('✅ Stripe configured');
    } else {
      console.warn('⚠️ STRIPE_SECRET_KEY not configured');
    }
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
   * 检查 Stripe 是否可用
   */
  isStripeAvailable(): boolean {
    return this.stripe !== null;
  }

  /**
   * 创建 Stripe Checkout Session
   */
  async createStripeCheckoutSession(
    userId: string,
    amount: number
  ): Promise<StripeSessionResult> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // 计算 token 数量
    const tokens = Math.floor(amount * this.TOKEN_RATE);

    // 先创建本地订单
    const order = await this.createOrder(userId, amount, 'stripe');

    // Stripe 金额以美分计（amount 为 USD）
    const unitAmountInCents = Math.round(amount * 100);

    const baseUrl = process.env.STRIPE_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'NvwaX Token',
              description: `${tokens.toLocaleString()} Tokens`
            },
            unit_amount: unitAmountInCents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${baseUrl}/token-purchase?success=true&order_id=${order.id}`,
      cancel_url: `${baseUrl}/token-purchase?cancelled=true`,
      metadata: {
        order_id: order.id,
        user_id: userId,
        tokens: tokens.toString()
      }
    });

    // 保存 stripe_session_id
    await this.pool.query(
      'UPDATE token_orders SET stripe_session_id = $1 WHERE id = $2',
      [session.id, order.id]
    );

    return {
      sessionId: session.id,
      sessionUrl: session.url || '',
      orderId: order.id
    };
  }

  /**
   * 处理 Stripe Webhook 事件
   */
  async handleStripeWebhook(body: string | Buffer, signature: string): Promise<{ received: boolean }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      const error = err as Error;
      console.error('Stripe webhook signature verification failed:', error.message);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }

    // 处理 checkout.session.completed 事件
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.processStripeCompletedSession(session);
    }

    return { received: true };
  }

  /**
   * 处理 Stripe 支付成功会话
   */
  private async processStripeCompletedSession(session: Stripe.Checkout.Session): Promise<void> {
    const orderId = session.metadata?.order_id;
    const userId = session.metadata?.user_id;
    const tokensStr = session.metadata?.tokens;

    if (!orderId || !userId || !tokensStr) {
      console.error('Stripe session missing metadata:', session.id);
      return;
    }

    // 查询订单
    const orderResult = await this.pool.query(
      'SELECT * FROM token_orders WHERE id = $1 AND status = $2',
      [orderId, 'pending']
    );

    if (orderResult.rows.length === 0) {
      console.warn(`Stripe webhook: Order ${orderId} not found or already processed`);
      return;
    }

    const tokens = parseInt(tokensStr);

    // 更新订单状态为已支付
    await this.pool.query(
      `UPDATE token_orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'`,
      [orderId]
    );

    // 为用户增加 token 配额
    await tokenQuotaService.addPurchasedTokens(userId, tokens);

    console.log(`[Stripe] Payment completed: order=${orderId}, user=${userId}, tokens=${tokens}`);
  }
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
   * 注意：整个操作在同一事务中完成，确保原子性
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

      // 为用户增加token配额（在同一事务中执行）
      // 确保用户有配额记录
      const quotaResult = await client.query(
        'SELECT * FROM user_token_quotas WHERE user_id = $1',
        [order.user_id]
      );

      if (quotaResult.rows.length === 0) {
        // 创建配额记录
        await client.query(
          `INSERT INTO user_token_quotas (user_id, monthly_limit, used_this_month, total_used, is_internal_team)
           VALUES ($1, $2, 0, 0, false)`,
          [order.user_id, order.tokens]
        );
      } else {
        // 增加配额
        await client.query(
          `UPDATE user_token_quotas SET 
            monthly_limit = monthly_limit + $1,
            updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [order.tokens, order.user_id]
        );
      }

      console.log(`[PaymentService] Added ${order.tokens} tokens to user ${order.user_id} for order ${orderId}`);

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
      stripe_session_id: row.stripe_session_id || null,
      paid_at: row.paid_at ? new Date(row.paid_at) : null,
      confirmed_by: row.confirmed_by,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

export const paymentService = new PaymentService();
