import { Request, Response } from 'express';
import { aiteamCreationService } from '../services/aiteam-creation.service.js';
import { aiteamService } from '../services/aiteam.service.js';
import { ceoAgentService } from '../services/ceo-agent.service.js';
import { nvwaxAgentService } from '../services/nvwax-agent.service.js';
import { agentReuseService } from '../services/agent-reuse.service.js';
import { sseProgressService } from '../services/sse-progress.service.js';
import { databaseService } from '../services/database.service.js';
import { nvwaxMemoryService } from '../services/nvwax-memory.service.js';
import { existsSync } from 'fs';
import { ProClawBackendService } from '../services/proclaw.service.js';
import {
  normalizeTeamData,
  serializeTeamExport,
  suggestTeamFilename
} from '../services/team-export-formatters.js';

/**
 * AiTeam 创建控制器
 * 
 * 处理 AiTeam 创建会话相关的 HTTP 请求
 */
export class AiTeamCreationController {
  
  /**
   * 创建新的 AiTeam 创建会话
   * POST /api/aiteam-creation/sessions
   */
  async createSession(req: Request, res: Response) {
    try {
      // 从认证中间件获取用户 ID（支持普通用户和管理员）
      const userId = (req as any).user?.id || (req as any).admin?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required. Please login first.'
        });
      }
      
      const session = await aiteamCreationService.createSession(userId);
      
      res.status(201).json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error creating aiteam creation session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }
  }

  /**
   * 获取会话详情
   * GET /api/aiteam-creation/sessions/:id
   */
  async getSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      
      const session = await aiteamCreationService.getSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get session'
      });
    }
  }

  /**
   * 获取用户的所有会话
   * GET /api/aiteam-creation/sessions
   */
  async getUserSessions(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).admin?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const sessions = await aiteamCreationService.getUserSessions(userId, limit, offset);
      
      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      console.error('Error getting user sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions'
      });
    }
  }

  /**
   * 发送消息到会话（与 NvwaX Agent 对话）
   * POST /api/aiteam-creation/sessions/:id/message
   */
  async sendMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const { content } = req.body;
      const userId = (req as any).user?.id || (req as any).admin?.id;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required'
        });
      }
      
      // 验证会话存在
      const session = await aiteamCreationService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      // 使用 NvwaX Agent 处理消息（替代 CEO Agent）
      console.log(`🤖 NvwaX processing message for session ${sessionId}`);
      
      // 根据会话状态确定当前阶段
      let currentPhase: any = 'requirements_gathering';
      if (session.status === 'role_selection') {
        currentPhase = 'team_design';
      } else if (session.status === 'agent_searching') {
        currentPhase = 'agent_matching';
      } else if (session.status === 'skill_matching') {
        currentPhase = 'skill_matching';
      }
      
      const nvwaxResponse = await nvwaxAgentService.processMessage(
        content,
        currentPhase,
        {
          analysisResult: session.requirements
        },
        userId
      );
      
      // 保存 NvwaX 分析结果到会话
      if (nvwaxResponse.analysisResult) {
        await aiteamCreationService.updateRequirements(
          sessionId,
          nvwaxResponse.analysisResult as any
        );
      }
      
      // 保存团队设计
      if (nvwaxResponse.teamDesign) {
        // 保存团队设计到数据库
        await aiteamCreationService.updateTeamDesign(
          sessionId,
          nvwaxResponse.teamDesign
        );
        
        // 更新进度
        await aiteamCreationService.updateProgress(sessionId, {
          currentStep: 2,
          percentage: 28,
          steps: [
            { stepNumber: 1, name: '需求分析', status: 'completed', message: '已完成' },
            { stepNumber: 2, name: '团队设计', status: 'completed', message: '已完成' },
            { stepNumber: 3, name: 'Agent 搜索', status: 'pending', message: '等待开始' },
            { stepNumber: 4, name: 'Skill 匹配', status: 'pending', message: '等待开始' },
            { stepNumber: 5, name: '需求确认', status: 'pending', message: '等待开始' },
            { stepNumber: 6, name: '团队构建', status: 'pending', message: '等待开始' },
            { stepNumber: 7, name: '保存配置', status: 'pending', message: '等待开始' }
          ]
        });
      }
      
      // 关键修复：根据 NvwaX 响应的 phase 更新会话状态
      const phaseToStatusMap: Record<string, string> = {
        'requirements_gathering': 'requirements_gathering',
        'team_design': 'role_selection',
        'ceo_generation': 'role_selection',
        'agent_matching': 'agent_searching',
        'skill_matching': 'skill_matching',
        'document_generation': 'confirming',
        'confirming': 'confirming'
      };
      
      const newStatus = phaseToStatusMap[nvwaxResponse.phase];
      if (newStatus && newStatus !== session.status) {
        console.log(`🔄 Updating session ${sessionId} status from ${session.status} to ${newStatus}`);
        await aiteamCreationService.updateStatus(sessionId, newStatus as any);
      }

      // v1.4.0 / Sprint 2.17：广播 CEO Agent 自然语言回复到 SSE 流
      // 这是 ProClaw wizard "流式显示 AI 回复" 真正能用的关键
      sseProgressService.broadcastAgentMessage(
        sessionId,
        nvwaxResponse.message,
        newStatus ?? nvwaxResponse.phase,
        (session.progress?.percentage ?? 0) as number,
        nvwaxResponse.confidence,
        nvwaxResponse.nextStep
      );

      // 广播进度更新（SSE 服务会自动从数据库读取最新状态）
      sseProgressService.broadcastProgress(sessionId).catch(err => {
        console.error('Failed to broadcast progress:', err);
      });

      // 如果 status 进入终态（completed / failed / cancelled），广播 complete 事件让客户端断开
      const terminalStates = new Set(['completed', 'failed', 'cancelled']);
      if (newStatus && terminalStates.has(newStatus)) {
        sseProgressService.broadcastComplete(
          sessionId,
          newStatus as 'completed' | 'failed' | 'cancelled'
          // finalTeamSkillId 由后续 confirmAndSaveTeam 端点产生；这里不传
        );
      }

      res.json({
        success: true,
        data: {
          message: nvwaxResponse.message,
          phase: nvwaxResponse.phase,
          extractedRequirements: nvwaxResponse.analysisResult,
          recommendedRoles: nvwaxResponse.teamDesign?.roles,
          needsClarification: nvwaxResponse.needsClarification,
          clarificationQuestions: nvwaxResponse.clarificationQuestions,
          nextStep: nvwaxResponse.nextStep
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
    }
  }

  /**
   * 更新需求信息
   * PUT /api/aiteam-creation/sessions/:id/requirements
   */
  async updateRequirements(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const requirements = req.body;
      
      await aiteamCreationService.updateRequirements(sessionId, requirements);
      
      res.json({
        success: true,
        message: 'Requirements updated'
      });
    } catch (error) {
      console.error('Error updating requirements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update requirements'
      });
    }
  }

  /**
   * 更新选定的角色
   * PUT /api/aiteam-creation/sessions/:id/roles
   */
  async updateRoles(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const { roles } = req.body;
      
      if (!roles || !Array.isArray(roles)) {
        return res.status(400).json({
          success: false,
          error: 'Roles array is required'
        });
      }
      
      await aiteamCreationService.updateSelectedRoles(sessionId, roles);
      
      res.json({
        success: true,
        message: 'Roles updated'
      });
    } catch (error) {
      console.error('Error updating roles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update roles'
      });
    }
  }

  /**
   * 获取会话进度（用于 SSE）
   * GET /api/aiteam-creation/sessions/:id/progress
   */
  async getProgress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      
      const session = await aiteamCreationService.getSessionById(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      // 设置 SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      
      // 发送当前进度
      res.write(`data: ${JSON.stringify({ progress: session.progress })}\n\n`);
      
      // TODO: 实现实时进度订阅
      // 目前先直接结束连接，后续需要实现 WebSocket 或 EventSource
      
      res.end();
    } catch (error) {
      console.error('Error getting progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get progress'
      });
    }
  }

  /**
   * 删除会话
   * DELETE /api/aiteam-creation/sessions/:id
   */
  async deleteSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const userId = (req as any).user?.id || (req as any).admin?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const deleted = await aiteamCreationService.deleteSession(sessionId, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or unauthorized'
        });
      }

      res.json({
        success: true,
        message: 'Session deleted'
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete session'
      });
    }
  }

  /**
   * P1: 从事件流重放会话
   * GET /api/aiteam-creation/sessions/:id/replay
   *
   * 应用：服务崩溃恢复 / 调试审计
   */
  async replaySession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;

      const session = await aiteamCreationService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      const result = await aiteamCreationService.replayFromEvents(sessionId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error replaying session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to replay session'
      });
    }
  }

  /**
   * 生成 CEO Agent 回复（简化版 MVP）
   * TODO: 后续替换为真实的 LLM 调用
   */
  private async generateCEOResponse(session: any, userMessage: string): Promise<string> {
    // MVP 版本：基于会话状态返回预设回复
    
    switch (session.status) {
      case 'initiated':
        return '您好！我是您的 AiTeam 创建助手。请问您需要创建什么类型的团队？例如：营销团队、开发团队、设计团队等。';
      
      case 'requirements_gathering':
        return '明白了！接下来我需要了解一些细节。您希望这个团队主要负责什么工作？有哪些具体的目标或产出？';
      
      case 'role_selection':
        return '根据您的需求，我推荐以下团队角色：\n\n' +
               '1. 产品经理 - 负责需求分析和产品设计\n' +
               '2. 前端开发 - 负责界面开发和用户体验\n' +
               '3. 后端开发 - 负责 API 开发和业务逻辑\n\n' +
               '您觉得这些角色合适吗？可以增减或修改。';
      
      default:
        return '收到！我正在分析您的需求，请稍候...';
    }
  }

  /**
   * 触发 Agent 复用决策
   * POST /api/aiteam-creation/sessions/:id/decide-agents
   */
  async decideAgents(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const userId = (req as any).user?.id || (req as any).admin?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      // 获取会话中的角色配置
      const session = await aiteamCreationService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      const roleConfigs = (session.requirements as any).selectedRoles || [];
      
      if (!roleConfigs || roleConfigs.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No roles configured yet'
        });
      }
      
      // 执行 Agent 复用决策
      const decisions = await agentReuseService.makeReuseDecisions(
        sessionId,
        roleConfigs,
        userId
      );
      
      res.json({
        success: true,
        data: {
          decisions,
          summary: {
            total: decisions.length,
            reuseCount: decisions.filter(d => d.decision === 'reuse').length,
            createNewCount: decisions.filter(d => d.decision === 'create_new').length
          }
        }
      });
    } catch (error) {
      console.error('Error deciding agents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to make agent reuse decisions'
      });
    }
  }

  /**
   * 用户手动确认 Agent 决策
   * POST /api/aiteam-creation/sessions/:id/confirm-agent
   */
  async confirmAgentDecision(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const { roleName, decision } = req.body;
      const userId = (req as any).user?.id || (req as any).admin?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      if (!roleName || !decision) {
        return res.status(400).json({
          success: false,
          error: 'roleName and decision are required'
        });
      }
      
      const result = await agentReuseService.confirmDecision(
        sessionId,
        roleName,
        decision,
        userId
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error confirming agent decision:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm agent decision'
      });
    }
  }

  /**
   * 获取 Agent 决策摘要
   * GET /api/aiteam-creation/sessions/:id/agent-decisions
   */
  async getAgentDecisions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      
      const summary = await agentReuseService.getDecisionSummary(sessionId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting agent decisions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get agent decisions'
      });
    }
  }

  /**
   * SSE 进度追踪
   * GET /api/aiteam-creation/sessions/:id/stream
   */
  async streamProgress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      
      // 验证会话存在
      const session = await aiteamCreationService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      // 建立 SSE 连接
      sseProgressService.connect(sessionId, res);
      
      // 注意：SSE 连接不会立即返回，而是保持打开状态
      // 响应会在客户端断开或服务器关闭时结束
    } catch (error) {
      console.error('Error establishing SSE connection:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to establish SSE connection'
        });
      }
    }
  }

  /**
   * 手动触发进度广播（用于测试）
   * POST /api/aiteam-creation/sessions/:id/broadcast
   */
  async broadcastProgress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      
      await sseProgressService.broadcastProgress(sessionId);
      
      const clientCount = sseProgressService.getActiveClientCount(sessionId);
      
      res.json({
        success: true,
        data: {
          message: `Broadcasted to ${clientCount} clients`,
          clientCount
        }
      });
    } catch (error) {
      console.error('Error broadcasting progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to broadcast progress'
      });
    }
  }

  /**
   * 确认并保存团队到用户中心
   * POST /api/aiteam-creation/sessions/:id/confirm
   */
  async confirmAndSaveTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      // 支持普通用户和管理员
      const userId = (req as any).user?.id || (req as any).admin?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      console.log(`✅ Confirming and saving team for session ${sessionId}...`);

      // 获取会话
      const session = await aiteamCreationService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // 获取完整的团队配置
      const pool = databaseService.getPool();
      const result = await pool.query(
        'SELECT team_design, ceo_config, agent_matches, skill_matches FROM aiteam_creation_sessions WHERE id = $1',
        [sessionId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session data not found'
        });
      }

      const rowData = result.rows[0];
      const teamDesign = rowData.team_design;
      const ceoConfig = rowData.ceo_config;
      const agentMatches = rowData.agent_matches || {};
      const skillMatches = rowData.skill_matches || {};

      if (!teamDesign || !ceoConfig) {
        return res.status(400).json({
          success: false,
          error: 'Team configuration not complete'
        });
      }

      // 更新会话状态为 completed
      await aiteamCreationService.updateStatus(sessionId, 'completed');
      await aiteamCreationService.updateProgress(sessionId, {
        currentStep: 7,
        percentage: 100,
        steps: [
          { stepNumber: 1, name: '需求分析', status: 'completed', message: '已完成' },
          { stepNumber: 2, name: '团队设计', status: 'completed', message: '已完成' },
          { stepNumber: 3, name: 'Agent 搜索', status: 'completed', message: '已完成' },
          { stepNumber: 4, name: 'Skill 匹配', status: 'completed', message: '已完成' },
          { stepNumber: 5, name: '需求确认', status: 'completed', message: '已确认' },
          { stepNumber: 6, name: '团队构建', status: 'completed', message: '已完成' },
          { stepNumber: 7, name: '保存配置', status: 'completed', message: '已保存到用户中心' }
        ]
      });

      // 广播进度更新
      sseProgressService.broadcastProgress(sessionId).catch(err => {
        console.error('Failed to broadcast progress:', err);
      });

      // 生成文档包
      console.log(' Generating document package for download...');
      const nvwaxResponse = await nvwaxAgentService.processMessage(
        '生成文档包',
        'document_generation',
        { 
          teamDesign,
          ceoConfig,
          teamName: ceoConfig.teamType + '团队'
        },
        userId
      );

      const documentPackage = nvwaxResponse.documentPackage;

      if (documentPackage) {
        // 保存文档包 URL
        await pool.query(
          'UPDATE aiteam_creation_sessions SET document_package_url = $1 WHERE id = $2',
          [`/api/aiteam-creation/sessions/${sessionId}/download`, sessionId]
        );
      }

      // ── "创建即入仓库"：把 session 团队落库到 aiteams 表 ──
      // 用户确认保存后，团队立即出现在「我的 Agent 仓库」的 AiTeam tab 中
      let aiteamId: string | null = null;
      try {
        const teamMembers = Array.isArray(teamDesign?.roles)
          ? teamDesign.roles.map((r: any) => ({
              role: r.roleName || r.role || 'Agent',
              responsibilities: r.responsibilities || [],
              config: { systemPrompt: r.description || '' },
              agentName: null // 由 aiteamService 按名称匹配 agents 表
            }))
          : [];
        const teamName = ceoConfig.teamType ? `${ceoConfig.teamType}团队` : 'AI团队';
        const savedTeam = await aiteamService.createAiTeamFromSession({
          userId,
          sessionId,
          name: teamName,
          description: ceoConfig.description || `由 NvwaX 创建的${teamName}`,
          members: teamMembers,
          workflow: { steps: [] },
          triggers: {},
          category: ceoConfig.industry || ceoConfig.teamType || null,
          tags: []
        });
        aiteamId = savedTeam.id;
        console.log(`✅ AiTeam saved to repository: ${aiteamId} (session ${sessionId})`);

        // v1.4.0 / Sprint 2.17：广播 complete 事件携带 finalTeamSkillId
        sseProgressService.broadcastComplete(
          sessionId,
          'completed',
          aiteamId
        );
      } catch (saveErr) {
        // 落库失败不阻断主流程（文档包已生成），记录日志即可
        console.error('⚠️ Failed to save AiTeam to repository:', saveErr);
      }

      console.log('✅ Team confirmed and saved successfully');

      res.json({
        success: true,
        data: {
          sessionId,
          aiteamId,
          documentPackage,
          downloadUrl: `/api/aiteam-creation/sessions/${sessionId}/download`,
          message: '团队已保存到用户中心，文档包已生成'
        }
      });
    } catch (error) {
      console.error('Error in confirmAndSaveTeam:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm and save team'
      });
    }
  }

  /**
   * 下载文档包
   * GET /api/aiteam-creation/sessions/:id/download
   */
  async downloadDocumentPackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      // 支持普通用户和管理员
      const userId = (req as any).user?.id || (req as any).admin?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      console.log(` Downloading document package for session ${sessionId}...`);

      // 获取会话
      const session = await aiteamCreationService.getSessionById(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or access denied'
        });
      }

      // 获取完整的团队配置
      const pool = databaseService.getPool();
      const result = await pool.query(
        'SELECT team_design, ceo_config, agent_matches, skill_matches FROM aiteam_creation_sessions WHERE id = $1',
        [sessionId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session data not found'
        });
      }

      const rowData = result.rows[0];
      const teamDesign = rowData.team_design;
      const ceoConfig = rowData.ceo_config;

      if (!teamDesign || !ceoConfig) {
        return res.status(400).json({
          success: false,
          error: 'Team configuration not complete'
        });
      }

      // 生成文档包
      const nvwaxResponse = await nvwaxAgentService.processMessage(
        '生成文档包',
        'document_generation',
        { 
          teamDesign,
          ceoConfig,
          teamName: ceoConfig.teamType + '团队'
        },
        userId
      );

      const documentPackage = nvwaxResponse.documentPackage;

      if (!documentPackage) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate document package'
        });
      }

      // 生成 ZIP 文件
      const JSzip = (await import('jszip')).default;
      const zip = new JSzip();

      // 添加所有文档到 ZIP
      for (const doc of documentPackage.documents) {
        zip.file(`${doc.title}.md`, doc.content);
      }

      // 生成 ZIP 文件
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      // 设置响应头
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${ceoConfig.teamType}_team_config.zip"`);
      res.setHeader('Content-Length', zipBuffer.length.toString());

      // 发送文件
      res.send(zipBuffer);

      console.log('✅ Document package downloaded successfully');
    } catch (error) {
      console.error('Error in downloadDocumentPackage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download document package'
      });
    }
  }

  /**
   * 集成到ProClaw
   * POST /api/aiteam-creation/sessions/:id/integrate-proclaw
   *
   * 实现流程：
   * 1. 读取 aiteam_creation_sessions 的完整配置
   * 2. 通过 ProClawBackendService 组装 VirtualCompanyPackage
   * 3. 写入临时目录，返回下载 URL
   * 4. 前端可立即用 URL 下载 .nvwax-vc.json 文件，导入到 ProClaw 桌面端
   */
  async integrateToProClaw(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      // 支持普通用户和管理员
      const userId = (req as any).user?.id || (req as any).admin?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      console.log(`[integrateToProClaw] Integrating session ${sessionId} to ProClaw for user ${userId}...`);

      // 获取会话
      const session = await aiteamCreationService.getSessionById(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or access denied'
        });
      }

      // 通过 ProClawBackendService 组装导出包
      const pool = databaseService.getPool();
      const proClawService = new ProClawBackendService(pool);
      const pkg = await proClawService.buildVirtualCompanyPackageFromSession(sessionId, userId);

      if (!pkg) {
        return res.status(500).json({
          success: false,
          error: 'Failed to build virtual company package'
        });
      }

      // 写入临时文件并获取下载 URL
      const { downloadUrl } = await proClawService.writePackageToTempFile(pkg);

      console.log(`[integrateToProClaw] ✅ Package ready: ${pkg.packageId} (${pkg.agents.length} agents, ${pkg.skills?.length ?? 0} skills)`);

      res.json({
        success: true,
        data: {
          packageId: pkg.packageId,
          checksum: pkg.checksum,
          downloadUrl,
          // 向后兼容旧字段
          proclawTeamId: pkg.team.id,
          sessionId,
          teamName: pkg.team.name,
          agentsCount: pkg.agents.length,
          skillsCount: pkg.skills?.length ?? 0,
          schemaVersion: pkg.schemaVersion,
          exportedAt: pkg.exportedAt,
          message: `团队「${pkg.team.name}」已导出（${pkg.agents.length} 个 Agent）。请在 ProClaw 桌面端打开「导入团队」页面，粘贴下载链接完成导入。`,
        }
      });
    } catch (error) {
      console.error('Error in integrateToProClaw:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to integrate to ProClaw'
      });
    }
  }

  /**
   * ProClaw 桌面端回写虚拟公司本地状态
   * PUT /api/aiteam-creation/sessions/:id/local-state
   *
   * ProClaw 用户在本地对虚拟公司做了状态变更（启用/停用某个 Agent、
   * 修改负责人角色、暂停/恢复团队），通过该 endpoint 把变更推送到 NvWaX。
   * NvWaX 只做"接收 + 记录"，不参与决策（避免破坏"本地优先"原则）。
   *
   * 请求体：
   * {
   *   "importedPackageId": "uuid-here",       // ProClaw 端的 package_id
   *   "schemaVersion": "1.0.0",
   *   "proclawVersion": "1.3.1",
   *   "teamStatus": "active" | "paused" | "archived",
   *   "agents": [
   *     {
   *       "agentId": "agent-barista-1",
   *       "enabled": true,
   *       "alias": "咖啡师小绿",
   *       "ownerRole": "owner" | "shared" | "reviewer",
   *       "lastRunAt": "2026-01-01T00:00:00Z"
   *     }
   *   ]
   * }
   */
  async pushLocalState(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const userId = (req as any).user?.id || (req as any).admin?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const body = req.body || {};
      const importedPackageId = typeof body.importedPackageId === 'string' ? body.importedPackageId : null;
      if (!importedPackageId) {
        return res.status(400).json({ success: false, error: 'importedPackageId is required' });
      }

      // 校验 session 归属
      const pool = databaseService.getPool();
      const ownerCheck = await pool.query(
        'SELECT user_id FROM aiteam_creation_sessions WHERE id = $1',
        [sessionId]
      );
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== userId) {
        return res.status(404).json({ success: false, error: 'Session not found or access denied' });
      }

      // 构造完整 local_state 对象（含时间戳）
      const localState = {
        schemaVersion: body.schemaVersion || '1.0.0',
        lastSyncedAt: new Date().toISOString(),
        proclawVersion: body.proclawVersion || null,
        importedPackageId,
        teamStatus: body.teamStatus || 'active',
        agents: Array.isArray(body.agents) ? body.agents : [],
      };

      // upsert：用 PostgreSQL jsonb_concat 合并旧 local_state（保留非 agents 字段）
      await pool.query(
        `UPDATE aiteam_creation_sessions
            SET local_state = local_state || $1::jsonb,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND user_id = $3`,
        [JSON.stringify(localState), sessionId, userId]
      );

      return res.json({
        success: true,
        data: {
          sessionId,
          lastSyncedAt: localState.lastSyncedAt,
          agentsCount: localState.agents.length,
          teamStatus: localState.teamStatus,
        },
      });
    } catch (error) {
      console.error('Error in pushLocalState:', error);
      return res.status(500).json({ success: false, error: 'Failed to push local state' });
    }
  }

  /**
   * 拉取单个会话的本地状态（Sprint 2.15 多设备同步）
   * GET /api/aiteam-creation/sessions/:id/local-state
   *
   * ProClaw 桌面端「立即同步」按钮会调此接口获取 NvWaX 上最新的状态，
   * 然后与本地 SQLite 进行 last-write-wins 合并。
   */
  async getLocalState(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const userId = (req as any).user?.id || (req as any).admin?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const localState = await aiteamCreationService.getLocalState(sessionId, userId);
      if (localState === null) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or access denied',
        });
      }

      return res.json({
        success: true,
        data: {
          sessionId,
          localState,
          fetchedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error in getLocalState:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch local state' });
    }
  }

  /**
   * 触发 NvwaX 完整匹配流程（Agent + Skill）
   * POST /api/aiteam-creation/sessions/:id/nvwax-match
   */
  async triggerNvwaXMatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      
      // 验证会话存在
      const session = await aiteamCreationService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      console.log(`🚀 Triggering NvwaX match for session ${sessionId}`);
      
      // 更新状态为 agent_searching
      await aiteamCreationService.updateStatus(sessionId, 'agent_searching');
      await aiteamCreationService.updateStepStatus(
        sessionId,
        3,
        'in_progress',
        '正在搜索匹配的 Agent...'
      );
      
      // 广播进度更新
      sseProgressService.broadcastProgress(sessionId).catch(err => {
        console.error('Failed to broadcast progress:', err);
      });
      
      // 从会话中获取团队设计
      const teamDesign = session.teamDesign || (session as any).team_design || session.requirements;
      
      if (!teamDesign || !teamDesign.roles) {
        console.error('Team design not found. Session data:', {
          hasTeamDesign: !!session.teamDesign,
          hasTeamDesignRaw: !!(session as any).team_design,
          hasRequirements: !!session.requirements,
          requirementsKeys: Object.keys(session.requirements || {})
        });
        return res.status(400).json({
          success: false,
          error: 'Team design not found. Please complete requirements gathering first.'
        });
      }
      
      // 生成 NvwaX Aiteam架构师 配置（如果尚未生成）
      let ceoConfig = (session as any).ceo_config;
      const triggerUserId = (req as any).user?.id || (req as any).admin?.id || (session as any).user_id;
      if (!ceoConfig) {
        console.log('🎯 Generating CEO config...');
        try {
          const nvwaxResponse = await nvwaxAgentService.processMessage(
            '生成CEO配置',
            'ceo_generation',
            { teamDesign },
            triggerUserId
          );
          
          if (nvwaxResponse.ceoConfig) {
            ceoConfig = nvwaxResponse.ceoConfig;
            
            // 保存 CEO 配置到数据库
            const pool = databaseService.getPool();
            await pool.query(
              'UPDATE aiteam_creation_sessions SET ceo_config = $1 WHERE id = $2',
              [JSON.stringify(ceoConfig), sessionId]
            );
            
            console.log(`✅ CEO config saved: ${ceoConfig.templateName}`);
          }
        } catch (error) {
          console.error('Failed to generate CEO config:', error);
          // 继续执行，不阻断流程
        }
      } else {
        console.log('✅ CEO config already exists');
      }
      
      // 执行 Agent 匹配
      console.log('🔍 Starting agent matching...');
      const agentMatches = await nvwaxAgentService.matchAgentsForTeam(teamDesign, triggerUserId);
      
      // 保存 Agent 匹配结果
      await aiteamCreationService.updateProgress(sessionId, {
        currentStep: 3,
        percentage: 42,
        steps: [
          { stepNumber: 1, name: '需求分析', status: 'completed', message: '已完成' },
          { stepNumber: 2, name: '团队设计', status: 'completed', message: '已完成' },
          { stepNumber: 3, name: 'Agent 搜索', status: 'completed', message: `找到 ${Object.values(agentMatches).flat().length} 个匹配 Agent` },
          { stepNumber: 4, name: 'Skill 匹配', status: 'in_progress', message: '正在匹配 Skills...' },
          { stepNumber: 5, name: '需求确认', status: 'pending', message: '等待开始' },
          { stepNumber: 6, name: '团队构建', status: 'pending', message: '等待开始' },
          { stepNumber: 7, name: '保存配置', status: 'pending', message: '等待开始' }
        ]
      });
      
      // 更新状态为 skill_matching
      await aiteamCreationService.updateStatus(sessionId, 'skill_matching');
      
      // 广播进度更新
      sseProgressService.broadcastProgress(sessionId).catch(err => {
        console.error('Failed to broadcast progress:', err);
      });
      
      // 执行 Skill 匹配
      console.log('🎯 Starting skill matching...');
      const skillMatches = await nvwaxAgentService.matchSkillsForTeam(teamDesign);
      
      // 保存 Skill 匹配结果
      await aiteamCreationService.updateProgress(sessionId, {
        currentStep: 4,
        percentage: 57,
        steps: [
          { stepNumber: 1, name: '需求分析', status: 'completed', message: '已完成' },
          { stepNumber: 2, name: '团队设计', status: 'completed', message: '已完成' },
          { stepNumber: 3, name: 'Agent 搜索', status: 'completed', message: '已完成' },
          { stepNumber: 4, name: 'Skill 匹配', status: 'completed', message: `找到 ${Object.values(skillMatches).filter(s => s.status === 'found').length} 个 Skills` },
          { stepNumber: 5, name: '需求确认', status: 'in_progress', message: '等待确认' },
          { stepNumber: 6, name: '团队构建', status: 'pending', message: '等待开始' },
          { stepNumber: 7, name: '保存配置', status: 'pending', message: '等待开始' }
        ]
      });
      
      // 更新状态为 confirming
      await aiteamCreationService.updateStatus(sessionId, 'confirming');
      
      // 保存完整的团队配置到数据库
      console.log('💾 Saving complete team configuration...');
      const pool = databaseService.getPool();
      await pool.query(
        `UPDATE aiteam_creation_sessions 
         SET team_design = $1, 
             ceo_config = $2, 
             agent_matches = $3, 
             skill_matches = $4,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $5`,
        [
          JSON.stringify(teamDesign),
          JSON.stringify(ceoConfig || {}),
          JSON.stringify(agentMatches || {}),
          JSON.stringify(skillMatches || {}),
          sessionId
        ]
      );
      console.log('✅ Complete team configuration saved');
      
      // 生成文档包
      let documentPackage = null;
      if (ceoConfig && teamDesign) {
        console.log('📄 Generating document package...');
        try {
          const nvwaxResponse = await nvwaxAgentService.processMessage(
            '生成文档包',
            'document_generation',
            { 
              teamDesign,
              ceoConfig,
              teamName: (session as any).company_name || `${ceoConfig.teamType}团队`
            },
            triggerUserId
          );
          
          if (nvwaxResponse.documentPackage) {
            documentPackage = nvwaxResponse.documentPackage;
            
            // 保存文档包到数据库
            const pool = databaseService.getPool();
            await pool.query(
              'UPDATE aiteam_creation_sessions SET document_package_url = $1 WHERE id = $2',
              ['/api/documents/download/' + sessionId, sessionId]
            );
            
            console.log(`✅ Document package generated: ${documentPackage.packageInfo.totalDocuments} documents`);
          }
        } catch (error) {
          console.error('Failed to generate document package:', error);
          // 继续执行，不阻断流程
        }
      }
      
      // 广播最终进度
      sseProgressService.broadcastProgress(sessionId).catch(err => {
        console.error('Failed to broadcast progress:', err);
      });
      
      console.log('✅ NvwaX match completed');
      
      // 保存记忆（异步，不阻塞响应）
      const userId = triggerUserId;
      if (ceoConfig && teamDesign && userId) {
        console.log('💾 Saving NvwaX memory...');
        nvwaxMemoryService.saveMemory(
          userId,
          ceoConfig.teamType,
          {
            requirements: (session as any).nvwax_analysis_result || {},
            teamConfig: {
              roles: teamDesign.roles,
              estimatedSize: teamDesign.estimatedSize
            },
            agentMatches: agentMatches || {},
            skillMatches: skillMatches || {},
            successScore: 0.8, // 默认评分，后续可根据用户反馈更新
            userFeedback: undefined
          }
        ).then(memoryId => {
          console.log(`✅ Memory saved: ${memoryId}`);
        }).catch(error => {
          console.error('Failed to save memory:', error);
        });
      }
      
      res.json({
        success: true,
        data: {
          agentMatches,
          skillMatches,
          ceoConfig,
          documentPackage,
          status: 'confirming'
        }
      });
    } catch (error) {
      console.error('Error in triggerNvwaXMatch:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger NvwaX match'
      });
    }
  }

  /**
   * 发布 AiTeam 到 Agent 广场
   * POST /api/aiteam-creation/sessions/:id/publish-to-marketplace
   */
  async publishToMarketplace(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      // 支持普通用户和管理员
      const userId = (req as any).user?.id || (req as any).admin?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      console.log(`🚀 Publishing AiTeam to marketplace for session ${sessionId}...`);

      // 获取会话
      const session = await aiteamCreationService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // 获取完整的团队配置
      const pool = databaseService.getPool();
      const result = await pool.query(
        'SELECT team_design, ceo_config, agent_matches, skill_matches FROM aiteam_creation_sessions WHERE id = $1',
        [sessionId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session data not found'
        });
      }

      const rowData = result.rows[0];
      const teamDesign = rowData.team_design;
      const ceoConfig = rowData.ceo_config;

      if (!teamDesign || !ceoConfig) {
        return res.status(400).json({
          success: false,
          error: 'Team configuration not complete'
        });
      }

      // 将团队配置转换为 Team Skill 并发布到市场
      // 这里需要调用 team_skills 表的插入逻辑
      const { v4: uuidv4 } = await import('uuid');
      const teamSkillId = uuidv4();
      
      // 从 CEO 配置中提取团队信息
      const teamName = ceoConfig.teamType ? `${ceoConfig.teamType}团队` : 'AI团队';
      const teamDescription = `由 NvwaX 创建的${teamName}，包含 ${teamDesign.roles?.length || 0} 个专业角色。`;
      
      // 插入到 team_skills 表，设置为公开
      await pool.query(
        `INSERT INTO team_skills 
          (id, name, description, category, leader_config, roles, workflow, binding_rules, author_id, is_public, version, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          teamSkillId,
          teamName,
          teamDescription,
          'virtual-company',
          JSON.stringify(ceoConfig),
          JSON.stringify(teamDesign.roles || []),
          JSON.stringify({}), // workflow
          JSON.stringify({}), // binding_rules
          userId,
          true, // is_public - 发布到市场
          '1.0.0'
        ]
      );

      console.log(`✅ AiTeam published to marketplace: ${teamSkillId}`);

      res.json({
        success: true,
        data: {
          teamSkillId,
          teamName,
          message: 'AiTeam 已成功发布到 Agent 广场'
        }
      });
    } catch (error) {
      console.error('Error in publishToMarketplace:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to publish to marketplace'
      });
    }
  }

  /**
   * 导出创建会话中的团队配置（多壳落地）
   *
   * POST /api/aiteam-creation/sessions/:id/export
   * body: { format?: 'json' | 'yaml' | 'proclaw' | 'crewai' | 'langgraph' }
   *
   * 从 aiteam_creation_sessions 的 team_design + ceo_config 组装团队数据，
   * 通过 team-export-formatters 生成对应格式文件，返回 downloadUrl。
   *
   * 注意：创建流程本身不写 aiteams 表（团队保存在 session 里），
   * 因此这是"创建成功弹窗 → 选择落地方式"的唯一可用导出路径。
   */
  async exportTeamFromSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const userId = (req as any).user?.id || (req as any).admin?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const { format = 'crewai' } = req.body || {};
      const allowed = ['json', 'yaml', 'proclaw', 'crewai', 'langgraph'];
      if (!allowed.includes(format)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported export format: ${format}. Use ${allowed.join(' / ')}`
        });
      }

      // 获取会话
      const session = await aiteamCreationService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // 校验归属
      if (session.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: not your session'
        });
      }

      // 获取原始配置
      const pool = databaseService.getPool();
      const result = await pool.query(
        'SELECT team_design, ceo_config, agent_matches, skill_matches FROM aiteam_creation_sessions WHERE id = $1',
        [sessionId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session data not found'
        });
      }

      const rowData = result.rows[0];
      const teamDesign = rowData.team_design || {};
      const ceoConfig = rowData.ceo_config || {};

      // 组装归一化团队数据
      const teamName = ceoConfig.teamType ? `${ceoConfig.teamType}团队` : 'NvwaX AI Team';
      const raw = {
        name: teamName,
        description: ceoConfig.description || `由 NvwaX 创建的${teamName}`,
        version: '1.0.0',
        tags: [],
        category: ceoConfig.industry || ceoConfig.teamType || null,
        teamDesign, // roles 数组由 normalizeTeamData 消费
        workflow: {
          steps: Array.isArray(teamDesign.roles)
            ? teamDesign.roles.map((r: any, idx: number) => ({
                name: `step-${idx + 1}`,
                description: `${r.roleName || r.role} 执行：${r.responsibilities?.join('、') || '任务'}`,
                agent: r.roleName || r.role || 'Agent'
              }))
            : []
        },
        metadata: {
          source: 'nvwax-creation-session',
          sessionId,
          createdAt: session.createdAt
        }
      };

      const normalized = normalizeTeamData(raw);
      const { content, extension } = serializeTeamExport(normalized, format);

      // 写文件到 exports 目录
      const { mkdirSync, writeFileSync } = await import('fs');
      const { join } = await import('path');
      const exportDir = join(process.cwd(), 'exports');
      if (!existsSync(exportDir)) {
        mkdirSync(exportDir, { recursive: true });
      }
      const { v4: uuidv4 } = await import('uuid');
      const fileName = `${uuidv4()}_${Date.now()}.${extension}`;
      const filePath = join(exportDir, fileName);
      writeFileSync(filePath, content, 'utf-8');

      // 生成下载 URL（走静态导出文件服务；若不存在则给相对路径）
      res.json({
        success: true,
        data: {
          format,
          fileName: suggestTeamFilename(teamName, format),
          downloadUrl: `/api/exports/file/${fileName}`,
          downloadPath: filePath,
          extension
        },
        message: '导出成功，可在支持的运行时中导入'
      });
    } catch (error) {
      console.error('Error exporting team from session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export team'
      });
    }
  }

  /**
   * 列出用户的创建会话（供"从创建会话导入"入口使用）
   *
   * GET /api/aiteam-creation/sessions?importable=1
   * 只返回 completed 状态的会话，标注是否已导入仓库（finalAiteamId）
   */
  async listImportableSessions(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).admin?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const { importable = '1' } = req.query;
      const sessions = await aiteamCreationService.getUserSessions(userId, 50, 0);

      // 只返回 completed 且未导入（或全部，由 importable 控制）
      const filtered = sessions.filter((s) => {
        const isCompleted = s.status === 'completed';
        if (importable === '1') {
          return isCompleted && !s.finalAiteamId;
        }
        return isCompleted;
      });

      res.json({
        success: true,
        data: filtered.map((s) => ({
          sessionId: s.id,
          status: s.status,
          finalAiteamId: s.finalAiteamId || null,
          imported: !!s.finalAiteamId,
          teamName: s.teamDesign?.teamName
            || s.teamDesign?.roles?.[0]?.teamName
            || null,
          roleCount: s.teamDesign?.roles?.length || 0,
          createdAt: s.createdAt
        }))
      });
    } catch (error) {
      console.error('Error listing importable sessions:', error);
      res.status(500).json({ success: false, error: 'Failed to list sessions' });
    }
  }

  /**
   * 将创建会话导入到 Agent 仓库（"创建即入仓库"的补录入口）
   *
   * POST /api/aiteam-creation/sessions/:id/import-to-repository
   *
   * 对早期已 completed 但尚未落库 aiteams 表的 session 做补录。
   * 幂等：若已导入（finalAiteamId 存在）直接返回既有 aiteam。
   */
  async importSessionToRepository(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const userId = (req as any).user?.id || (req as any).admin?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const session = await aiteamCreationService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      if (session.userId !== userId) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      if (session.status !== 'completed') {
        return res.status(400).json({ success: false, error: 'Session not completed yet' });
      }

      const pool = databaseService.getPool();
      const result = await pool.query(
        'SELECT team_design, ceo_config FROM aiteam_creation_sessions WHERE id = $1',
        [sessionId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Session data not found' });
      }

      const teamDesign = result.rows[0].team_design || {};
      const ceoConfig = result.rows[0].ceo_config || {};
      const teamName = ceoConfig.teamType ? `${ceoConfig.teamType}团队` : 'AI团队';

      const teamMembers = Array.isArray(teamDesign?.roles)
        ? teamDesign.roles.map((r: any) => ({
            role: r.roleName || r.role || 'Agent',
            responsibilities: r.responsibilities || [],
            config: { systemPrompt: r.description || '' },
            agentName: null
          }))
        : [];

      const savedTeam = await aiteamService.createAiTeamFromSession({
        userId,
        sessionId,
        name: teamName,
        description: ceoConfig.description || `由 NvwaX 创建的${teamName}`,
        members: teamMembers,
        workflow: { steps: [] },
        triggers: {},
        category: ceoConfig.industry || ceoConfig.teamType || null,
        tags: []
      });

      res.json({
        success: true,
        data: { aiteamId: savedTeam.id, teamName: savedTeam.name },
        message: '已导入到 Agent 仓库'
      });
    } catch (error) {
      console.error('Error importing session to repository:', error);
      res.status(500).json({ success: false, error: 'Failed to import session' });
    }
  }
}

// 导出单例实例
export const aiteamCreationController = new AiTeamCreationController();
