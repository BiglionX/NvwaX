import { Pool } from 'pg';
import { databaseService } from './database.service.js';

export interface BillingAlert {
  id: string;
  tenant_id: string;
  threshold_type: 'cost' | 'usage';
  threshold_value: number;
  email?: string;
  webhook_url?: string;
  is_active: boolean;
  created_at: Date;
}

export interface CreateBillingAlertInput {
  tenantId: string;
  thresholdType: 'cost' | 'usage';
  thresholdValue: number;
  email?: string;
  webhookUrl?: string;
}

export class BillingService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Create a billing alert
   */
  async createBillingAlert(input: CreateBillingAlertInput): Promise<BillingAlert> {
    const { tenantId, thresholdType, thresholdValue, email, webhookUrl } = input;

    if (!email && !webhookUrl) {
      throw new Error('Either email or webhook_url must be provided');
    }

    const result = await this.pool.query(
      `INSERT INTO billing_alerts (tenant_id, threshold_type, threshold_value, email, webhook_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenantId, thresholdType, thresholdValue, email || null, webhookUrl || null]
    );

    return this.formatBillingAlert(result.rows[0]);
  }

  /**
   * List billing alerts for a tenant
   */
  async listBillingAlerts(tenantId: string): Promise<BillingAlert[]> {
    const result = await this.pool.query(
      'SELECT * FROM billing_alerts WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );

    return result.rows.map(row => this.formatBillingAlert(row));
  }

  /**
   * Delete billing alert
   */
  async deleteBillingAlert(id: string, tenantId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM billing_alerts WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    return result.rows.length > 0;
  }

  /**
   * Check and trigger billing alerts
   * Should be called periodically (e.g., hourly cron job)
   */
  async checkAndTriggerAlerts(): Promise<void> {
    console.log('🔔 Checking billing alerts...');

    // Get all active alerts
    const alerts = await this.pool.query(
      'SELECT * FROM billing_alerts WHERE is_active = true'
    );

    for (const alert of alerts.rows) {
      try {
        await this.checkSingleAlert(alert);
      } catch (error) {
        console.error(`Failed to check alert ${alert.id}:`, error);
      }
    }

    console.log('✅ Billing alert check completed');
  }

  /**
   * Check a single alert
   */
  private async checkSingleAlert(alert: any): Promise<void> {
    const { id, tenant_id, threshold_type, threshold_value, email, webhook_url } = alert;

    // Get current usage/cost for the tenant
    let currentValue: number;

    if (threshold_type === 'cost') {
      // Get current month cost
      const result = await this.pool.query(
        `SELECT COALESCE(SUM(cost), 0) as total_cost
         FROM api_usage_logs
         WHERE tenant_id = $1 
         AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [tenant_id]
      );
      currentValue = parseFloat(result.rows[0].total_cost);
    } else {
      // Get current month usage (requests)
      const result = await this.pool.query(
        `SELECT COUNT(*) as total_requests
         FROM api_usage_logs
         WHERE tenant_id = $1 
         AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [tenant_id]
      );
      currentValue = parseInt(result.rows[0].total_requests);
    }

    // Check if threshold exceeded
    if (currentValue >= threshold_value) {
      console.log(`⚠️  Alert triggered for tenant ${tenant_id}: ${threshold_type} ${currentValue} >= ${threshold_value}`);

      // Send notification
      if (email) {
        await this.sendEmailAlert(email, tenant_id, threshold_type, currentValue, threshold_value);
      }

      if (webhook_url) {
        await this.sendWebhookAlert(webhook_url, tenant_id, threshold_type, currentValue, threshold_value);
      }

      // Mark alert as triggered (to avoid duplicate notifications)
      await this.pool.query(
        'UPDATE billing_alerts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    }
  }

  /**
   * Send email alert (placeholder - integrate with email service)
   */
  private async sendEmailAlert(
    email: string,
    tenantId: string,
    thresholdType: string,
    currentValue: number,
    thresholdValue: number
  ): Promise<void> {
    console.log(`📧 Would send email to ${email}:`);
    console.log(`   Tenant: ${tenantId}`);
    console.log(`   ${thresholdType}: ${currentValue} / ${thresholdValue}`);
    
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // await emailService.send({
    //   to: email,
    //   subject: `NvwaX Billing Alert - ${thresholdType} Threshold Exceeded`,
    //   html: `...`
    // });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(
    webhookUrl: string,
    tenantId: string,
    thresholdType: string,
    currentValue: number,
    thresholdValue: number
  ): Promise<void> {
    console.log(`🔔 Would send webhook to ${webhookUrl}`);
    
    const axiosModule = await import('axios');
    const axios = axiosModule.default;
    
    try {
      await axios.post(webhookUrl, {
        event: 'billing.alert',
        timestamp: new Date().toISOString(),
        data: {
          tenant_id: tenantId,
          threshold_type: thresholdType,
          current_value: currentValue,
          threshold_value: thresholdValue
        }
      });
      
      console.log('   ✅ Webhook sent successfully');
    } catch (error) {
      console.error('   ❌ Failed to send webhook:', error);
    }
  }

  /**
   * Get detailed billing report for a tenant
   */
  async getBillingReport(tenantId: string, period: 'day' | 'week' | 'month' = 'month'): Promise<any> {
    let dateFilter: string;
    
    switch (period) {
      case 'day':
        dateFilter = 'date_trunc(\'day\', CURRENT_DATE)';
        break;
      case 'week':
        dateFilter = 'date_trunc(\'week\', CURRENT_DATE)';
        break;
      case 'month':
      default:
        dateFilter = 'date_trunc(\'month\', CURRENT_DATE)';
        break;
    }

    // Get overall stats
    const statsResult = await this.pool.query(
      `SELECT 
         COUNT(*) as total_requests,
         COALESCE(SUM(tokens_used), 0) as total_tokens,
         COALESCE(SUM(cost), 0) as total_cost,
         COALESCE(AVG(response_time_ms), 0) as avg_response_time
       FROM api_usage_logs
       WHERE tenant_id = $1 
       AND created_at >= ${dateFilter}`,
      [tenantId]
    );

    // Get daily breakdown
    const dailyResult = await this.pool.query(
      `SELECT 
         date_trunc('day', created_at) as date,
         COUNT(*) as requests,
         COALESCE(SUM(tokens_used), 0) as tokens,
         COALESCE(SUM(cost), 0) as cost
       FROM api_usage_logs
       WHERE tenant_id = $1 
       AND created_at >= ${dateFilter}
       GROUP BY date
       ORDER BY date DESC`,
      [tenantId]
    );

    // Get endpoint breakdown
    const endpointResult = await this.pool.query(
      `SELECT 
         endpoint,
         COUNT(*) as requests,
         COALESCE(SUM(tokens_used), 0) as tokens,
         COALESCE(SUM(cost), 0) as cost
       FROM api_usage_logs
       WHERE tenant_id = $1 
       AND created_at >= ${dateFilter}
       GROUP BY endpoint
       ORDER BY requests DESC`,
      [tenantId]
    );

    return {
      period,
      summary: statsResult.rows[0],
      daily_breakdown: dailyResult.rows,
      endpoint_breakdown: endpointResult.rows
    };
  }

  /**
   * Format database row to BillingAlert object
   */
  private formatBillingAlert(row: any): BillingAlert {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      threshold_type: row.threshold_type,
      threshold_value: row.threshold_value,
      email: row.email,
      webhook_url: row.webhook_url,
      is_active: row.is_active,
      created_at: new Date(row.created_at)
    };
  }
}

export const billingService = new BillingService();
