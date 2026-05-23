import { databaseService } from './database.service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
    
    return (await this.getUserById(id))!;
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
