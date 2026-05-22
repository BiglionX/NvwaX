import { databaseService } from './database.service.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export interface Admin {
  id: string;
  username: string;
  password: string;
  email: string;
  name?: string;
  role: string;
  permissions?: string[];
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface LoginResult {
  admin: Admin;
  token: string;
}

export class AdminService {
  private pool = databaseService.getPool();

  // 创建管理员
  async createAdmin(username: string, password: string, email: string, name?: string, role: string = 'admin'): Promise<Admin> {
    const id = uuidv4();
    // 对密码进行 bcrypt 哈希加密
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.pool.query(
      'INSERT INTO admins (id, username, password, email, name, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, username, hashedPassword, email, name || null, role]
    );
    
    return (await this.getAdminById(id))!;
  }

  // 根据 ID 获取管理员
  async getAdminById(id: string): Promise<Admin | null> {
    const result = await this.pool.query('SELECT * FROM admins WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    
    return this.formatAdmin(result.rows[0]);
  }

  // 根据用户名或邮箱获取管理员
  async getAdminByUsername(username: string): Promise<Admin | null> {
    // 同时支持 username 和 email 登录
    const result = await this.pool.query(
      'SELECT * FROM admins WHERE username = $1 OR email = $1',
      [username]
    );
    if (result.rows.length === 0) return null;
    
    return this.formatAdmin(result.rows[0]);
  }

  // 管理员登录
  async login(username: string, password: string): Promise<LoginResult | null> {
    console.log('[AdminService] Login attempt:', { username, passwordLength: password.length });
    
    const admin = await this.getAdminByUsername(username);
    
    console.log('[AdminService] Admin found:', !!admin);
    if (admin) {
      console.log('[AdminService] Stored password hash:', admin.password.substring(0, 20) + '...');
      
      // 使用 bcrypt 验证密码
      const passwordMatch = await bcrypt.compare(password, admin.password);
      console.log('[AdminService] Password match:', passwordMatch);
      
      if (!passwordMatch) {
        console.log('[AdminService] Login failed - password mismatch');
        return null;
      }
    } else {
      console.log('[AdminService] Login failed - admin not found');
      return null;
    }

    console.log('[AdminService] Login success');

    // 更新最后登录时间
    await this.pool.query(
      'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [admin.id]
    );

    // 生成简单的 token（实际应用中应该使用 JWT）
    const token = `admin_${admin.id}_${Date.now()}`;

    return {
      admin: { ...admin, password: '' }, // 不返回密码
      token
    };
  }

  // 更新管理员信息
  async updateAdmin(id: string, updates: Partial<Pick<Admin, 'name' | 'email' | 'avatar' | 'role'>>): Promise<Admin | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.avatar !== undefined) {
      fields.push(`avatar = $${paramIndex++}`);
      values.push(updates.avatar);
    }
    if (updates.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }

    if (fields.length === 0) {
      return this.getAdminById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await this.pool.query(
      `UPDATE admins SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return this.getAdminById(id);
  }

  // 修改密码
  async changePassword(id: string, newPassword: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE admins SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPassword, id]
    );
    
    return (result.rowCount || 0) > 0;
  }

  // 删除管理员
  async deleteAdmin(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM admins WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  // 获取所有管理员
  async getAllAdmins(): Promise<Admin[]> {
    const result = await this.pool.query('SELECT * FROM admins ORDER BY created_at DESC');
    return result.rows.map(admin => this.formatAdmin(admin));
  }

  // 记录系统日志
  async logAction(level: string, action: string, adminId?: string, details?: string, ipAddress?: string): Promise<void> {
    const id = uuidv4();
    await this.pool.query(
      'INSERT INTO system_logs (id, level, action, admin_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, level, action, adminId || null, details || null, ipAddress || null]
    );
  }

  // 获取系统日志
  async getSystemLogs(page: number = 1, limit: number = 20): Promise<{ data: any[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const totalResult = await this.pool.query('SELECT COUNT(*) as count FROM system_logs');
    const total = parseInt(totalResult.rows[0].count);
    
    const logsResult = await this.pool.query(
      'SELECT * FROM system_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return {
      data: logsResult.rows,
      total
    };
  }

  // 格式化管理员数据
  private formatAdmin(admin: any): Admin {
    return {
      id: admin.id,
      username: admin.username,
      password: admin.password,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: admin.permissions ? JSON.parse(admin.permissions) : undefined,
      avatar: admin.avatar,
      createdAt: admin.created_at,
      updatedAt: admin.updated_at,
      lastLogin: admin.last_login
    };
  }
}

export const adminService = new AdminService();
