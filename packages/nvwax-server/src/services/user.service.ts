import { databaseService } from './database.service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { tokenQuotaService } from './token-quota.service.js';
import { SocialAccount, OAuthProvider } from '../types/oauth.types.js';

export interface User {
  id: string;
  email: string;
  password?: string;
  name?: string;
  avatar?: string;
  bio?: string;
  isBanned?: boolean;
  banReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  projectCount: number;
  teamCount: number;
  agentTeamCount: number;
}

export interface LoginResult {
  user: Omit<User, 'password'>;
  token: string;
}

export class UserService {
  private pool = databaseService.getPool();
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'nvwax-secret-key-change-in-production';
  private readonly JWT_EXPIRES_IN = '7d'; // Token expires in 7 days
  private readonly SALT_ROUNDS = 10;
  private readonly CROSS_AUTH_SECRET = 'proclaw-nvwax-bridge-2026'; // 与 ProClaw 共享
  private readonly CROSS_AUTH_MAX_AGE = 5 * 60; // 5 分钟有效期

  // ───────── 社交账号 OAuth 相关方法 ─────────

  /**
   * 根据第三方账号查询用户
   * @param provider 第三方平台
   * @param providerUserId 第三方平台用户ID
   * @returns 用户信息（如已绑定）或 null
   */
  async findUserBySocialAccount(provider: OAuthProvider, providerUserId: string): Promise<{ user: User; socialAccount: SocialAccount } | null> {
    const result = await this.pool.query(`
      SELECT u.*, sa.id as sa_id, sa.provider, sa.provider_user_id, sa.provider_email, sa.display_name, sa.avatar_url, sa.raw_data, sa.created_at as sa_created_at, sa.updated_at as sa_updated_at
      FROM users u
      INNER JOIN social_accounts sa ON sa.user_id = u.id
      WHERE sa.provider = $1 AND sa.provider_user_id = $2
    `, [provider, providerUserId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const socialAccount: SocialAccount = {
      id: row.sa_id,
      user_id: row.id,
      provider: row.provider,
      provider_user_id: row.provider_user_id,
      provider_email: row.provider_email,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      raw_data: row.raw_data,
      created_at: row.sa_created_at,
      updated_at: row.sa_updated_at
    };

    return {
      user: this.formatUser(row),
      socialAccount
    };
  }

  /**
   * 通过社交账号创建用户（首次登录时）
   * @param info 社交账号信息
   * @returns 创建的用户
   */
  async createUserFromSocialAccount(info: {
    provider: OAuthProvider;
    providerUserId: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    rawData: Record<string, any>;
  }): Promise<LoginResult> {
    const email = info.email || `${info.providerUserId}@${info.provider}.oauth`;
    const name = info.name || info.providerUserId;

    // 创建用户
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.pool.query(
      'INSERT INTO users (id, email, name, avatar) VALUES ($1, $2, $3, $4)',
      [id, email, name, info.avatarUrl || null]
    );

    // 创建社交账号关联
    await this.pool.query(`
      INSERT INTO social_accounts (id, user_id, provider, provider_user_id, provider_email, display_name, avatar_url, raw_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      `sa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      id,
      info.provider,
      info.providerUserId,
      info.email || null,
      info.name || null,
      info.avatarUrl || null,
      JSON.stringify(info.rawData)
    ]);

    // 初始化Token配额
    try {
      await tokenQuotaService.createUserQuota(id);
    } catch (err) {
      console.error('Failed to create token quota for user:', id, err);
    }

    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('Failed to create user from social account');
    }

    const token = this.generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  /**
   * 获取用户绑定的所有社交账号
   */
  async getUserSocialAccounts(userId: string): Promise<SocialAccount[]> {
    const result = await this.pool.query(
      'SELECT * FROM social_accounts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows.map(this.formatSocialAccount);
  }

  /**
   * 为已有用户绑定社交账号
   */
  async bindSocialAccount(userId: string, info: {
    provider: OAuthProvider;
    providerUserId: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    rawData: Record<string, any>;
  }): Promise<SocialAccount> {
    // 检查该社交账号是否已被其他用户绑定
    const existing = await this.pool.query(
      'SELECT * FROM social_accounts WHERE provider = $1 AND provider_user_id = $2',
      [info.provider, info.providerUserId]
    );

    if (existing.rows.length > 0) {
      const sa = existing.rows[0];
      if (sa.user_id !== userId) {
        throw new Error('This social account is already bound to another user');
      }
      // 已绑定到当前用户，更新信息
      const updated = await this.pool.query(`
        UPDATE social_accounts SET provider_email = $1, display_name = $2, avatar_url = $3, raw_data = $4, updated_at = CURRENT_TIMESTAMP
        WHERE provider = $5 AND provider_user_id = $6
        RETURNING *
      `, [
        info.email || null,
        info.name || null,
        info.avatarUrl || null,
        JSON.stringify(info.rawData),
        info.provider,
        info.providerUserId
      ]);
      return this.formatSocialAccount(updated.rows[0]);
    }

    // 未绑定，创建新关联
    const result = await this.pool.query(`
      INSERT INTO social_accounts (id, user_id, provider, provider_user_id, provider_email, display_name, avatar_url, raw_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      `sa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      info.provider,
      info.providerUserId,
      info.email || null,
      info.name || null,
      info.avatarUrl || null,
      JSON.stringify(info.rawData)
    ]);

    // 如果用户没有头像，用社交账号头像填充
    if (info.avatarUrl) {
      await this.pool.query(
        'UPDATE users SET avatar = $1 WHERE id = $2 AND (avatar IS NULL OR avatar = \'\')',
        [info.avatarUrl, userId]
      );
    }

    return this.formatSocialAccount(result.rows[0]);
  }

  /**
   * 解绑用户的社交账号
   */
  async unbindSocialAccount(userId: string, provider: OAuthProvider, providerUserId: string): Promise<boolean> {
    // 检查用户是否还有其他登录方式
    const userResult = await this.pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return false;

    const hasPassword = !!userResult.rows[0].password;
    const socialCountResult = await this.pool.query(
      'SELECT COUNT(*) as count FROM social_accounts WHERE user_id = $1',
      [userId]
    );
    const socialCount = parseInt(socialCountResult.rows[0].count);

    // 如果用户没有密码且只有一个社交账号，不允许解绑
    if (!hasPassword && socialCount <= 1) {
      throw new Error('Cannot unbind the only login method. Please set a password first.');
    }

    const result = await this.pool.query(
      'DELETE FROM social_accounts WHERE user_id = $1 AND provider = $2 AND provider_user_id = $3',
      [userId, provider, providerUserId]
    );

    return (result.rowCount || 0) > 0;
  }

  /**
   * 格式化社交账号数据
   */
  private formatSocialAccount(row: any): SocialAccount {
    return {
      id: row.id,
      user_id: row.user_id,
      provider: row.provider,
      provider_user_id: row.provider_user_id,
      provider_email: row.provider_email,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      raw_data: typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  // ───────── 原有方法 ─────────

  // 注册用户
  async registerUser(email: string, password: string, name?: string): Promise<LoginResult> {
    // 检查邮箱是否已存在
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
    
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.pool.query(
      'INSERT INTO users (id, email, password, name) VALUES ($1, $2, $3, $4)',
      [id, email, hashedPassword, name || null]
    );
    
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('Failed to create user');
    }

    // 生成 JWT token
    const token = this.generateToken(user);

    const { password: _, ...userWithoutPassword } = user;

    // 初始化Token配额（100万免费额度）
    try {
      await tokenQuotaService.createUserQuota(id);
    } catch (err) {
      console.error('Failed to create token quota for user:', id, err);
    }

    return {
      user: userWithoutPassword,
      token
    };
  }

  // 创建用户（用于 OAuth 等无需密码的场景）
  async createUser(email: string, name?: string): Promise<User> {
    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.pool.query(
      'INSERT INTO users (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
      [id, email, name || null]
    );
    
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('Failed to create user');
    }

    // 初始化Token配额（100万免费额度）
    try {
      await tokenQuotaService.createUserQuota(id);
    } catch (err) {
      console.error('Failed to create token quota for user:', id, err);
    }

    return user;
  }

  // 根据 ID 获取用户
  async getUserById(id: string): Promise<User | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    
    return this.formatUser(result.rows[0]);
  }

