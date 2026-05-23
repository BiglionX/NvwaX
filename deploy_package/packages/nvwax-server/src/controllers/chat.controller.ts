import { Request, Response } from 'express';
import { marketingAgentService } from '../services/marketing-agent.service.js';

export class ChatController {
  /**
   * Create chat completion (OpenAI-compatible endpoint)
   * POST /v1/chat/completions
   */
  async createCompletion(req: Request, res: Response): Promise<void> {
    try {
      const apiKeyId = req.apiKey?.id;
      const tenantId = req.apiKey?.tenant_id;

      if (!apiKeyId || !tenantId) {
        res.status(401).json({
          error: {
            message: 'Authentication required',
            type: 'invalid_request_error'
          }
        });
        return;
      }

      const request = req.body;

      // Validate request
      if (!request.model || !request.messages || !Array.isArray(request.messages)) {
        res.status(400).json({
          error: {
            message: 'Invalid request. "model" and "messages" are required.',
            type: 'invalid_request_error'
          }
        });
        return;
      }

      // Process the chat completion
      const response = await marketingAgentService.createChatCompletion(
        request,
        tenantId,
        apiKeyId,
        req.ip || undefined,
        req.get('User-Agent')
      );

      res.json(response);
    } catch (error: any) {
      console.error('Chat completion error:', error);
      
      res.status(500).json({
        error: {
          message: error.message || 'An error occurred during chat completion',
          type: 'server_error'
        }
      });
    }
  }
}

export const chatController = new ChatController();
