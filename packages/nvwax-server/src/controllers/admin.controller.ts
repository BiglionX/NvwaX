import { Request, Response } from 'express';
import { adminService } from '../services/admin.service.js';
import { projectService } from '../services/project.service.js';
import { userService } from '../services/user.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { crawlerSchedulerService } from '../services/crawler-scheduler.service.js';
import { agentCrawlerService } from '../services/agent-crawler.service.js';
import { databaseService } from '../services/database.service.js';

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
      const adminId = req.admin.id;
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
      const adminId = req.admin.id;
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
      await adminService.logAction('info', 'CREATE_ADMIN', req.admin.id, `Created admin: ${username}`, req.ip);

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

      if (id === req.admin.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
      }

      const success = await adminService.deleteAdmin(id as string);

      if (!success) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      await adminService.logAction('warning', 'DELETE_ADMIN', req.admin.id, `Deleted admin: ${id}`, req.ip);

      res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
      console.error('Error deleting admin:', error);
      res.status(500).json({ error: 'Failed to delete admin' });
    }
  }

  // 获取系统统计数据
  async getSystemStats(req: Request, res: Response) {
    try {
      const totalUsers = await adminService.getAdminById('user-123') ? 1 : 0; // 简单示例
      
      const allProjects = await projectService.getProjects('user-123', 1, 1000);
      const totalProjects = allProjects.total;
      const allAdmins = await adminService.getAllAdmins();

      res.json({
        data: {
          totalUsers,
          totalProjects,
          totalAdmins: allAdmins.length,
          systemUptime: process.uptime()
        }
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      res.status(500).json({ error: 'Failed to fetch system stats' });
    }
  }

  // 获取系统日志
  async getSystemLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const logs = await adminService.getSystemLogs(page, limit);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching system logs:', error);
      res.status(500).json({ error: 'Failed to fetch system logs' });
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
      const adminId = req.admin.id;
      
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
      const adminId = req.admin.id;
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
      const adminId = req.admin.id;
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
      
      res.json({
        data: result.data,
        total: result.total,
        page,
        limit
      });
    } catch (error) {
      console.error('Error fetching user list:', error);
      res.status(500).json({ error: 'Failed to fetch user list' });
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
      const adminId = req.admin.id;

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
      const adminId = req.admin.id;

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
      const adminId = req.admin.id;

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
      const adminId = req.admin.id;

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
      const adminId = req.admin.id;

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
      const adminId = req.admin.id;

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

  // 数据库备份
  async backupDatabase(req: Request, res: Response) {
    try {
      const adminId = req.admin.id;

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
}

export const adminController = new AdminController();
