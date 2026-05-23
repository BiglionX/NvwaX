import { Pool } from 'pg';
import { databaseService } from './database.service.js';
import axios from 'axios';

export interface WebhookSubscription {
  id: string;
  tenant_id: string;
  event_type: string;
  url: string;
  secret?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WebhookEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  payload: any;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  last_attempt_at?: Date;
  delivered_at?: Date;
  created_at: Date;
}

export interface CreateWebhookInput {
  tenantId: string;
  eventType: string;
  url: string;
  secret?: string;
}

export class WebhookService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * Create a webhook subscription
   */
  async createWebhook(input: CreateWebhookInput): Promise<WebhookSubscription> {
    const { tenantId, eventType, url, secret } = input;

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Check if subscription already exists
    const existing = await this.pool.query(
      'SELECT id FROM webhook_subscriptions WHERE tenant_id = $1 AND event_type = $2 AND url = $3',
      [tenantId, eventType, url]
    );

    if (existing.rows.length > 0) {
      throw new Error('Webhook subscription already exists for this event type and URL');
    }

    const result = await this.pool.query(
      `INSERT INTO webhook_subscriptions (tenant_id, event_type, url, secret)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tenantId, eventType, url, secret || null]
    );

    return this.formatWebhook(result.rows[0]);
  }

  /**
   * List all webhook subscriptions for a tenant
   */
  async listWebhooks(tenantId: string): Promise<WebhookSubscription[]> {
    const result = await this.pool.query(
      'SELECT * FROM webhook_subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );

    return result.rows.map(row => this.formatWebhook(row));
  }

  /**
   * Get webhook by ID
   */
  async getWebhookById(id: string, tenantId: string): Promise<WebhookSubscription | null> {
    const result = await this.pool.query(
      'SELECT * FROM webhook_subscriptions WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatWebhook(result.rows[0]);
  }

  /**
   * Update webhook subscription
   */
  async updateWebhook(
    id: string,
    tenantId: string,
    updates: Partial<Pick<WebhookSubscription, 'url' | 'secret' | 'is_active'>>
  ): Promise<WebhookSubscription | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.url !== undefined) {
      try {
        new URL(updates.url);
      } catch {
        throw new Error('Invalid URL format');
      }
      fields.push(`url = $${paramIndex++}`);
      values.push(updates.url);
    }

    if (updates.secret !== undefined) {
      fields.push(`secret = $${paramIndex++}`);
      values.push(updates.secret);
    }

    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.is_active);
    }

    if (fields.length === 0) {
      return await this.getWebhookById(id, tenantId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    values.push(tenantId);

    const result = await this.pool.query(
      `UPDATE webhook_subscriptions 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.formatWebhook(result.rows[0]);
  }

  /**
   * Delete webhook subscription
   */
  async deleteWebhook(id: string, tenantId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM webhook_subscriptions WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    return result.rows.length > 0;
  }

  /**
   * Trigger a webhook event
   */
  async triggerEvent(
    tenantId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    console.log(`🔔 Triggering webhook event: ${eventType} for tenant ${tenantId}`);

    // Get all active subscriptions for this event type
    const subscriptions = await this.pool.query(
      `SELECT * FROM webhook_subscriptions 
       WHERE tenant_id = $1 AND event_type = $2 AND is_active = true`,
      [tenantId, eventType]
    );

    if (subscriptions.rows.length === 0) {
      console.log(`   No active subscriptions found for ${eventType}`);
      return;
    }

    console.log(`   Found ${subscriptions.rows.length} subscription(s)`);

    // Create event record
    const eventResult = await this.pool.query(
      `INSERT INTO webhook_events (tenant_id, event_type, payload, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [tenantId, eventType, JSON.stringify(payload)]
    );

    const eventId = eventResult.rows[0].id;

    // Deliver to each subscription asynchronously
    for (const sub of subscriptions.rows) {
      this.deliverWebhook(eventId, sub).catch(error => {
        console.error(`Failed to deliver webhook ${eventId}:`, error);
      });
    }
  }

  /**
   * Deliver webhook to a specific subscription
   */
  private async deliverWebhook(
    eventId: string,
    subscription: any
  ): Promise<void> {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      
      try {
        console.log(`   Attempt ${attempt}/${maxAttempts} to ${subscription.url}`);

        // Prepare payload
        const eventPayload = {
          id: eventId,
          event_type: subscription.event_type,
          timestamp: new Date().toISOString(),
          data: typeof subscription.payload === 'string' 
            ? JSON.parse(subscription.payload) 
            : subscription.payload
        };

        // Generate signature if secret is provided
        const headers: any = {
          'Content-Type': 'application/json',
          'X-Webhook-Event': subscription.event_type
        };

        if (subscription.secret) {
          const crypto = await import('crypto');
          const signature = crypto
            .createHmac('sha256', subscription.secret)
            .update(JSON.stringify(eventPayload))
            .digest('hex');
          
          headers['X-Webhook-Signature'] = signature;
        }

        // Send request
        const response = await axios.post(subscription.url, eventPayload, {
          headers,
          timeout: 10000, // 10 second timeout
          validateStatus: status => status >= 200 && status < 300
        });

        console.log(`   ✅ Delivered successfully (status: ${response.status})`);

        // Update event status
        await this.pool.query(
          `UPDATE webhook_events 
           SET status = 'delivered', 
               attempts = $1, 
               last_attempt_at = CURRENT_TIMESTAMP,
               delivered_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [attempt, eventId]
        );

        return; // Success, exit loop
      } catch (error: any) {
        console.error(`   ❌ Attempt ${attempt} failed:`, error.message);

        if (attempt === maxAttempts) {
          // All attempts failed
          await this.pool.query(
            `UPDATE webhook_events 
             SET status = 'failed', 
                 attempts = $1, 
                 last_attempt_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [attempt, eventId]
          );

          console.error(`   ⚠️  All ${maxAttempts} attempts failed for event ${eventId}`);
        } else {
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`   Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  /**
   * Get webhook events for a tenant
   */
  async getWebhookEvents(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WebhookEvent[]> {
    const result = await this.pool.query(
      `SELECT * FROM webhook_events 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );

    return result.rows.map(row => this.formatWebhookEvent(row));
  }

  /**
   * Retry a failed webhook event
   */
  async retryEvent(eventId: string, tenantId: string): Promise<boolean> {
    // Get the event
    const eventResult = await this.pool.query(
      'SELECT * FROM webhook_events WHERE id = $1 AND tenant_id = $2',
      [eventId, tenantId]
    );

    if (eventResult.rows.length === 0) {
      return false;
    }

    const event = eventResult.rows[0];

    if (event.status !== 'failed') {
      throw new Error('Can only retry failed events');
    }

    // Get the subscription
    const subResult = await this.pool.query(
      `SELECT ws.* 
       FROM webhook_subscriptions ws
       WHERE ws.tenant_id = $1 AND ws.event_type = $2 AND ws.is_active = true
       LIMIT 1`,
      [tenantId, event.event_type]
    );

    if (subResult.rows.length === 0) {
      throw new Error('No active subscription found for this event type');
    }

    // Reset event status and retry
    await this.pool.query(
      `UPDATE webhook_events 
       SET status = 'pending', attempts = 0, last_attempt_at = NULL
       WHERE id = $1`,
      [eventId]
    );

    await this.deliverWebhook(eventId, subResult.rows[0]);

    return true;
  }

  /**
   * Format database row to WebhookSubscription object
   */
  private formatWebhook(row: any): WebhookSubscription {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      event_type: row.event_type,
      url: row.url,
      secret: row.secret,
      is_active: row.is_active,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Format database row to WebhookEvent object
   */
  private formatWebhookEvent(row: any): WebhookEvent {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      event_type: row.event_type,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      status: row.status,
      attempts: row.attempts,
      last_attempt_at: row.last_attempt_at ? new Date(row.last_attempt_at) : undefined,
      delivered_at: row.delivered_at ? new Date(row.delivered_at) : undefined,
      created_at: new Date(row.created_at)
    };
  }
}

export const webhookService = new WebhookService();
