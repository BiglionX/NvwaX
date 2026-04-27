/**
 * 悬赏服务
 * 
 * 管理悬赏任务的 CRUD、状态流转和积分交易
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface Bounty {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  rewardAmount: number;
  currency: string;
  status: 'open' | 'claimed' | 'submitted' | 'verified' | 'completed' | 'cancelled';
  creatorId: string;
  claimerId?: string;
  submissionUrl?: string;
  verificationNotes?: string;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
  claimedAt?: Date;
  submittedAt?: Date;
  verifiedAt?: Date;
  completedAt?: Date;
}

export interface CreateBountyInput {
  title: string;
  description: string;
  requiredSkills: string[];
  rewardAmount: number;
  currency?: string;
  deadline?: Date;
  creatorId: string;
}

export class BountyService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 创建悬赏
   */
  async createBounty(input: CreateBountyInput): Promise<Bounty> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 检查用户积分余额
      const balanceResult = await client.query(
        'SELECT balance FROM user_points WHERE user_id = $1',
        [input.creatorId]
      );
      
      const currentBalance = balanceResult.rows[0]?.balance || 0;
      
      if (currentBalance < input.rewardAmount) {
        throw new Error(`INSUFFICIENT_POINTS: 当前余额 ${currentBalance}, 需要 ${input.rewardAmount}`);
      }
      
      // 2. 扣除积分
      await client.query(
        'UPDATE user_points SET balance = balance - $1, total_spent = total_spent + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [input.rewardAmount, input.creatorId]
      );
      
      // 3. 记录积分流水
      const transactionId = uuidv4();
      await client.query(
        `INSERT INTO point_transactions (id, user_id, amount, type, reference_type, reference_id, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          transactionId,
          input.creatorId,
          -input.rewardAmount,
          'bounty_payment',
          'bounty',
          null, // 先插入，稍后更新
          `发布悬赏：${input.title}`,
        ]
      );
      
      // 4. 创建悬赏
      const bountyId = uuidv4();
      const result = await client.query(
        `INSERT INTO bounties (id, title, description, required_skills, reward_amount, currency, status, creator_id, deadline, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          bountyId,
          input.title,
          input.description,
          JSON.stringify(input.requiredSkills),
          input.rewardAmount,
          input.currency || 'points',
          'open',
          input.creatorId,
          input.deadline || null,
        ]
      );
      
      // 5. 更新积分流水的 reference_id
      await client.query(
        'UPDATE point_transactions SET reference_id = $1 WHERE id = $2',
        [bountyId, transactionId]
      );
      
      await client.query('COMMIT');
      
      return this.mapRowToBounty(result.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取悬赏列表
   */
  async getBounties(options: {
    status?: string;
    creatorId?: string;
    claimerId?: string;
    skill?: string;
    searchQuery?: string;
    minReward?: number;
    page?: number;
    limit?: number;
  }): Promise<{ bounties: Bounty[]; total: number }> {
    const {
      status = 'open',
      creatorId,
      claimerId,
      skill,
      searchQuery,
      minReward = 0,
      page = 1,
      limit = 20,
    } = options;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    
    if (creatorId) {
      conditions.push(`creator_id = $${paramIndex++}`);
      params.push(creatorId);
    }
    
    if (claimerId) {
      conditions.push(`claimer_id = $${paramIndex++}`);
      params.push(claimerId);
    }
    
    if (minReward > 0) {
      conditions.push(`reward_amount >= $${paramIndex++}`);
      params.push(minReward);
    }
    
    if (skill) {
      conditions.push(`required_skills @> $${paramIndex++}::jsonb`);
      params.push(JSON.stringify([skill]));
    }
    
    // 全文搜索：在标题和描述中搜索
    if (searchQuery) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 查询总数
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM bounties ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // 查询数据
    const offset = (page - 1) * limit;
    const dataResult = await this.pool.query(
      `SELECT * FROM bounties ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );
    
    const bounties = dataResult.rows.map(row => this.mapRowToBounty(row));
    
    return { bounties, total };
  }

  /**
   * 获取单个悬赏详情
   */
  async getBountyById(id: string): Promise<Bounty | null> {
    const result = await this.pool.query(
      'SELECT * FROM bounties WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToBounty(result.rows[0]);
  }

  /**
   * 领取悬赏
   */
  async claimBounty(bountyId: string, userId: string): Promise<Bounty> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 检查悬赏状态
      const bountyResult = await client.query(
        'SELECT * FROM bounties WHERE id = $1',
        [bountyId]
      );
      
      if (bountyResult.rows.length === 0) {
        throw new Error('BOUNTY_NOT_FOUND: 悬赏不存在');
      }
      
      const bounty = bountyResult.rows[0];
      
      if (bounty.status !== 'open') {
        throw new Error('BOUNTY_NOT_AVAILABLE: 该悬赏已被领取或已完成');
      }
      
      if (bounty.creator_id === userId) {
        throw new Error('CANNOT_CLAIM_OWN: 不能领取自己发布的悬赏');
      }
      
      // 2. 更新悬赏状态
      const updateResult = await client.query(
        `UPDATE bounties 
         SET status = 'claimed', claimer_id = $1, claimed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [userId, bountyId]
      );
      
      await client.query('COMMIT');
      
      return this.mapRowToBounty(updateResult.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 提交成果
   */
  async submitBounty(bountyId: string, userId: string, submissionUrl: string): Promise<Bounty> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 检查权限
      const bountyResult = await this.pool.query(
        'SELECT * FROM bounties WHERE id = $1',
        [bountyId]
      );
      
      if (bountyResult.rows.length === 0) {
        throw new Error('BOUNTY_NOT_FOUND: 悬赏不存在');
      }
      
      const bounty = bountyResult.rows[0];
      
      if (bounty.claimer_id !== userId) {
        throw new Error('NOT_CLAIMER: 只有领取者可以提交成果');
      }
      
      if (bounty.status !== 'claimed') {
        throw new Error('INVALID_STATUS: 悬赏状态不正确');
      }
      
      // 2. 更新提交信息
      const updateResult = await client.query(
        `UPDATE bounties 
         SET status = 'submitted', submission_url = $1, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [submissionUrl, bountyId]
      );
      
      await client.query('COMMIT');
      
      return this.mapRowToBounty(updateResult.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 验证并支付悬赏
   */
  async verifyBounty(
    bountyId: string,
    verifierId: string,
    approved: boolean,
    notes?: string
  ): Promise<Bounty> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 检查权限（只有发布者可以验证）
      const bountyResult = await client.query(
        'SELECT * FROM bounties WHERE id = $1',
        [bountyId]
      );
      
      if (bountyResult.rows.length === 0) {
        throw new Error('BOUNTY_NOT_FOUND: 悬赏不存在');
      }
      
      const bounty = bountyResult.rows[0];
      
      if (bounty.creator_id !== verifierId) {
        throw new Error('NOT_CREATOR: 只有发布者可以验证');
      }
      
      if (bounty.status !== 'submitted') {
        throw new Error('INVALID_STATUS: 悬赏未提交');
      }
      
      if (approved) {
        // 2a. 批准：转移积分给领取者（80%），平台抽成（20%）
        const rewardAmount = bounty.reward_amount;
        const claimerReward = Math.floor(rewardAmount * 0.8);
        const platformFee = rewardAmount - claimerReward;
        
        // 给领取者发放奖励
        await client.query(
          `INSERT INTO user_points (user_id, balance, total_earned, total_spent, updated_at)
           VALUES ($1, $2, $2, 0, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id) 
           DO UPDATE SET balance = user_points.balance + $2, total_earned = user_points.total_earned + $2, updated_at = CURRENT_TIMESTAMP`,
          [bounty.claimer_id, claimerReward]
        );
        
        // 记录领取者的积分流水
        await client.query(
          `INSERT INTO point_transactions (id, user_id, amount, type, reference_type, reference_id, description, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [
            uuidv4(),
            bounty.claimer_id,
            claimerReward,
            'bounty_reward',
            'bounty',
            bountyId,
            `完成悬赏奖励：${bounty.title}`,
          ]
        );
        
        // 更新悬赏状态
        const updateResult = await client.query(
          `UPDATE bounties 
           SET status = 'completed', verification_notes = $1, verified_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING *`,
          [notes || '验证通过', bountyId]
        );
        
        await client.query('COMMIT');
        
        return this.mapRowToBounty(updateResult.rows[0]);
        
      } else {
        // 2b. 拒绝：状态改回 claimed
        const updateResult = await client.query(
          `UPDATE bounties 
           SET status = 'claimed', verification_notes = $1, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING *`,
          [notes || '验证未通过，请修改后重新提交', bountyId]
        );
        
        await client.query('COMMIT');
        
        return this.mapRowToBounty(updateResult.rows[0]);
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 取消悬赏
   */
  async cancelBounty(bountyId: string, userId: string): Promise<Bounty> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 检查权限
      const bountyResult = await client.query(
        'SELECT * FROM bounties WHERE id = $1',
        [bountyId]
      );
      
      if (bountyResult.rows.length === 0) {
        throw new Error('BOUNTY_NOT_FOUND: 悬赏不存在');
      }
      
      const bounty = bountyResult.rows[0];
      
      if (bounty.creator_id !== userId) {
        throw new Error('NOT_CREATOR: 只有发布者可以取消');
      }
      
      if (bounty.status !== 'open') {
        throw new Error('INVALID_STATUS: 只能取消未领取的悬赏');
      }
      
      // 2. 退还积分
      await client.query(
        'UPDATE user_points SET balance = balance + $1, total_spent = total_spent - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [bounty.reward_amount, userId]
      );
      
      // 3. 记录退款流水
      await client.query(
        `INSERT INTO point_transactions (id, user_id, amount, type, reference_type, reference_id, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          uuidv4(),
          userId,
          bounty.reward_amount,
          'bounty_refund',
          'bounty',
          bountyId,
          `取消悬赏退款：${bounty.title}`,
        ]
      );
      
      // 4. 更新悬赏状态
      const updateResult = await client.query(
        `UPDATE bounties 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [bountyId]
      );
      
      await client.query('COMMIT');
      
      return this.mapRowToBounty(updateResult.rows[0]);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 将数据库行映射为 Bounty 对象
   */
  private mapRowToBounty(row: any): Bounty {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      requiredSkills: JSON.parse(row.required_skills || '[]'),
      rewardAmount: parseFloat(row.reward_amount),
      currency: row.currency,
      status: row.status,
      creatorId: row.creator_id,
      claimerId: row.claimer_id,
      submissionUrl: row.submission_url,
      verificationNotes: row.verification_notes,
      deadline: row.deadline,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      claimedAt: row.claimed_at,
      submittedAt: row.submitted_at,
      verifiedAt: row.verified_at,
      completedAt: row.completed_at,
    };
  }

  /**
   * 获取热门搜索词（基于标题和描述中的高频词）
   */
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
      // 简单实现：从最近的悬赏中提取高频词
      const result = await this.pool.query(
        `SELECT title, description FROM bounties 
         WHERE created_at > NOW() - INTERVAL '30 days'
         ORDER BY created_at DESC
         LIMIT 100`
      );

      const wordCount: Record<string, number> = {};
      
      // 简单的中文分词（按常见关键词）
      const keywords = [
        '客服', '订单', '数据', '分析', 'API', '集成', '代码', '生成',
        '数据库', '查询', '翻译', '识别', '情感', '报表', '邮件',
        '微信', '智能', '助手', '聊天', '机器人', '自动化'
      ];
      
      result.rows.forEach(row => {
        const text = (row.title + ' ' + row.description).toLowerCase();
        keywords.forEach(keyword => {
          if (text.includes(keyword.toLowerCase())) {
            wordCount[keyword] = (wordCount[keyword] || 0) + 1;
          }
        });
      });
      
      // 排序并返回前 N 个
      return Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([word]) => word);
        
    } catch (error) {
      console.error('Get popular searches error:', error);
      return [];
    }
  }

  /**
   * 获取搜索建议（基于输入前缀匹配悬赏标题）
   */
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.trim().length < 1) {
      return [];
    }

    try {
      const result = await this.pool.query(
        `SELECT DISTINCT title FROM bounties 
         WHERE title ILIKE $1 
         AND status = 'open'
         ORDER BY created_at DESC
         LIMIT $2`,
        [`%${query}%`, limit]
      );

      return result.rows.map(row => row.title);
      
    } catch (error) {
      console.error('Get search suggestions error:', error);
      return [];
    }
  }
}
