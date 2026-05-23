import { Request, Response } from 'express';
import { webhookService } from '../services/webhook.service.js';

export class WebhookController {
  /**
   * Create webhook subscription
   * POST /api/sdk/webhooks
   */
  async createWebhook(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.apiKey?.tenant_id;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const { event_type, url, secret } = req.body;

      if (!event_type || !url) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'event_type and url are required' 
          }
        });
        return;
      }

      const webhook = await webhookService.createWebhook({
        tenantId,
        eventType: event_type,
        url,
        secret
      });

      res.status(201).json({
        success: true,
        data: webhook
      });
    } catch (error: any) {
      console.error('Create webhook error:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: error.message }
        });
        return;
      }

      if (error.message.includes('Invalid URL')) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to create webhook' 
        }
      });
    }
  }

  /**
   * List webhook subscriptions
   * GET /api/sdk/webhooks
   */
  async listWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.apiKey?.tenant_id;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const webhooks = await webhookService.listWebhooks(tenantId);

      res.json({
        success: true,
        data: webhooks
      });
    } catch (error) {
      console.error('List webhooks error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to list webhooks' 
        }
      });
    }
  }

  /**
   * Get webhook by ID
   * GET /api/sdk/webhooks/:id
   */
  async getWebhook(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.apiKey?.tenant_id;
      const { id } = req.params;

      if (!tenantId || Array.isArray(id)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const webhook = await webhookService.getWebhookById(id, tenantId);

      if (!webhook) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Webhook not found' }
        });
        return;
      }

      res.json({
        success: true,
        data: webhook
      });
    } catch (error) {
      console.error('Get webhook error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to get webhook' 
        }
      });
    }
  }

  /**
   * Update webhook
   * PUT /api/sdk/webhooks/:id
   */
  async updateWebhook(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.apiKey?.tenant_id;
      const { id } = req.params;
      const { url, secret, is_active } = req.body;

      if (!tenantId || Array.isArray(id)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const webhook = await webhookService.updateWebhook(id, tenantId, {
        url,
        secret,
        is_active
      });

      if (!webhook) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Webhook not found' }
        });
        return;
      }

      res.json({
        success: true,
        data: webhook
      });
    } catch (error: any) {
      console.error('Update webhook error:', error);
      
      if (error.message.includes('Invalid URL')) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to update webhook' 
        }
      });
    }
  }

  /**
   * Delete webhook
   * DELETE /api/sdk/webhooks/:id
   */
  async deleteWebhook(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.apiKey?.tenant_id;
      const { id } = req.params;

      if (!tenantId || Array.isArray(id)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const deleted = await webhookService.deleteWebhook(id, tenantId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Webhook not found' }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Webhook deleted successfully'
      });
    } catch (error) {
      console.error('Delete webhook error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to delete webhook' 
        }
      });
    }
  }

  /**
   * Get webhook events
   * GET /api/sdk/webhooks/events
   */
  async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.apiKey?.tenant_id;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const events = await webhookService.getWebhookEvents(tenantId, limit, offset);

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Get webhook events error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to get webhook events' 
        }
      });
    }
  }

  /**
   * Retry failed webhook event
   * POST /api/sdk/webhooks/events/:id/retry
   */
  async retryEvent(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.apiKey?.tenant_id;
      const { id } = req.params;

      if (!tenantId || Array.isArray(id)) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const retried = await webhookService.retryEvent(id, tenantId);

      if (!retried) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Event not found' }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Event retry initiated'
      });
    } catch (error: any) {
      console.error('Retry event error:', error);
      
      if (error.message.includes('Can only retry failed events')) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: error.message }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to retry event' 
        }
      });
    }
  }
}

export const webhookController = new WebhookController();
