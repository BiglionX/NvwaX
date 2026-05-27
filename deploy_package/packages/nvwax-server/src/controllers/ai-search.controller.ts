import { Request, Response } from 'express';
import { aiSearchAgentService } from '../services/ai-search-agent.service.js';

class AiSearchController {
  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = await aiSearchAgentService.createSession();
      res.json({
        success: true,
        data: { sessionId }
      });
    } catch (error: any) {
      console.error('AI Search: Create session error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '创建搜索会话失败'
        }
      });
    }
  }

  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, message } = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SESSION_ID',
            message: '缺少会话 ID'
          }
        });
        return;
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_MESSAGE',
            message: '请输入搜索内容'
          }
        });
        return;
      }

      const response = await aiSearchAgentService.chat(sessionId, message.trim());

      res.json({
        success: true,
        data: response
      });
    } catch (error: any) {
      console.error('AI Search: Chat error:', error);
      
      if (error.message?.includes('Session not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: '搜索会话不存在或已过期，请重新开始搜索'
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'AI 搜索失败，请稍后重试'
        }
      });
    }
  }

  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const session = aiSearchAgentService.getSession(sessionId as string);

      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: '搜索会话不存在或已过期'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error: any) {
      console.error('AI Search: Get session error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取会话信息失败'
        }
      });
    }
  }
}

export const aiSearchController = new AiSearchController();
