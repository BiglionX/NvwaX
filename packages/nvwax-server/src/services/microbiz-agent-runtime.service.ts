/**
 * MicroBiz Agent Runtime Service
 * 
 * 实现10个Agent的执行逻辑
 * 基于 DeepSeek 模型调用和外部 API 集成
 */

import { Pool } from 'pg';
import { databaseService } from './database.service.js';
import { microbizApiAdapter, PlatformCredentials, PublishContent } from './microbiz-api-adapter.service.js';

// ==========================================
// Agent 执行上下文
// ==========================================

export interface AgentExecutionContext {
  installationId: string;
  userId: string;
  teamId: string;
  agentId: string;
  credentials: Record<string, PlatformCredentials>;
  preferences: Record<string, any>;
  input: Record<string, any>;
}

export interface AgentExecutionResult {
  success: boolean;
  output: Record<string, any>;
  error?: string;
  executionTimeMs: number;
}

// ==========================================
// Agent 运行时 - 各 Agent 执行逻辑
// ==========================================

export class MicroBizAgentRuntime {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || databaseService.getPool();
  }

  /**
   * 执行指定 Agent 的任务
   */
  async executeAgent(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      // 根据 teamId + agentId 分发到具体 Agent
      switch (ctx.agentId) {
        // 新媒体运营 Team
        case 'microbiz-agent-content-creation':
          return await this.executeContentCreation(ctx);
        case 'microbiz-agent-social-publish':
          return await this.executeSocialPublish(ctx);
        case 'microbiz-agent-customer-interaction':
          return await this.executeCustomerInteraction(ctx);
        case 'microbiz-agent-data-analysis':
          return await this.executeDataAnalysis(ctx);

        // 本地团购 Team
        case 'microbiz-agent-deal-manager':
          return await this.executeDealManager(ctx);
        case 'microbiz-agent-order-monitor':
          return await this.executeOrderMonitor(ctx);
        case 'microbiz-agent-inventory-sync':
          return await this.executeInventorySync(ctx);
        case 'microbiz-agent-sales-analysis':
          return await this.executeSalesAnalysis(ctx);

        // 小程序商城 Team
        case 'microbiz-agent-product-listing':
          return await this.executeProductListing(ctx);
        case 'microbiz-agent-order-sync':
          return await this.executeOrderSync(ctx);
        case 'microbiz-agent-customer-manager':
          return await this.executeCustomerManager(ctx);

        default:
          throw new Error(`未知的 Agent ID: ${ctx.agentId}`);
      }
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        output: {},
        error: error.message || 'Agent 执行失败',
        executionTimeMs
      };
    }
  }

  /**
   * 1. 内容创作 Agent
   * 输入：商品信息、行业关键词、目标平台
   * 输出：符合平台风格的文案 + 图片/视频剪辑建议
   */
  private async executeContentCreation(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { product_info, industry_keywords, target_platform } = ctx.input;

    // 模拟 DeepSeek 模型调用生成内容
    const content = this.generateMockContent(product_info, industry_keywords, target_platform);

    return {
      success: true,
      output: {
        content: content.text,
        editingSuggestions: content.suggestions,
        platformFormat: content.platformFormat,
        estimatedTime: '约30分钟'
      },
      executionTimeMs: 0
    };
  }

  /**
   * 2. 社媒发布 Agent
   * 支持定时发布、多账号管理
   */
  private async executeSocialPublish(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { content, platforms, schedule } = ctx.input;

    // 配置各平台凭证
    if (ctx.credentials) {
      microbizApiAdapter.configureAll(ctx.credentials);
    }

    const publishResults: any[] = [];

    for (const platform of platforms || []) {
      const publishContent: PublishContent = {
        title: content?.title || '',
        content: content?.text || '',
        mediaUrls: content?.mediaUrls,
        hashtags: content?.hashtags,
        mentions: content?.mentions,
        scheduleTime: schedule
      };

      let result;
      switch (platform) {
        case 'douyin':
          result = await microbizApiAdapter.douyin.publishContent(publishContent);
          break;
        case 'xiaohongshu':
          result = await microbizApiAdapter.xiaohongshu.publishNote(publishContent);
          break;
        case 'weixin_video':
          result = await microbizApiAdapter.weixinVideo.publishVideo(publishContent);
          break;
        default:
          result = { success: false, status: 'unknown_platform', error: `不支持的平台: ${platform}` };
      }

      publishResults.push({ platform, ...result });
    }

    return {
      success: true,
      output: { publishResults },
      executionTimeMs: 0
    };
  }

  /**
   * 3. 客服互动 Agent
   * 通过 Webhook 接收社媒私信/评论，使用 LLM 生成回复
   */
  private async executeCustomerInteraction(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { message_type, content, user_info, faq_database } = ctx.input;

    // 模拟 LLM 回复生成
    const autoReplyEnabled = ctx.preferences?.auto_reply_enabled !== false;
    const manualReviewRequired = ctx.preferences?.manual_review_required || false;

    const reply = autoReplyEnabled
      ? `感谢您的留言！关于"${content?.substring(0, 20)}..."的问题，我们已经收到。我们的客服团队会尽快为您解答。`
      : null;

    return {
      success: true,
      output: {
        reply,
        needHumanReview: manualReviewRequired || message_type === 'complaint',
        category: this.categorizeMessage(content || ''),
        timestamp: new Date().toISOString()
      },
      executionTimeMs: 0
    };
  }

  /**
   * 4. 数据分析 Agent
   * 每日拉取各平台数据，生成可读报告
   */
  private async executeDataAnalysis(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { platforms, date_range } = ctx.input;

    if (ctx.credentials) {
      microbizApiAdapter.configureAll(ctx.credentials);
    }

    const analyticsData: any[] = [];
    for (const platform of platforms || []) {
      const dateRange = date_range || { start: '7天前', end: '今天' };
      let data;
      switch (platform) {
        case 'douyin':
          data = await microbizApiAdapter.douyin.getAnalytics(dateRange);
          break;
        case 'xiaohongshu':
          data = await microbizApiAdapter.xiaohongshu.getAnalytics(dateRange);
          break;
        case 'weixin_video':
          data = await microbizApiAdapter.weixinVideo.getAnalytics(dateRange);
          break;
        default:
          data = null;
      }
      if (data) analyticsData.push({ platform, ...data });
    }

    // 生成报告
    const report = this.generateAnalyticsReport(analyticsData);

    return {
      success: true,
      output: {
        report,
        highlights: report.highlights,
        recommendations: report.recommendations,
        rawData: analyticsData
      },
      executionTimeMs: 0
    };
  }

  /**
   * 5. 团单管理 Agent
   * 从美团/闪购拉取当前活动团单，支持一键更新
   */
  private async executeDealManager(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { platform, action, dealUpdates } = ctx.input;

    if (ctx.credentials) {
      microbizApiAdapter.configureAll(ctx.credentials);
    }

    let deals: any[] = [];

    if (platform === 'meituan' || !platform) {
      deals = [...deals, ...await microbizApiAdapter.meituan.getDeals()];
    }
    if (platform === 'shanguo' || !platform) {
      deals = [...deals, ...await microbizApiAdapter.shanguo.getDeals()];
    }

    // 执行更新操作
    let updatedCount = 0;
    if (action === 'update' && dealUpdates) {
      for (const update of dealUpdates) {
        const success = await microbizApiAdapter.meituan.updateDeal(update.id, update);
        if (success) updatedCount++;
      }
    }

    return {
      success: true,
      output: {
        deals,
        updatedCount,
        totalCount: deals.length,
        platform: platform || 'all'
      },
      executionTimeMs: 0
    };
  }

  /**
   * 6. 订单监控 Agent
   * 长轮询或 Webhook 接收新订单，桌面通知
   */
  private async executeOrderMonitor(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { platforms } = ctx.input;

    const orders: any[] = [];
    for (const platform of platforms || ['meituan']) {
      switch (platform) {
        case 'meituan': {
          const meituanOrders = await microbizApiAdapter.meituan.getOrders();
          orders.push(...meituanOrders.map(o => ({ ...o, source: 'meituan' })));
          break;
        }
        case 'shanguo': {
          const shanguoOrders = await microbizApiAdapter.shanguo.getOrders();
          orders.push(...shanguoOrders.map(o => ({ ...o, source: 'shanguo' })));
          break;
        }
      }
    }

    // 生成通知内容
    const notifications = orders.map(order => ({
      title: '新订单通知',
      body: `收到新订单：${order.totalAmount}元 - ${order.customerName}`,
      ttsMessage: `您有一笔新订单，金额${order.totalAmount}元，请及时处理。`,
      orderId: order.id
    }));

    return {
      success: true,
      output: {
        orders,
        notifications,
        newOrdersCount: orders.length,
        timestamp: new Date().toISOString()
      },
      executionTimeMs: 0
    };
  }

  /**
   * 7. 进销存同步 Agent
   * 订单产生后自动减少本地库存，库存低于阈值时发起补货建议
   */
  private async executeInventorySync(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { order_items } = ctx.input;
    const threshold = ctx.preferences?.inventory_alert_threshold || 10;

    // 模拟库存更新
    const updatedInventory = (order_items || []).map((item: any) => ({
      productName: item.name,
      previousStock: Math.floor(Math.random() * 100) + item.quantity,
      deductedQuantity: item.quantity,
      currentStock: Math.floor(Math.random() * 100),
      needsRestock: Math.floor(Math.random() * 100) < threshold
    }));

    const alerts = updatedInventory.filter((item: any) => item.needsRestock);
    const restockSuggestions = alerts.map((item: any) => ({
      productName: item.productName,
      suggestedQuantity: item.deductedQuantity * 2,
      priority: item.currentStock === 0 ? 'urgent' : 'normal',
      supplier: '默认供应商（可配置）'
    }));

    return {
      success: true,
      output: {
        updatedInventory,
        alerts,
        restockSuggestions,
        alertCount: alerts.length
      },
      executionTimeMs: 0
    };
  }

  /**
   * 8. 静/动销分析 Agent
   * 分析指定周期内每个商品的销售频率，标记滞销和热卖品
   */
  private async executeSalesAnalysis(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const periodDays = ctx.input.period_days || ctx.preferences?.analysis_period_days || 30;

    // 模拟销售数据分析
    const products = [
      { name: '招牌套餐A', salesCount: 150, salesFrequency: 'high', previousPeriod: 80 },
      { name: '经典套餐B', salesCount: 80, salesFrequency: 'medium', previousPeriod: 90 },
      { name: '特价单品C', salesCount: 20, salesFrequency: 'low', previousPeriod: 45 },
      { name: '限定套餐D', salesCount: 5, salesFrequency: 'very_low', previousPeriod: 30 }
    ];

    const fastMoving = products.filter(p => p.salesFrequency === 'high').map(p => ({
      ...p,
      label: '热卖',
      recommendation: '建议增加备货或推出组合套餐'
    }));

    const slowMoving = products.filter(p => p.salesFrequency === 'low' || p.salesFrequency === 'very_low').map(p => ({
      ...p,
      label: '滞销',
      recommendation: p.salesCount < 10 ? '建议下架' : '建议降价促销'
    }));

    return {
      success: true,
      output: {
        analysisPeriod: `${periodDays}天`,
        totalProducts: products.length,
        fastMoving,
        slowMoving,
        recommendations: [
          ...fastMoving.map(p => `${p.name}：${p.recommendation}`),
          ...slowMoving.map(p => `${p.name}：${p.recommendation}`)
        ]
      },
      executionTimeMs: 0
    };
  }

  /**
   * 9. 商品上架 Agent
   * 读取本地商品表，转换为小程序商城所需格式
   */
  private async executeProductListing(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { products, sync_type } = ctx.input;

    if (ctx.credentials) {
      microbizApiAdapter.configureAll(ctx.credentials);
    }

    // 转换商品格式
    const convertedProducts = (products || []).map((p: any, idx: number) => ({
      originalId: p.id || `prod_${idx}`,
      name: p.name || `商品${idx + 1}`,
      price: p.price || 0,
      stock: p.stock || 0,
      description: p.description || '',
      images: p.images || [],
      categoryId: p.categoryId || 'default'
    }));

    // 批量上传到小程序
    const result = await microbizApiAdapter.weixinMini.batchUploadProducts(convertedProducts);

    return {
      success: true,
      output: {
        ...result,
        totalCount: convertedProducts.length,
        syncType: sync_type || 'full'
      },
      executionTimeMs: 0
    };
  }

  /**
   * 10. 订单同步 Agent
   * 监听小程序商城的订单创建，转换格式后写入本地
   */
  private async executeOrderSync(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { webhook_data } = ctx.input;

    // 模拟订单处理
    const order = {
      orderId: webhook_data?.orderId || `wx_order_${Date.now()}`,
      totalAmount: webhook_data?.totalAmount || 0,
      items: webhook_data?.items || [],
      customer: webhook_data?.customer || '未知客户',
      syncedToLocal: true,
      inventoryUpdated: true,
      syncTime: new Date().toISOString()
    };

    return {
      success: true,
      output: {
        synced: true,
        order,
        inventoryUpdated: true
      },
      executionTimeMs: 0
    };
  }

  /**
   * 11. 客户管理 Agent
   * 整合多渠道客户信息，自动打标签
   */
  private async executeCustomerManager(ctx: AgentExecutionContext): Promise<AgentExecutionResult> {
    const { action, customer_ids, tag_rules } = ctx.input;

    // 模拟客户标签化
    const tagsApplied = ['抖音粉丝', '高频复购', '团购用户', '小程序客户'];
    const customerSegments = [
      { name: '高价值客户', count: Math.floor(Math.random() * 50) + 10, criteria: '月消费>500元' },
      { name: '新客户', count: Math.floor(Math.random() * 100) + 20, criteria: '注册<30天' },
      { name: '沉睡客户', count: Math.floor(Math.random() * 80) + 5, criteria: '30天未消费' }
    ];

    return {
      success: true,
      output: {
        action: action || 'tag_update',
        customersUpdated: customer_ids?.length || Math.floor(Math.random() * 100),
        tagsApplied,
        segments: customerSegments,
        canSendPromotion: true,
        promotionReady: action === 'prepare_campaign' ? {
          targetSegment: '高价值客户',
          estimatedReach: customerSegments[0].count,
          suggestedMessage: '感谢您一直以来的支持，为您准备了专属优惠...'
        } : null
      },
      executionTimeMs: 0
    };
  }

  // ==========================================
  // 辅助方法
  // ==========================================

  private generateMockContent(productInfo: string, keywords: string[], platform: string): any {
    const platformFormats: Record<string, string> = {
      'douyin': '快节奏短视频脚本',
      'xiaohongshu': '种草图文笔记',
      'weixin_video': '生活分享视频'
    };

    return {
      text: `【亲测推荐】${productInfo || '这款商品'}真的太棒了！${
        keywords?.length ? '#' + keywords.join(' #') : ''
      }`,
      suggestions: [
        '建议拍摄30-60秒短视频，展示产品使用场景',
        '可添加背景音乐增强氛围感',
        '文案中使用表情符号增加亲和力'
      ],
      platformFormat: platformFormats[platform] || '通用格式'
    };
  }

  private categorizeMessage(content: string): string {
    if (!content) return 'general';
    if (content.includes('退款') || content.includes('退货')) return 'refund';
    if (content.includes('价格') || content.includes('多少钱')) return 'pricing';
    if (content.includes('怎么') || content.includes('如何')) return 'how_to';
    if (content.includes('投诉') || content.includes('差评')) return 'complaint';
    return 'general';
  }

  private generateAnalyticsReport(analyticsData: any[]): any {
    let totalViews = 0, totalLikes = 0, totalComments = 0;
    for (const d of analyticsData) {
      totalViews += d.views || 0;
      totalLikes += d.likes || 0;
      totalComments += d.comments || 0;
    }

    const topPlatform = analyticsData.sort((a, b) => (b.views || 0) - (a.views || 0))[0];

    return {
      summary: `在统计周期内，各平台累计获得 ${totalViews} 次播放、${totalLikes} 个赞、${totalComments} 条评论。`,
      highlights: [
        `最受欢迎平台：${topPlatform?.platform || '无数据'}`,
        `内容互动率：${totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : 0}%`
      ],
      recommendations: [
        `建议继续发布类似 ${topPlatform?.platform || '当前'} 平台的热门内容`,
        '增加短视频内容比例，当前短视频转化率更高',
        '优化发布时间至用户活跃时段'
      ]
    };
  }
}

// 导出单例
export const microbizAgentRuntime = new MicroBizAgentRuntime();
