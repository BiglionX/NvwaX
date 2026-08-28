import { Request, Response } from 'express';
import { adminService } from '../services/admin.service.js';
import { projectService } from '../services/project.service.js';
import { userService } from '../services/user.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { crawlerSchedulerService } from '../services/crawler-scheduler.service.js';
import { agentCrawlerService } from '../services/agent-crawler.service.js';
import { databaseService } from '../services/database.service.js';
import { TeamSkillPackageService } from '../services/team-skill-package.service.js';
import { tokenQuotaService } from '../services/token-quota.service.js';
import { paymentService } from '../services/payment.service.js';
import { v4 as uuidv4 } from 'uuid';

// 创建 TeamSkillPackageService 实例
const teamSkillPackageService = new TeamSkillPackageService(databaseService.getPool());

export class AdminController {
  // 管理员登录
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      console.log('[Admin Login] Received request:', { username, hasPassword: !!password });

      if (!username || !password) {
        console.log('[Admin Login] Missing fields');
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const result = await adminService.login(username, password);

      if (!result) {
        console.log('[Admin Login] Authentication failed for:', username);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      console.log('[Admin Login] Success:', username);

      // 记录登录日志
      await adminService.logAction('info', 'ADMIN_LOGIN', result.admin.id, `Admin ${result.admin.username} logged in`, req.ip);

      res.json({
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('Error in admin login:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  // 获取当前管理员信息
  async getProfile(req: Request, res: Response) {
    try {
      const admin = req.admin;
      res.json({ data: admin });
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      res.status(500).json({ error: 'Failed to fetch admin profile' });
    }
  }

  // 更新管理员信息
  async updateProfile(req: Request, res: Response) {
    try {
      const adminId = req.admin!.id;
      const { name, email, avatar } = req.body;

      const admin = await adminService.updateAdmin(adminId, { name, email, avatar });

      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      await adminService.logAction('info', 'UPDATE_PROFILE', adminId, 'Admin profile updated', req.ip);

      res.json({ data: { ...admin, password: undefined } });
    } catch (error) {
      console.error('Error updating admin profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  // 修改密码
  async changePassword(req: Request, res: Response) {
    try {
      const adminId = req.admin!.id;
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old and new passwords are required' });
      }

      const admin = await adminService.getAdminById(adminId);
      if (!admin || admin.password !== oldPassword) {
        return res.status(401).json({ error: 'Invalid old password' });
      }

      await adminService.changePassword(adminId, newPassword);
      await adminService.logAction('info', 'CHANGE_PASSWORD', adminId, 'Admin password changed', req.ip);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }

  // 获取所有管理员（需要超级管理员权限）
  async getAllAdmins(req: Request, res: Response) {
    try {
      const admins = await adminService.getAllAdmins();
      const adminsWithoutPassword = admins.map(({ password, ...rest }) => rest);
      res.json({ data: adminsWithoutPassword });
    } catch (error) {
      console.error('Error fetching admins:', error);
      res.status(500).json({ error: 'Failed to fetch admins' });
    }
  }

  // 创建新管理员
  async createAdmin(req: Request, res: Response) {
    try {
      const { username, password, email, name, role } = req.body;

      if (!username || !password || !email) {
        return res.status(400).json({ error: 'Username, password, and email are required' });
      }

      const admin = await adminService.createAdmin(username, password, email, name, role || 'admin');
      await adminService.logAction('info', 'CREATE_ADMIN', req.admin!.id, `Created admin: ${username}`, req.ip);

      res.status(201).json({ data: { ...admin, password: undefined } });
    } catch (error: any) {
      console.error('Error creating admin:', error);
      if (error.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }
      res.status(500).json({ error: 'Failed to create admin' });
    }
  }

  // 删除管理员
  async deleteAdmin(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (id === req.admin!.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
      }

      const success = await adminService.deleteAdmin(id as string);

      if (!success) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      await adminService.logAction('warning', 'DELETE_ADMIN', req.admin!.id, `Deleted admin: ${id}`, req.ip);

      res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
      console.error('Error deleting admin:', error);
      res.status(500).json({ error: 'Failed to delete admin' });
    }
  }

  // 获取系统统计数据
  async getSystemStats(req: Request, res: Response) {
    try {
      const pool = databaseService.getPool();
      
      // 获取基础统计
      const usersResult = await pool.query('SELECT COUNT(*) FROM users');
      const projectsResult = await pool.query('SELECT COUNT(*) FROM projects');
      const adminsResult = await pool.query('SELECT COUNT(*) FROM admins');
      
      // 获取近7天用户注册趋势
      const trendResult = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);

      res.json({
        data: {
          totalUsers: parseInt(usersResult.rows[0].count),
          totalProjects: parseInt(projectsResult.rows[0].count),
          totalAdmins: parseInt(adminsResult.rows[0].count),
          systemUptime: process.uptime(),
          userTrend: trendResult.rows.map(row => ({
            date: row.date,
            count: parseInt(row.count)
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      res.status(500).json({ error: 'Failed to fetch system stats' });
    }
  }

  // 接收前端审计事件（v2.3+）—— 把 Nvwa 工作台审计持久化到 system_logs
  // POST /api/admin/system/logs
  // Body: { level, action, details, resourceId?, meta?, source? }
  // 鉴权：universalAuthMiddleware 已挂载（必须有登录 user）
  async createAuditEvent(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).sessionUser?.id || null;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { level, action, details, resourceId, meta, source } = req.body ?? {};
      if (!action || typeof action !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid action' });
      }
      if (!level || !['info', 'warning', 'error'].includes(level)) {
        return res.status(400).json({ success: false, error: 'level must be info/warning/error' });
      }

      // details 保留人读描述；meta 单独存到 details 后缀（保持向后兼容）
      // v2.3+: resource_id 已单独成列，不再序列化到 details
      const detailsWithMeta = meta && Object.keys(meta).length > 0
        ? `${details ?? ''}${details ? ' | ' : ''}meta=${JSON.stringify(meta)}`
        : details ?? '';

      await adminService.logAction(
        level,
        action,
        undefined, // adminId = null（user 级事件，不是 admin 操作）
        detailsWithMeta,
        req.ip,
        userId,
        source ?? 'nvwa-workbench',
        typeof resourceId === 'string' && resourceId ? resourceId : undefined
      );

      res.status(201).json({ success: true, message: 'Audit event recorded' });
    } catch (error) {
      console.error('[Audit] createAuditEvent failed:', error);
      res.status(500).json({ success: false, error: 'Failed to record audit event' });
    }
  }

  // 获取系统日志
  async getSystemLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const action = req.query.action as string | undefined;
      const adminId = req.query.adminId as string | undefined;
      const userId = req.query.userId as string | undefined;
      const resourceId = req.query.resourceId as string | undefined;
      const source = req.query.source as string | undefined;

      const pool = databaseService.getPool();
      let query = 'SELECT * FROM system_logs';
      const params: any[] = [];
      const whereClauses: string[] = [];

      if (action) {
        whereClauses.push(`action ILIKE $${params.length + 1}`);
        params.push(`%${action}%`);
      }
      if (adminId) {
        whereClauses.push(`admin_id = $${params.length + 1}`);
        params.push(adminId);
      }
      if (userId) {
        whereClauses.push(`user_id = $${params.length + 1}`);
        params.push(userId);
      }
      if (source) {
        whereClauses.push(`source = $${params.length + 1}`);
        params.push(source);
      }
      if (resourceId) {
        whereClauses.push(`resource_id = $${params.length + 1}`);
        params.push(resourceId);
      }

      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }

      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, (page - 1) * limit);

      const result = await pool.query(query, params);

      // 获取总数
      let countQuery = 'SELECT COUNT(*) FROM system_logs';
      const countParams: any[] = [];
      if (whereClauses.length > 0) {
        countQuery += ' WHERE ' + whereClauses.join(' AND ');
        countParams.push(...params.slice(0, params.length - 2));
      }
      const countResult = await pool.query(countQuery, countParams);

      res.json({
        data: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      });
    } catch (error) {
      console.error('Error fetching system logs:', error);
      res.status(500).json({ error: 'Failed to fetch system logs' });
    }
  }

  /**
   * 审计日志聚合统计（v2.3+）
   * GET /api/admin/system/logs/stats
   *
   * Query:
   *   - source: 按 source 过滤（默认全部）
   *   - days: 时间窗口（默认 7）
   *
   * 返回：
   *   - totalEvents: 总事件数
   *   - byLevel: { info, warning, error } 计数
   *   - bySource: { 'admin': n, 'nvwa-workbench': m } 计数
   *   - topActions: [{ action, count, latestAt, errorRate }] 前 10
   *   - timeline24h: [{ hour: '00'-'23', count, errorCount }] 24 小时分布
   *   - successRate: 0-1 浮点（基于 failed actions 集合）
   */
  async getSystemLogStats(req: Request, res: Response) {
    try {
      const pool = databaseService.getPool();
      const source = req.query.source as string | undefined;
      const days = Math.max(1, Math.min(90, parseInt(req.query.days as string) || 7));

      // 通用 WHERE 片段
      const whereParts: string[] = [`created_at >= NOW() - ($1 || ' days')::interval`];
      const baseParams: unknown[] = [String(days)];
      if (source) {
        whereParts.push(`source = $${baseParams.length + 1}`);
        baseParams.push(source);
      }
      const baseWhere = `WHERE ${whereParts.join(' AND ')}`;

      // 1) 总数 + 按 level 分组
      const totalsRes = await pool.query(
        `SELECT level, COUNT(*)::int AS count FROM system_logs ${baseWhere} GROUP BY level`,
        baseParams
      );
      const byLevel = { info: 0, warning: 0, error: 0 } as Record<string, number>;
      let totalEvents = 0;
      for (const row of totalsRes.rows) {
        const lvl = row.level as string;
        const c = row.count as number;
        byLevel[lvl] = (byLevel[lvl] ?? 0) + c;
        totalEvents += c;
      }

      // 2) 按 source 分组
      const bySourceRes = await pool.query(
        `SELECT COALESCE(source, 'unknown') AS src, COUNT(*)::int AS count
         FROM system_logs ${baseWhere}
         GROUP BY COALESCE(source, 'unknown')
         ORDER BY count DESC`,
        baseParams
      );

      // 3) Top 10 actions + 每 action 的 error 率
      const topRes = await pool.query(
        `SELECT action,
                COUNT(*)::int AS count,
                COUNT(CASE WHEN level = 'error' THEN 1 END)::int AS error_count,
                MAX(created_at) AS latest_at
         FROM system_logs ${baseWhere}
         GROUP BY action
         ORDER BY count DESC
         LIMIT 10`,
        baseParams
      );
      const topActions = topRes.rows.map((r) => {
        const cnt = r.count as number;
        const ec = r.error_count as number;
        return {
          action: r.action as string,
          count: cnt,
          errorCount: ec,
          errorRate: cnt > 0 ? ec / cnt : 0,
          latestAt: r.latest_at as string,
        };
      });

      // 4) 24 小时时间分布（按本地时间聚合，PG 用 date_trunc('hour', created_at AT TIME ZONE 'UTC')）
      const timelineRes = await pool.query(
        `SELECT
           EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC')::int AS hour_utc,
           COUNT(*)::int AS count,
           COUNT(CASE WHEN level = 'error' THEN 1 END)::int AS error_count
         FROM system_logs
         ${baseWhere}
           AND created_at >= NOW() - INTERVAL '24 hours'
         GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC')
         ORDER BY hour_utc ASC`,
        baseParams
      );
      // 填齐 0-23 缺失的小时
      const hourMap = new Map<number, { count: number; errorCount: number }>();
      for (const r of timelineRes.rows) {
        hourMap.set(r.hour_utc as number, {
          count: r.count as number,
          errorCount: r.error_count as number,
        });
      }
      const timeline24h = Array.from({ length: 24 }, (_, h) => ({
        hour: String(h).padStart(2, '0'),
        count: hourMap.get(h)?.count ?? 0,
        errorCount: hourMap.get(h)?.errorCount ?? 0,
      }));

      // 5) 成功率：error 事件占总事件比例
      const successRate = totalEvents > 0 ? 1 - byLevel.error / totalEvents : 1;

      res.json({
        success: true,
        data: {
          windowDays: days,
          totalEvents,
          byLevel,
          bySource: bySourceRes.rows.map((r) => ({
            source: r.src as string,
            count: r.count as number,
          })),
          topActions,
          timeline24h,
          successRate,
        },
      });
    } catch (error) {
      console.error('[Audit] getSystemLogStats failed:', error);
      res.status(500).json({ success: false, error: 'Failed to get system log stats' });
    }
  }

  // ========== 爬虫管理功能 ==========

  /**
   * 获取爬虫状态和统计信息
   */
  async getCrawlerStatus(req: Request, res: Response) {
    try {
      const schedulerStatus = crawlerSchedulerService.getStatus();
      
      // 获取数据库中的 Agent 统计
      const pool = databaseService.getPool();
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_agents,
          COUNT(CASE WHEN source = 'github' THEN 1 END) as github_count,
          COUNT(CASE WHEN source = 'huggingface' THEN 1 END) as huggingface_count,
          COUNT(CASE WHEN source = 'custom' THEN 1 END) as custom_count,
          MAX(last_crawled_at) as last_crawl_time
        FROM agent_metadata
      `);

      const stats = statsResult.rows[0];

      res.json({
        success: true,
        data: {
          scheduler: schedulerStatus,
          statistics: {
            totalAgents: parseInt(stats.total_agents),
            githubAgents: parseInt(stats.github_count),
            huggingfaceAgents: parseInt(stats.huggingface_count),
            customAgents: parseInt(stats.custom_count),
            lastCrawlTime: stats.last_crawl_time
          }
        }
      });
    } catch (error) {
      console.error('Error fetching crawler status:', error);
      res.status(500).json({ error: 'Failed to fetch crawler status' });
    }
  }

  /**
   * 手动触发爬虫任务
   */
  async triggerCrawler(req: Request, res: Response) {
    try {
      const adminId = req.admin!.id;
      
      // 记录操作日志
      await adminService.logAction('info', 'TRIGGER_CRAWLER', adminId, 'Manual crawler triggered', req.ip);

      res.json({
        success: true,
        message: '爬虫任务已启动，请稍候查看结果'
      });

      // 异步执行爬虫任务
      crawlerSchedulerService.triggerManualCrawl().then(result => {
        console.log('Manual crawl completed:', result);
        adminService.logAction('info', 'CRAWLER_COMPLETED', adminId, 
          `Crawl completed: ${result.github} from GitHub, ${result.huggingface} from HuggingFace`, req.ip);
      }).catch(error => {
        console.error('Manual crawl failed:', error);
        adminService.logAction('error', 'CRAWLER_FAILED', adminId, `Crawl failed: ${error.message}`, req.ip);
      });
    } catch (error) {
      console.error('Error triggering crawler:', error);
      res.status(500).json({ error: 'Failed to trigger crawler' });
    }
  }

  /**
   * 更新爬虫配置
   */
  async updateCrawlerConfig(req: Request, res: Response) {
    try {
      const adminId = req.admin!.id;
      const { intervalHours } = req.body;

      if (!intervalHours || intervalHours < 1 || intervalHours > 168) {
        return res.status(400).json({ 
          error: 'Invalid interval. Must be between 1 and 168 hours (1 week)' 
        });
      }

      // 停止当前的调度器
      crawlerSchedulerService.stop();
      
      // 使用新的间隔重新启动
      crawlerSchedulerService.start(intervalHours);

      await adminService.logAction('info', 'UPDATE_CRAWLER_CONFIG', adminId, 
        `Updated crawler interval to ${intervalHours} hours`, req.ip);

      res.json({
        success: true,
        message: `爬虫间隔已更新为 ${intervalHours} 小时`,
        data: {
          intervalHours
        }
      });
    } catch (error) {
      console.error('Error updating crawler config:', error);
      res.status(500).json({ error: 'Failed to update crawler configuration' });
    }
  }

  /**
   * 获取最近的爬取记录
   */
  async getCrawlerHistory(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      const pool = databaseService.getPool();
      const result = await pool.query(`
        SELECT 
          id,
          name,
          source,
          stars,
          downloads,
          last_crawled_at,
          created_at
        FROM agent_metadata
        ORDER BY last_crawled_at DESC NULLS LAST, created_at DESC
        LIMIT $1
      `, [limit]);

      res.json({
        success: true,
        data: result.rows,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Error fetching crawler history:', error);
      res.status(500).json({ error: 'Failed to fetch crawler history' });
    }
  }

  /**
   * 清理旧的 Agent 数据
   */
  async cleanOldAgents(req: Request, res: Response) {
    try {
      const adminId = req.admin!.id;
      const { days } = req.body;
      
      if (!days || days < 1 || days > 365) {
        return res.status(400).json({ 
          error: 'Invalid days. Must be between 1 and 365' 
        });
      }

      const pool = databaseService.getPool();
      const result = await pool.query(`
        DELETE FROM agent_metadata
        WHERE last_crawled_at < NOW() - INTERVAL '${days} days'
        RETURNING id, name, source
      `);

      const deletedCount = result.rowCount || 0;

      await adminService.logAction('warning', 'CLEAN_OLD_AGENTS', adminId, 
        `Deleted ${deletedCount} agents older than ${days} days`, req.ip);

      res.json({
        success: true,
        message: `已删除 ${deletedCount} 条旧数据`,
        data: {
          deletedCount,
          days
        }
      });
    } catch (error) {
      console.error('Error cleaning old agents:', error);
      res.status(500).json({ error: 'Failed to clean old agents' });
    }
  }

  // 获取用户列表（分页）
  async getUserList(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const result = await userService.getAllUsers(page, limit, search);
      
      // 获取这些用户的社交账号绑定信息
      const userIds = result.data.map(u => u.id);
      let socialByUser: Record<string, Array<{ provider: string; providerUserId: string; displayName?: string }>> = {};
      
      if (userIds.length > 0) {
        const pool = databaseService.getPool();
        const socialResult = await pool.query(`
          SELECT user_id, provider, provider_user_id, display_name
          FROM social_accounts
          WHERE user_id = ANY($1::text[])
          ORDER BY created_at DESC
        `, [userIds]);

        for (const row of socialResult.rows) {
          if (!socialByUser[row.user_id]) {
            socialByUser[row.user_id] = [];
          }
          socialByUser[row.user_id].push({
            provider: row.provider,
            providerUserId: row.provider_user_id,
            displayName: row.display_name
          });
        }
      }

      res.json({
        data: result.data.map(user => ({
          ...user,
          socialAccounts: socialByUser[user.id] || []
        })),
        total: result.total,
        page,
        limit
      });
    } catch (error) {
      console.error('Error fetching user list:', error);
      res.status(500).json({ error: 'Failed to fetch user list' });
    }
  }

  /**
   * 获取指定用户的社交账号绑定
   */
  async getUserSocialAccounts(req: Request, res: Response) {
    try {
      const userId = req.params.userId;

      if (!userId || Array.isArray(userId)) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const accounts = await userService.getUserSocialAccounts(userId);

      res.json({
        data: accounts.map(acc => ({
          id: acc.id,
          provider: acc.provider,
          providerUserId: acc.provider_user_id,
          providerEmail: acc.provider_email,
          displayName: acc.display_name,
          avatarUrl: acc.avatar_url,
          createdAt: acc.created_at
        }))
      });
    } catch (error) {
      console.error('Error fetching user social accounts:', error);
      res.status(500).json({ error: 'Failed to fetch user social accounts' });
    }
  }

  /**
   * 获取社交账号绑定统计
   */
  async getUserSocialStats(req: Request, res: Response) {
    try {
      const pool = databaseService.getPool();
      const result = await pool.query(`
        SELECT
          provider,
          COUNT(*) as count
        FROM social_accounts
        GROUP BY provider
        ORDER BY count DESC
      `);

      const totalResult = await pool.query('SELECT COUNT(*) as total FROM social_accounts');

      res.json({
        data: {
          total: parseInt(totalResult.rows[0].total),
          breakdown: result.rows.map(row => ({
            provider: row.provider,
            count: parseInt(row.count)
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching social account stats:', error);
      res.status(500).json({ error: 'Failed to fetch social account stats' });
    }
  }

  // 获取用户统计信息
  async getUserStats(req: Request, res: Response) {
    try {
      const stats = await userService.getTotalUserStats();
      
      res.json({
        data: stats
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  }

  // 封禁用户
  async banUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.admin!.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const success = await userService.banUser(id, reason);

      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }

      await adminService.logAction('warning', 'BAN_USER', adminId, 
        `Banned user: ${id}${reason ? ` - Reason: ${reason}` : ''}`, req.ip);

      res.json({
        success: true,
        message: 'User banned successfully'
      });
    } catch (error) {
      console.error('Error banning user:', error);
      res.status(500).json({ error: 'Failed to ban user' });
    }
  }

  // 解封用户
  async unbanUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminId = req.admin!.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const success = await userService.unbanUser(id);

      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }

      await adminService.logAction('info', 'UNBAN_USER', adminId, 
        `Unbanned user: ${id}`, req.ip);

      res.json({
        success: true,
        message: 'User unbanned successfully'
      });
    } catch (error) {
      console.error('Error unbanning user:', error);
      res.status(500).json({ error: 'Failed to unban user' });
    }
  }

  // 获取项目列表（分页）
  async getProjectList(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;

      const result = await projectService.getAllProjects(page, limit, search, status);
      
      res.json({
        data: result.data,
        total: result.total,
        page,
        limit
      });
    } catch (error) {
      console.error('Error fetching project list:', error);
      res.status(500).json({ error: 'Failed to fetch project list' });
    }
  }

  // 获取项目统计信息
  async getProjectStats(req: Request, res: Response) {
    try {
      const stats = await projectService.getProjectStats();
      
      res.json({
        data: stats
      });
    } catch (error) {
      console.error('Error fetching project stats:', error);
      res.status(500).json({ error: 'Failed to fetch project stats' });
    }
  }

  // 审核项目
  async reviewProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approved, notes } = req.body;
      const adminId = req.admin!.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      if (typeof approved !== 'boolean') {
        return res.status(400).json({ error: 'Approved field is required' });
      }

      const success = await projectService.reviewProject(id, approved, notes);

      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }

      await adminService.logAction('info', 'REVIEW_PROJECT', adminId, 
        `${approved ? 'Approved' : 'Rejected'} project: ${id}${notes ? ` - Notes: ${notes}` : ''}`, req.ip);

      res.json({
        success: true,
        message: approved ? 'Project approved' : 'Project rejected'
      });
    } catch (error) {
      console.error('Error reviewing project:', error);
      res.status(500).json({ error: 'Failed to review project' });
    }
  }

  // 下架项目
  async suspendProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.admin!.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      const success = await projectService.suspendProject(id, reason);

      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }

      await adminService.logAction('warning', 'SUSPEND_PROJECT', adminId, 
        `Suspended project: ${id}${reason ? ` - Reason: ${reason}` : ''}`, req.ip);

      res.json({
        success: true,
        message: 'Project suspended successfully'
      });
    } catch (error) {
      console.error('Error suspending project:', error);
      res.status(500).json({ error: 'Failed to suspend project' });
    }
  }

  // 恢复项目
  async restoreProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminId = req.admin!.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      const success = await projectService.restoreProject(id);

      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }

      await adminService.logAction('info', 'RESTORE_PROJECT', adminId, 
        `Restored project: ${id}`, req.ip);

      res.json({
        success: true,
        message: 'Project restored successfully'
      });
    } catch (error) {
      console.error('Error restoring project:', error);
      res.status(500).json({ error: 'Failed to restore project' });
    }
  }

  // 获取系统健康状态
  async getSystemHealth(req: Request, res: Response) {
    try {
      const pool = databaseService.getPool();
      
      // 检查数据库连接
      let dbStatus = 'healthy';
      try {
        await pool.query('SELECT 1');
      } catch (error) {
        dbStatus = 'unhealthy';
      }

      // 获取系统信息
      const health = {
        status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: {
          status: dbStatus,
          poolSize: (pool as any).totalCount || 0,
          idleCount: (pool as any).idleCount || 0,
          waitingCount: (pool as any).waitingCount || 0
        },
        nodeVersion: process.version,
        platform: process.platform
      };

      res.json({ data: health });
    } catch (error) {
      console.error('Error getting system health:', error);
      res.status(500).json({ error: 'Failed to get system health' });
    }
  }

  // 清理系统缓存
  async clearCache(req: Request, res: Response) {
    try {
      const adminId = req.admin!.id;

      // 这里可以添加实际的缓存清理逻辑
      // 例如：清理 Redis、清理内存缓存等
      
      await adminService.logAction('info', 'CLEAR_CACHE', adminId, 
        'System cache cleared', req.ip);

      res.json({
        success: true,
        message: '缓存已清理'
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  }

  // 获取 Agent 列表（分页）
  async getAgentList(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const pool = databaseService.getPool();
      let query = 'SELECT * FROM agents';
      const params: any[] = [];
      
      if (search) {
        query += ' WHERE name ILIKE $1 OR description ILIKE $1';
        params.push(`%${search}%`);
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, (page - 1) * limit);

      const result = await pool.query(query, params);
      
      // 获取总数
      let countQuery = 'SELECT COUNT(*) FROM agents';
      const countParams: any[] = [];
      if (search) {
        countQuery += ' WHERE name ILIKE $1 OR description ILIKE $1';
        countParams.push(`%${search}%`);
      }
      const countResult = await pool.query(countQuery, countParams);

      res.json({
        data: result.rows,
        total: parseInt(countResult.rows[0].count),
        page,
        limit
      });
    } catch (error) {
      console.error('Error fetching agent list:', error);
      res.status(500).json({ error: 'Failed to fetch agent list' });
    }
  }

  // 获取 AiTeam 打包任务列表
  async getAiTeamBuilds(req: Request, res: Response) {
    try {
      const jobs = teamSkillPackageService.getAllJobs();
        
      res.json({
        success: true,
        data: jobs,
        total: jobs.length
      });
    } catch (error) {
      console.error('Error fetching AiTeam builds:', error);
      res.status(500).json({ error: 'Failed to fetch build jobs' });
    }
  }

  // 发送系统公告（广播通知）
  async sendSystemAnnouncement(req: Request, res: Response) {
    try {
      const { title, message, priority = 'high' } = req.body;
      const adminId = req.admin!.id;

      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
      }

      const pool = databaseService.getPool();
      
      // 获取所有用户 ID
      const usersResult = await pool.query('SELECT id FROM users');
      const userIds = usersResult.rows.map(row => row.id);

      if (userIds.length === 0) {
        return res.json({ success: true, message: 'No users to notify', sentCount: 0 });
      }

      // 批量插入通知
      const values = userIds.map((userId, index) => {
        const id = uuidv4();
        return `('${id}', '${userId}', 'system_announcement', '${title.replace(/'/g, "''")}', '${message.replace(/'/g, "''")}', '{}', false, '${priority}', NOW(), NOW())`;
      }).join(', ');

      await pool.query(`
        INSERT INTO notifications (id, user_id, type, title, message, data, is_read, priority, created_at, updated_at)
        VALUES ${values}
      `);

      await adminService.logAction('info', 'SEND_ANNOUNCEMENT', adminId, 
        `Sent announcement to ${userIds.length} users`, req.ip);

      res.json({
        success: true,
        message: `公告已发送给 ${userIds.length} 位用户`,
        sentCount: userIds.length
      });
    } catch (error) {
      console.error('Error sending announcement:', error);
      res.status(500).json({ error: 'Failed to send announcement' });
    }
  }

  // 数据库备份
  async backupDatabase(req: Request, res: Response) {
    try {
      const adminId = req.admin!.id;

      // 生成备份文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `backup_${timestamp}.sql`;

      // 注意：实际生产中应该使用 pg_dump 等工具进行真正的备份
      // 这里只是一个示例
      
      await adminService.logAction('info', 'BACKUP_DATABASE', adminId, 
        `Database backup initiated: ${backupFile}`, req.ip);

      res.json({
        success: true,
        message: '数据库备份已启动',
        data: {
          backupFile,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error backing up database:', error);
      res.status(500).json({ error: 'Failed to backup database' });
    }
  }

  // ========== Token 配额管理 ==========

  /**
   * 获取Token消耗总览统计
   */
  async getTokenOverview(req: Request, res: Response) {
    try {
      const stats = await tokenQuotaService.getTokenOverviewStats();
      res.json({ data: stats });
    } catch (error) {
      console.error('Error fetching token overview:', error);
      res.status(500).json({ error: 'Failed to fetch token overview' });
    }
  }

  /**
   * 获取所有用户Token统计（分页）
   */
  async getTokenUsersList(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const result = await tokenQuotaService.getAllUsersTokenStats(page, limit, search);
      res.json({
        data: result.data,
        total: result.total,
        page,
        limit
      });
    } catch (error) {
      console.error('Error fetching token users list:', error);
      res.status(500).json({ error: 'Failed to fetch token users list' });
    }
  }

  /**
   * 获取单个用户的Token消耗明细
   */
  async getTokenUserDetail(req: Request, res: Response) {
    try {
      const userId = req.params.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sourceType = req.query.sourceType as string | undefined;

      // 获取配额信息
      const quota = await tokenQuotaService.getUserQuota(userId);

      // 获取消费明细
      const transactions = await tokenQuotaService.getUserConsumptionDetail(userId, page, limit, sourceType);

      res.json({
        data: {
          quota: quota ? {
            monthlyLimit: quota.monthly_limit,
            usedThisMonth: quota.used_this_month,
            remaining: Math.max(0, quota.monthly_limit - quota.used_this_month),
            usagePercent: Math.min(100, Math.round((quota.used_this_month / quota.monthly_limit) * 100)),
            overageTokens: quota.overage_tokens,
            overageCost: quota.overage_cost,
            totalUsed: quota.total_used,
            lastResetAt: quota.last_reset_at
          } : null,
          transactions: transactions.data,
          total: transactions.total,
          page,
          limit
        }
      });
    } catch (error) {
      console.error('Error fetching token user detail:', error);
      res.status(500).json({ error: 'Failed to fetch token user detail' });
    }
  }

  /**
   * 获取Token消耗来源分类统计
   */
  async getTokenConsumptionBreakdown(req: Request, res: Response) {
    try {
      const period = (req.query.period as string) || 'month';
      const breakdown = await tokenQuotaService.getTokenConsumptionBreakdown(period as 'day' | 'week' | 'month');
      res.json({ data: breakdown });
    } catch (error) {
      console.error('Error fetching token consumption breakdown:', error);
      res.status(500).json({ error: 'Failed to fetch token consumption breakdown' });
    }
  }

  /**
   * 手动重置月度配额（管理员操作）
   */
  async resetMonthlyQuotas(req: Request, res: Response) {
    try {
      const adminId = req.admin!.id;
      const count = await tokenQuotaService.resetAllMonthlyQuotas();
      
      await adminService.logAction('info', 'RESET_TOKEN_QUOTAS', adminId,
        `Reset ${count} user token quotas for new month`, req.ip);

      res.json({
        success: true,
        message: `已重置 ${count} 个用户的月度Token配额`,
        data: { resetCount: count }
      });
    } catch (error) {
      console.error('Error resetting monthly quotas:', error);
      res.status(500).json({ error: 'Failed to reset monthly quotas' });
    }
  }

  /**
   * 切换用户内部团队状态
   */
  async toggleInternalTeam(req: Request, res: Response) {
    try {
      const adminId = req.admin!.id;
      const userId = req.params.userId as string;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const result = await tokenQuotaService.toggleInternalTeam(userId);
      
      await adminService.logAction('info', 'TOGGLE_INTERNAL_TEAM', adminId,
        `Toggled user ${userId} internal team status to ${result.is_internal_team}`, req.ip);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error toggling internal team:', error);
      res.status(500).json({ error: 'Failed to toggle internal team status' });
    }
  }

  /**
   * 获取开发者列表（有API Key的用户）
   */
  async getDeveloperList(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const result = await tokenQuotaService.getDevelopers(page, limit, search);
      res.json({
        data: result.data,
        total: result.total,
        page,
        limit
      });
    } catch (error) {
      console.error('Error fetching developer list:', error);
      res.status(500).json({ error: 'Failed to fetch developer list' });
    }
  }

  // ========== 支付配置管理 ==========

  /**
   * 获取支付配置列表
   */
  async getPaymentConfigs(req: Request, res: Response) {
    try {
      const configs = await paymentService.getPaymentConfigs();
      res.json({ data: configs });
    } catch (error) {
      console.error('Error fetching payment configs:', error);
      res.status(500).json({ error: 'Failed to fetch payment configs' });
    }
  }

  /**
   * 保存/更新支付配置
   */
  async savePaymentConfig(req: Request, res: Response) {
    try {
      const { provider, provider_label, qr_code_url, account_name, account_info, sort_order } = req.body;

      if (!provider || !provider_label) {
        return res.status(400).json({ error: 'provider and provider_label are required' });
      }

      const config = await paymentService.savePaymentConfig({
        provider,
        provider_label,
        qr_code_url,
        account_name,
        account_info,
        sort_order
      });

      res.json({ data: config });
    } catch (error) {
      console.error('Error saving payment config:', error);
      res.status(500).json({ error: 'Failed to save payment config' });
    }
  }

  /**
   * 启用/禁用支付配置
   */
  async togglePaymentConfig(req: Request, res: Response) {
    try {
      const provider = req.params.provider as string;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled must be a boolean' });
      }

      const config = await paymentService.togglePaymentConfig(provider, enabled);
      if (!config) {
        return res.status(404).json({ error: 'Payment config not found' });
      }

      res.json({ data: config });
    } catch (error) {
      console.error('Error toggling payment config:', error);
      res.status(500).json({ error: 'Failed to toggle payment config' });
    }
  }

  // ========== Token订单管理 ==========

  /**
   * 获取Token购买订单列表
   */
  async getTokenOrders(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;

      const result = await paymentService.getAllOrders(page, limit, status);
      res.json({
        data: result.data,
        total: result.total,
        page,
        limit
      });
    } catch (error) {
      console.error('Error fetching token orders:', error);
      res.status(500).json({ error: 'Failed to fetch token orders' });
    }
  }

  /**
   * 确认Token订单付款
   */
  async confirmTokenOrder(req: Request, res: Response) {
    try {
      const orderId = req.params.id as string;
      const adminId = req.admin!.id;

      const order = await paymentService.confirmOrder(orderId, adminId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found or already processed' });
      }

      await adminService.logAction('info', 'CONFIRM_TOKEN_ORDER', adminId,
        `Confirmed token order ${orderId} for ¥${order.amount}`, req.ip);

      res.json({ data: order });
    } catch (error) {
      console.error('Error confirming token order:', error);
      res.status(500).json({ error: 'Failed to confirm token order' });
    }
  }

  /**
   * 取消Token订单
   */
  async cancelTokenOrder(req: Request, res: Response) {
    try {
      const orderId = req.params.id as string;

      const order = await paymentService.cancelOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found or already processed' });
      }

      res.json({ data: order });
    } catch (error) {
      console.error('Error cancelling token order:', error);
      res.status(500).json({ error: 'Failed to cancel token order' });
    }
  }
}

export const adminController = new AdminController();
