/**
 * MicroBiz 控制器
 * 
 * 处理小商家经营 AI Team 套件的 HTTP 请求
 */

import { Request, Response } from 'express';
import { microbizTeamService } from '../services/microbiz-team.service.js';
import { microbizWebhookService, WebhookPayload } from '../services/microbiz-webhook.service.js';

export class MicroBizController {
  /**
   * 获取所有 MicroBiz 团队
   * GET /api/microbiz/teams?category=social_media
   */
  async getTeams(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const teams = await microbizTeamService.getTeams(category as string | undefined);
      res.json({ success: true, data: teams });
    } catch (error) {
      console.error('Error fetching MicroBiz teams:', error);
      res.status(500).json({ success: false, error: '获取团队列表失败' });
    }
  }

  /**
   * 获取团队详情
   * GET /api/microbiz/teams/:id
   */
  async getTeamById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const teamId = Array.isArray(id) ? id[0] : id;
      const team = await microbizTeamService.getTeamById(teamId);

      if (!team) {
        return res.status(404).json({ success: false, error: '团队不存在' });
      }

      res.json({ success: true, data: team });
    } catch (error) {
      console.error('Error fetching MicroBiz team:', error);
      res.status(500).json({ success: false, error: '获取团队详情失败' });
    }
  }

  /**
   * 获取团队下的所有 Agent
   * GET /api/microbiz/teams/:id/agents
   */
  async getTeamAgents(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const teamId = Array.isArray(id) ? id[0] : id;
      const agents = await microbizTeamService.getAgentsByTeamId(teamId);

      res.json({ success: true, data: agents });
    } catch (error) {
      console.error('Error fetching MicroBiz agents:', error);
      res.status(500).json({ success: false, error: '获取Agent列表失败' });
    }
  }

  /**
   * 获取所有 Agent
   * GET /api/microbiz/agents?category=social_media
   */
  async getAllAgents(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const agents = await microbizTeamService.getAllAgents(category as string | undefined);
      res.json({ success: true, data: agents });
    } catch (error) {
      console.error('Error fetching all MicroBiz agents:', error);
      res.status(500).json({ success: false, error: '获取Agent列表失败' });
    }
  }

  /**
   * 安装 MicroBiz 套件
   * POST /api/microbiz/install
   */
  async install(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: '未授权，请先登录' });
      }

      const { selectedTeams, accountBindings, preferences } = req.body;

      if (!selectedTeams || !Array.isArray(selectedTeams) || selectedTeams.length === 0) {
        return res.status(400).json({ success: false, error: '请至少选择一个团队' });
      }

      const installation = await microbizTeamService.installTeam(userId, {
        selectedTeams,
        accountBindings,
        preferences
      });

      res.status(201).json({ success: true, data: installation, message: '安装成功' });
    } catch (error: any) {
      console.error('Error installing MicroBiz:', error);

      if (error.message?.includes('INVALID_TEAMS')) {
        return res.status(400).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: '安装失败' });
    }
  }

  /**
   * 获取用户的安装记录
   * GET /api/microbiz/installations
   */
  async getInstallation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: '未授权，请先登录' });
      }

      const installation = await microbizTeamService.getInstallation(userId);

      if (!installation) {
        return res.json({ success: true, data: null, message: '未安装' });
      }

      res.json({ success: true, data: installation });
    } catch (error) {
      console.error('Error fetching MicroBiz installation:', error);
      res.status(500).json({ success: false, error: '获取安装记录失败' });
    }
  }

  /**
   * 更新账号绑定信息
   * PUT /api/microbiz/installations/bindings
   */
  async updateBindings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: '未授权，请先登录' });
      }

      const { platform, bindingData } = req.body;
      if (!platform || !bindingData) {
        return res.status(400).json({ success: false, error: 'platform 和 bindingData 是必填字段' });
      }

      const installation = await microbizTeamService.updateAccountBinding(userId, platform, bindingData);

      if (!installation) {
        return res.status(400).json({ success: false, error: '请先安装 MicroBiz 套件' });
      }

      res.json({ success: true, data: installation, message: '账号绑定更新成功' });
    } catch (error: any) {
      console.error('Error updating bindings:', error);

      if (error.message?.includes('INSTALLATION_NOT_FOUND')) {
        return res.status(400).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: '更新账号绑定失败' });
    }
  }

  /**
   * 更新运营偏好
   * PUT /api/microbiz/installations/preferences
   */
  async updatePreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: '未授权，请先登录' });
      }

      const { preferences } = req.body;
      if (!preferences) {
        return res.status(400).json({ success: false, error: 'preferences 是必填字段' });
      }

      const installation = await microbizTeamService.updatePreferences(userId, preferences);

      if (!installation) {
        return res.status(400).json({ success: false, error: '请先安装 MicroBiz 套件' });
      }

      res.json({ success: true, data: installation, message: '运营偏好更新成功' });
    } catch (error: any) {
      console.error('Error updating preferences:', error);

      if (error.message?.includes('INSTALLATION_NOT_FOUND')) {
        return res.status(400).json({ success: false, error: error.message });
      }

      res.status(500).json({ success: false, error: '更新运营偏好失败' });
    }
  }

  /**
   * 暂停/恢复/卸载 MicroBiz 套件
   * PUT /api/microbiz/installations/status
   */
  async updateStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: '未授权，请先登录' });
      }

      const { status, agentStatus } = req.body;
      if (!['active', 'paused', 'uninstalled'].includes(status)) {
        return res.status(400).json({ success: false, error: '无效的状态值' });
      }

      if (status === 'uninstalled') {
        await microbizTeamService.uninstall(userId);
        return res.json({ success: true, message: '已卸载' });
      }

      const installation = await microbizTeamService.updateInstallationStatus(userId, status, agentStatus);

      if (!installation) {
        return res.status(400).json({ success: false, error: '请先安装 MicroBiz 套件' });
      }

      res.json({ success: true, data: installation, message: '状态更新成功' });
    } catch (error) {
      console.error('Error updating MicroBiz status:', error);
      res.status(500).json({ success: false, error: '状态更新失败' });
    }
  }

  /**
   * 接收外部平台 Webhook
   * POST /api/microbiz/webhooks/:platform
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const { platform } = req.params;
      const platformName = Array.isArray(platform) ? platform[0] : platform;
      const payload: WebhookPayload = req.body;

      // 验证平台支持
      const supportedPlatforms = ['douyin', 'xiaohongshu', 'meituan', 'weixin'];
      if (!supportedPlatforms.includes(platformName)) {
        return res.status(400).json({ success: false, error: `不支持的平台: ${platformName}` });
      }

      // 验证签名（如果提供）
      const signature = req.headers['x-webhook-signature'] as string;
      if (signature) {
        const rawBody = JSON.stringify(req.body);
        const isValid = microbizWebhookService.verifySignature(platformName, rawBody, signature);
        if (!isValid) {
          return res.status(401).json({ success: false, error: '签名验证失败' });
        }
      }

      const result = await microbizWebhookService.handleWebhook(platformName, payload);

      if (result.success) {
        res.json({ success: true, message: result.message, eventId: result.eventId });
      } else {
        res.status(500).json({ success: false, error: result.message });
      }
    } catch (error) {
      console.error('Error handling MicroBiz webhook:', error);
      res.status(500).json({ success: false, error: '处理 Webhook 失败' });
    }
  }

  /**
   * 获取 Webhook 事件历史
   * GET /api/microbiz/webhooks/events
   */
  async getWebhookEvents(req: Request, res: Response) {
    try {
      const { platform, limit = 50, offset = 0 } = req.query;

      let query = 'SELECT * FROM microbiz_webhook_events';
      const params: any[] = [];

      if (platform) {
        query += ' WHERE platform = $1';
        params.push(platform);
      }

      query += ' ORDER BY received_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      const result = await microbizTeamService['pool'].query(query, params);

      res.json({
        success: true,
        data: result.rows.map((row: any) => ({
          ...row,
          payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
        }))
      });
    } catch (error) {
      console.error('Error fetching webhook events:', error);
      res.status(500).json({ success: false, error: '获取 Webhook 事件失败' });
    }
  }
}

export const microbizController = new MicroBizController();