  // 根据邮箱获取用户
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return null;
    
    return this.formatUser(result.rows[0]);
  }

  // 用户登录
  async login(email: string, password: string): Promise<LoginResult | null> {
    const user = await this.getUserByEmail(email);
    
    if (!user || !user.password) {
      return null;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // 生成 JWT token
    const token = this.generateToken(user);

    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token
    };
  }

  // 生成 JWT token
  private generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email
    };
    
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    });
  }

  // 验证 JWT token
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // 更新用户信息
  async updateUser(id: string, updates: Partial<Pick<User, 'name' | 'avatar' | 'bio'>>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.avatar !== undefined) {
      fields.push(`avatar = $${paramIndex++}`);
      values.push(updates.avatar);
    }
    if (updates.bio !== undefined) {
      fields.push(`bio = $${paramIndex++}`);
      values.push(updates.bio);
    }

    if (fields.length === 0) {
      return this.getUserById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await this.pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return this.getUserById(id);
  }

  // 获取用户统计数据
  async getUserStats(userId: string): Promise<UserStats> {
    const projectResult = await this.pool.query(
      'SELECT COUNT(*) as count FROM projects WHERE user_id = $1',
      [userId]
    );

    const teamResult = await this.pool.query(`
      SELECT COUNT(*) as count 
      FROM ai_teams 
      WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)
    `, [userId]);

    const agentTeamResult = await this.pool.query(`
      SELECT COUNT(*) as count 
      FROM agent_teams 
      WHERE team_id IN (
        SELECT id FROM ai_teams 
        WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)
      )
    `, [userId]);

    return {
      projectCount: parseInt(projectResult.rows[0].count),
      teamCount: parseInt(teamResult.rows[0].count),
      agentTeamCount: parseInt(agentTeamResult.rows[0].count)
    };
  }

  // 获取所有用户列表（分页）
  async getAllUsers(page: number = 1, limit: number = 20, search?: string): Promise<{ data: Omit<User, 'password'>[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM users';
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    const values: any[] = [];
    
    if (search) {
      query += ' WHERE email ILIKE $' + (values.length + 1) + ' OR name ILIKE $' + (values.length + 1);
      countQuery += ' WHERE email ILIKE $' + (values.length + 1) + ' OR name ILIKE $' + (values.length + 1);
      values.push('%' + search + '%');
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
    values.push(limit, offset);
    
    const totalResult = await this.pool.query(countQuery, search ? ['%' + search + '%'] : []);
    const total = parseInt(totalResult.rows[0].count);
    
    const usersResult = await this.pool.query(query, values);
    
    return {
      data: usersResult.rows.map(user => {
        const { password, ...userWithoutPassword } = this.formatUser(user);
        return userWithoutPassword;
      }),
      total
    };
  }

  // 封禁用户
  async banUser(userId: string, reason?: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE users SET is_banned = TRUE, ban_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [reason || null, userId]
    );
    return (result.rowCount || 0) > 0;
  }

  // 解封用户
  async unbanUser(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE users SET is_banned = FALSE, ban_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
    return (result.rowCount || 0) > 0;
  }

  // 获取用户总数统计
  async getTotalUserStats(): Promise<{ total: number; active: number; banned: number }> {
    const totalResult = await this.pool.query('SELECT COUNT(*) as count FROM users');
    const activeResult = await this.pool.query('SELECT COUNT(*) as count FROM users WHERE is_banned = FALSE');
    const bannedResult = await this.pool.query('SELECT COUNT(*) as count FROM users WHERE is_banned = TRUE');
    
    return {
      total: parseInt(totalResult.rows[0].count),
      active: parseInt(activeResult.rows[0].count),
      banned: parseInt(bannedResult.rows[0].count)
    };
  }

  // ProClaw 跨服务预授权登录
  // 验证一次性 Token，自动创建/查找用户，返回 JWT
  async crossAuthLogin(proclawToken: string, proclawEmail: string): Promise<LoginResult | null> {
    // 1. 验证 Token 签名
    const decoded = Buffer.from(proclawToken.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;

    const [email, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr);

    // 2. 检查时间戳（5分钟过期）
    if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > this.CROSS_AUTH_MAX_AGE) {
      console.warn('[crossAuth] Token expired:', { email, timestamp, now: Math.floor(Date.now() / 1000) });
      return null;
    }

    // 3. 验证签名（与 ProClaw 端相同的算法）
    const expectedPayload = `${email}:${timestampStr}`;
    const expectedSignature = Buffer.from(`${this.CROSS_AUTH_SECRET}:${expectedPayload}`)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .slice(0, 40);

    if (signature !== expectedSignature) {
      console.warn('[crossAuth] Invalid signature:', { email, received: signature, expected: expectedSignature });
      return null;
    }

    // 4. 验证邮箱匹配
    if (email !== proclawEmail) {
      console.warn('[crossAuth] Email mismatch:', { tokenEmail: email, paramEmail: proclawEmail });
      return null;
    }

    // 5. 查找或创建用户
    let user = await this.getUserByEmail(email);
    if (!user) {
      console.log('[crossAuth] Creating new user:', email);
      user = await this.createUser(email, email.split('@')[0] || undefined);
    }

    // 6. 生成 JWT Token
    const token = this.generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }

  // 格式化用户数据
  private formatUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      password: user.password, // 仅在内部使用
      name: user.name,
      avatar: user.avatar,
      bio: user.bio,
      isBanned: user.is_banned || false,
      banReason: user.ban_reason,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }
}

export const userService = new UserService();
