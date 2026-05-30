/**
 * MicroBiz Webhook Service
 * 
 * 接收外部平台的订单推送、评论/私信回调
 * 支持平台: 抖音、小红书、美团、微信小程序
 * 安全: HMAC-SHA256 签名验证
 */

import { Pool } from 'pg';
import * as crypto from 'crypto';
import { databaseService } from './database.service.js';
import { microbizTeamService } from './microbiz-team.service.js';

export interface WebhookPayload {
  event_type: string;
  platform: string;
  timestamp: string;
  signature?: string;
  data: any;
}

export interface OrderNotification {
  platform: string;
  orderId: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  customerInfo: {
    name?: string;
    phone?: string;
    address?: string;
  };
  createdAt: string;
}

export interface OrderItem {
  name: string;
  sku: string;
  quantity: number;
  price: number;
}

export interface CommentNotification {
  platform: string;
  commentId: string;
  userId: string;
  userName: string;
  content: string;
  messageType: 'comment' | 'direct_message' | 'mention';
  relatedPostId?: string;
  createdAt: string;
}

export class MicroBizWebhookService {
  private pool: Pool;
  private platformSecrets: Record<string, string> = {
    douyin: process.env.DOUYIN_WEBHOOK_SECRET || 'douyin-default-secret',
    xiaohongshu: process.env.XIAOHONGSHU_WEBHOOK_SECRET || 'xiaohongshu-default-secret',
    meituan: process.env.MEITUAN_WEBHOOK_SECRET || 'meituan-default-secret',
    weixin: process.env.WEIXIN_WEBHOOK_SECRET || 'weixin-default-secret'
  };

  constructor(pool?: Pool) {
    this.pool = pool || databaseService.getPool();
  }

  /**
   * 验证 Webhook 签名
   */
  verifySignature(platform: string, payload: string, signature: string): boolean {
    const secret = this.platformSecrets[platform];
    if (!secret) {
      console.warn(`[MicroBizWebhook] Unknown platform: ${platform}`);
      return false;
    }

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature));
  }

  /**
   * 处理 Webhook 事件
   */
  async handleWebhook(platform: string, payload: WebhookPayload): Promise<{ success: boolean; message: string; eventId?: string }> {
    console.log(`[MicroBizWebhook] Received webhook from ${platform}: ${payload.event_type}`);

    try {
      const eventId = `${platform}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      // 记录原始事件到数据库
      await this.pool.query(
        `INSERT INTO microbiz_webhook_events (id, platform, event_type, payload, received_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [eventId, platform, payload.event_type, JSON.stringify(payload.data)]
      );

      // 根据事件类型分发处理
      switch (payload.event_type) {
        case 'order.created':
        case 'order.paid':
          await this.processOrderNotification(platform, payload.data);
          break;

        case 'comment.created':
        case 'message.received':
          await this.processCommentNotification(platform, payload.data);
          break;

        case 'product.updated':
          console.log(`[MicroBizWebhook] Product update from ${platform}:`, payload.data);
          break;

        default:
          console.log(`[MicroBizWebhook] Unhandled event type: ${payload.event_type}`);
      }

      return { success: true, message: 'Webhook processed', eventId };
    } catch (error) {
      console.error(`[MicroBizWebhook] Error processing webhook from ${platform}:`, error);
      return { success: false, message: error instanceof Error ? error.message : 'Processing failed' };
    }
  }

  /**
   * 处理新订单通知
   */
  private async processOrderNotification(platform: string, data: any): Promise<void> {
    const order: OrderNotification = {
      platform,
      orderId: data.order_id || data.id || '',
      orderNumber: data.order_number || data.order_no || '',
      items: (data.items || []).map((item: any) => ({
        name: item.name || item.product_name || '',
        sku: item.sku || item.product_id || '',
        quantity: item.quantity || 1,
        price: item.price || item.unit_price || 0
      })),
      totalAmount: data.total_amount || data.total_price || 0,
      customerInfo: {
        name: data.customer?.name || data.buyer_name || '',
        phone: data.customer?.phone || data.buyer_phone || '',
        address: data.customer?.address || data.shipping_address || ''
      },
      createdAt: data.created_at || new Date().toISOString()
    };

    // 写入 microbiz_orders 表
    await this.pool.query(
      `INSERT INTO microbiz_orders (id, platform, order_number, order_data, status, received_at)
       VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET status = 'pending', updated_at = CURRENT_TIMESTAMP`,
      [order.orderId || `${platform}-${Date.now()}`, platform, order.orderNumber, JSON.stringify(order)]
    );

    console.log(`[MicroBizWebhook] New order from ${platform}: ${order.orderNumber}`);
    console.log(`[MicroBizWebhook] Items: ${order.items.length}, Total: ¥${order.totalAmount}`);

    // TODO: 触发桌面端语音通知
    // TODO: 触发进销存同步 Agent
  }

  /**
   * 处理评论/私信回调
   */
  private async processCommentNotification(platform: string, data: any): Promise<void> {
    const comment: CommentNotification = {
      platform,
      commentId: data.comment_id || data.id || '',
      userId: data.user_id || data.from_user_id || '',
      userName: data.user_name || data.from_user_name || '',
      content: data.content || data.text || '',
      messageType: data.message_type || 'comment',
      relatedPostId: data.post_id || data.video_id || '',
      createdAt: data.created_at || new Date().toISOString()
    };

    // 记录评论到数据库
    await this.pool.query(
      `INSERT INTO microbiz_comments (id, platform, comment_id, user_name, content, message_type, related_post_id, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT DO NOTHING`,
      [comment.commentId, platform, comment.commentId, comment.userName, comment.content, comment.messageType, comment.relatedPostId]
    );

    console.log(`[MicroBizWebhook] New ${comment.messageType} from ${platform} by ${comment.userName}: ${comment.content.substring(0, 50)}...`);

    // TODO: 触发客服互动 Agent 自动回复
  }
}

// 导出单例
export const microbizWebhookService = new MicroBizWebhookService();
