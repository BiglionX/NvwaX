import { Request, Response } from 'express';
import { virtualCompanyCreationService } from '../services/virtual-company-creation.service.js';
import { ceoAgentService } from '../services/ceo-agent.service.js';
import { nvwaxAgentService } from '../services/nvwax-agent.service.js';
import { agentReuseService } from '../services/agent-reuse.service.js';
import { sseProgressService } from '../services/sse-progress.service.js';
import { databaseService } from '../services/database.service.js';
import { nvwaxMemoryService } from '../services/nvwax-memory.service.js';

/**
 * 虚拟公司创建控制器
 * 
 * 处理虚拟公司创建会话相关的 HTTP 请求
 */
export class VirtualCompanyCreationController {
  
  /**
   * 创建新的虚拟公司创建会话
   * POST /api/virtual-company/sessions
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
      
      const session = await virtualCompanyCreationService.createSession(userId);
      
      res.status(201).json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error creating virtual company session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }
  }

  /**
   * 获取会话详情
   * GET /api/virtual-company/sessions/:id
   */
  async getSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      
      const session = await virtualCompanyCreationService.getSessionById(sessionId);
      
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
   * GET /api/virtual-company/sessions
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
      
      const sessions = await virtualCompanyCreationService.getUserSessions(userId, limit, offset);
      
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
   * POST /api/virtual-company/sessions/:id/message
   */
  async sendMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required'
        });
      }
      
      // 验证会话存在
      const session = await virtualCompanyCreationService.getSessionById(sessionId);
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
        }
      );
      
      // 保存 NvwaX 分析结果到会话
      if (nvwaxResponse.analysisResult) {
        await virtualCompanyCreationService.updateRequirements(
          sessionId,
          nvwaxResponse.analysisResult as any
        );
      }
      
      // 保存团队设计
      if (nvwaxResponse.teamDesign) {
        await virtualCompanyCreationService.updateProgress(sessionId, {
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
        await virtualCompanyCreationService.updateStatus(sessionId, newStatus as any);
      }
      
      // 广播进度更新（SSE 服务会自动从数据库读取最新状态）
      sseProgressService.broadcastProgress(sessionId).catch(err => {
        console.error('Failed to broadcast progress:', err);
      });
      
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
   * PUT /api/virtual-company/sessions/:id/requirements
   */
  async updateRequirements(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      const requirements = req.body;
      
      await virtualCompanyCreationService.updateRequirements(sessionId, requirements);
      
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
   * PUT /api/virtual-company/sessions/:id/roles
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
      
      await virtualCompanyCreationService.updateSelectedRoles(sessionId, roles);
      
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
   * GET /api/virtual-company/sessions/:id/progress
   */
  async getProgress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      
      const session = await virtualCompanyCreationService.getSessionById(sessionId);
      
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
   * DELETE /api/virtual-company/sessions/:id
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
      
      const deleted = await virtualCompanyCreationService.deleteSession(sessionId, userId);
      
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
   * 生成 CEO Agent 回复（简化版 MVP）
   * TODO: 后续替换为真实的 LLM 调用
   */
  private async generateCEOResponse(session: any, userMessage: string): Promise<string> {
    // MVP 版本：基于会话状态返回预设回复
    
    switch (session.status) {
      case 'initiated':
        return '您好！我是您的虚拟公司 CEO。请问您需要创建什么类型的团队？例如：营销团队、开发团队、设计团队等。';
      
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
   * POST /api/virtual-company/sessions/:id/decide-agents
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
      const session = await virtualCompanyCreationService.getSessionById(sessionId);
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
   * POST /api/virtual-company/sessions/:id/confirm-agent
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
   * GET /api/virtual-company/sessions/:id/agent-decisions
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
   * GET /api/virtual-company/sessions/:id/stream
   */
  async streamProgress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      
      // 验证会话存在
      const session = await virtualCompanyCreationService.getSessionById(sessionId);
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
   * POST /api/virtual-company/sessions/:id/broadcast
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
   * 触发 NvwaX 完整匹配流程（Agent + Skill）
   * POST /api/virtual-company/sessions/:id/nvwax-match
   */
  async triggerNvwaXMatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const sessionId = Array.isArray(id) ? id[0] : id;
      
      // 验证会话存在
      const session = await virtualCompanyCreationService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      console.log(`🚀 Triggering NvwaX match for session ${sessionId}`);
      
      // 更新状态为 agent_searching
      await virtualCompanyCreationService.updateStatus(sessionId, 'agent_searching');
      await virtualCompanyCreationService.updateStepStatus(
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
      const teamDesign = (session as any).team_design || session.requirements;
      
      if (!teamDesign || !teamDesign.roles) {
        return res.status(400).json({
          success: false,
          error: 'Team design not found. Please complete requirements gathering first.'
        });
      }
      
      // 生成 NvwaX Aiteam架构师 配置（如果尚未生成）
      let ceoConfig = (session as any).ceo_config;
      if (!ceoConfig) {
        console.log('🎯 Generating CEO config...');
        try {
          const nvwaxResponse = await nvwaxAgentService.processMessage(
            '生成CEO配置',
            'ceo_generation',
            { teamDesign }
          );
          
          if (nvwaxResponse.ceoConfig) {
            ceoConfig = nvwaxResponse.ceoConfig;
            
            // 保存 CEO 配置到数据库
            const pool = databaseService.getPool();
            await pool.query(
              'UPDATE virtual_company_sessions SET ceo_config = $1 WHERE id = $2',
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
      const agentMatches = await nvwaxAgentService.matchAgentsForTeam(teamDesign);
      
      // 保存 Agent 匹配结果
      await virtualCompanyCreationService.updateProgress(sessionId, {
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
      await virtualCompanyCreationService.updateStatus(sessionId, 'skill_matching');
      
      // 广播进度更新
      sseProgressService.broadcastProgress(sessionId).catch(err => {
        console.error('Failed to broadcast progress:', err);
      });
      
      // 执行 Skill 匹配
      console.log('🎯 Starting skill matching...');
      const skillMatches = await nvwaxAgentService.matchSkillsForTeam(teamDesign);
      
      // 保存 Skill 匹配结果
      await virtualCompanyCreationService.updateProgress(sessionId, {
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
      await virtualCompanyCreationService.updateStatus(sessionId, 'confirming');
      
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
            }
          );
          
          if (nvwaxResponse.documentPackage) {
            documentPackage = nvwaxResponse.documentPackage;
            
            // 保存文档包到数据库
            const pool = databaseService.getPool();
            await pool.query(
              'UPDATE virtual_company_sessions SET document_package_url = $1 WHERE id = $2',
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
      const userId = (session as any).user_id;
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
}

// 导出单例实例
export const virtualCompanyCreationController = new VirtualCompanyCreationController();
