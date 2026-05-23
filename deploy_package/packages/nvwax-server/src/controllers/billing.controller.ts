import { Request, Response } from 'express';
import { billingService } from '../services/billing.service.js';

export class BillingController {
  /**
   * Create billing alert
   * POST /api/sdk/billing/alerts
   */
  async createAlert(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.apiKey?.tenant_id;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const { threshold_type, threshold_value, email, webhook_url } = req.body;

      if (!threshold_type || !threshold_value) {
        res.status(400).json({
          success: false,
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'threshold_type and threshold_value are required' 
          }
        });
        return;
      }

      const alert = await billingService.createBillingAlert({
        tenantId,
        thresholdType: threshold_type,
        thresholdValue: threshold_value,
        email,
        webhookUrl: webhook_url
      });

      res.status(201).json({
        success: true,
        data: alert
      });
    } catch (error: any) {
      console.error('Create billing alert error:', error);
      
      if (error.message.includes('Either email or webhook')) {
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
          message: 'Failed to create billing alert' 
        }
      });
    }
  }

  /**
   * List billing alerts
   * GET /api/sdk/billing/alerts
   */
  async listAlerts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.apiKey?.tenant_id;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const alerts = await billingService.listBillingAlerts(tenantId);

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('List billing alerts error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to list billing alerts' 
        }
      });
    }
  }

  /**
   * Delete billing alert
   * DELETE /api/sdk/billing/alerts/:id
   */
  async deleteAlert(req: Request, res: Response): Promise<void> {
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

      const deleted = await billingService.deleteBillingAlert(id, tenantId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Alert not found' }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Billing alert deleted successfully'
      });
    } catch (error) {
      console.error('Delete billing alert error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to delete billing alert' 
        }
      });
    }
  }

  /**
   * Get billing report
   * GET /api/sdk/billing/report
   */
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.apiKey?.tenant_id;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
        return;
      }

      const period = (req.query.period as 'day' | 'week' | 'month') || 'month';

      const report = await billingService.getBillingReport(tenantId, period);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Get billing report error:', error);
      res.status(500).json({
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to get billing report' 
        }
      });
    }
  }
}

export const billingController = new BillingController();
