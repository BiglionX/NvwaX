import { Response } from 'express';
import { Pool } from 'pg';
import { databaseService } from './database.service.js';

/**
 * SSE 客户端连接
 */
interface SSEClient {
  id: string;
  res: Response;
  sessionId: string;
  connectedAt: Date;
}

/**
 * SSE 进度事件
 */
export interface SSEProgressEvent {
  type: 'progress_update' | 'step_completed' | 'session_status_changed' | 'error';
  data: any;
  timestamp: Date;
}

/**
 * SSE 进度追踪服务
 * 
 * 实现 Server-Sent Events 实时推送 AiTeam 创建进度
 */
export class SSEProgressService {
  private clients: Map<string, SSEClient[]> = new Map();
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
    
    // 定期清理过期连接（每 5 分钟）
    setInterval(() => this.cleanupStaleConnections(), 5 * 60 * 1000);
  }

  /**
   * 建立 SSE 连接
   */
  connect(sessionId: string, res: Response): string {
    const clientId = `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 设置 SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // 禁用响应缓冲
    res.flushHeaders();

    const client: SSEClient = {
      id: clientId,
      res,
      sessionId,
      connectedAt: new Date()
    };

    // 保存客户端连接
    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, []);
    }
    this.clients.get(sessionId)!.push(client);

    console.log(`📡 SSE client connected: ${clientId} (session: ${sessionId})`);
    console.log(`📊 Total clients for session ${sessionId}: ${this.clients.get(sessionId)!.length}`);

    // 发送初始连接确认
    this.sendEvent(client, {
      type: 'progress_update',
      data: { message: 'Connected to progress stream', clientId },
      timestamp: new Date()
    });

    // 发送当前进度
    this.sendCurrentProgress(client);

    // 监听客户端断开连接
    res.on('close', () => {
      this.disconnect(clientId, sessionId);
    });

    res.on('error', (error) => {
      console.error(`SSE error for client ${clientId}:`, error);
      this.disconnect(clientId, sessionId);
    });

    return clientId;
  }

  /**
   * 断开 SSE 连接
   */
  disconnect(clientId: string, sessionId: string): void {
    const clients = this.clients.get(sessionId);
    if (clients) {
      const index = clients.findIndex(c => c.id === clientId);
      if (index !== -1) {
        clients.splice(index, 1);
        console.log(`📡 SSE client disconnected: ${clientId}`);
        
        // 如果没有客户端了，删除该会话的连接记录
        if (clients.length === 0) {
          this.clients.delete(sessionId);
        }
      }
    }
  }

  /**
   * 广播进度更新到所有连接的客户端
   */
  async broadcastProgress(sessionId: string): Promise<void> {
    const clients = this.clients.get(sessionId);
    if (!clients || clients.length === 0) {
      return;
    }

    try {
      // 直接查询数据库获取最新进度
      const result = await this.pool.query(
        'SELECT id, status, progress, requirements, selected_roles FROM aiteam_creation_sessions WHERE id = $1',
        [sessionId]
      );

      if (result.rows.length === 0) {
        console.warn(`Session not found: ${sessionId}`);
        return;
      }

      const session = result.rows[0];

      const event: SSEProgressEvent = {
        type: 'progress_update',
        data: {
          sessionId,
          status: session.status,
          progress: session.progress,
          requirements: session.requirements,
          selectedRoles: session.selected_roles
        },
        timestamp: new Date()
      };

      // 发送给所有客户端
      clients.forEach(client => {
        this.sendEvent(client, event);
      });

      console.log(`📢 Broadcasted progress to ${clients.length} clients`);
    } catch (error) {
      console.error('Error broadcasting progress:', error);
    }
  }

  /**
   * 广播步骤完成事件
   */
  async broadcastStepCompleted(sessionId: string, stepNumber: number, stepName: string): Promise<void> {
    const clients = this.clients.get(sessionId);
    if (!clients || clients.length === 0) {
      return;
    }

    const event: SSEProgressEvent = {
      type: 'step_completed',
      data: {
        sessionId,
        stepNumber,
        stepName,
        completedAt: new Date()
      },
      timestamp: new Date()
    };

    clients.forEach(client => {
      this.sendEvent(client, event);
    });

    console.log(`📢 Broadcasted step completed: ${stepName}`);
  }

  /**
   * 广播状态变更事件
   */
  async broadcastStatusChanged(sessionId: string, oldStatus: string, newStatus: string): Promise<void> {
    const clients = this.clients.get(sessionId);
    if (!clients || clients.length === 0) {
      return;
    }

    const event: SSEProgressEvent = {
      type: 'session_status_changed',
      data: {
        sessionId,
        oldStatus,
        newStatus,
        changedAt: new Date()
      },
      timestamp: new Date()
    };

    clients.forEach(client => {
      this.sendEvent(client, event);
    });

    console.log(`📢 Broadcasted status change: ${oldStatus} → ${newStatus}`);
  }

  /**
   * 广播错误事件
   */
  broadcastError(sessionId: string, error: Error): void {
    const clients = this.clients.get(sessionId);
    if (!clients || clients.length === 0) {
      return;
    }

    const event: SSEProgressEvent = {
      type: 'error',
      data: {
        sessionId,
        errorMessage: error.message,
        errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      timestamp: new Date()
    };

    clients.forEach(client => {
      this.sendEvent(client, event);
    });

    console.error(`📢 Broadcasted error to ${clients.length} clients:`, error.message);
  }

  /**
   * 发送单个事件到客户端
   */
  private sendEvent(client: SSEClient, event: SSEProgressEvent): void {
    try {
      const data = JSON.stringify(event);
      client.res.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error(`Error sending event to client ${client.id}:`, error);
      // 如果发送失败，断开连接
      this.disconnect(client.id, client.sessionId);
    }
  }

  /**
   * 发送当前进度给客户端
   */
  private async sendCurrentProgress(client: SSEClient): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT id, status, progress, requirements, selected_roles FROM aiteam_creation_sessions WHERE id = $1',
        [client.sessionId]
      );

      if (result.rows.length === 0) {
        return;
      }

      const session = result.rows[0];

      const event: SSEProgressEvent = {
        type: 'progress_update',
        data: {
          sessionId: client.sessionId,
          status: session.status,
          progress: session.progress,
          requirements: session.requirements,
          selectedRoles: session.selected_roles,
          isInitialLoad: true
        },
        timestamp: new Date()
      };

      this.sendEvent(client, event);
    } catch (error) {
      console.error('Error sending current progress:', error);
    }
  }

  /**
   * 清理过期的连接（超过 30 分钟无活动）
   */
  private cleanupStaleConnections(): void {
    const now = new Date();
    const maxAge = 30 * 60 * 1000; // 30 分钟

    this.clients.forEach((clients, sessionId) => {
      const staleClients = clients.filter(c => {
        const age = now.getTime() - c.connectedAt.getTime();
        return age > maxAge;
      });

      staleClients.forEach(client => {
        console.log(`🧹 Cleaning up stale connection: ${client.id}`);
        try {
          client.res.end();
        } catch (error) {
          // 忽略错误
        }
        this.disconnect(client.id, sessionId);
      });
    });
  }

  /**
   * 获取会话的活跃客户端数量
   */
  getActiveClientCount(sessionId: string): number {
    return this.clients.get(sessionId)?.length || 0;
  }

  /**
   * 获取所有会话的总客户端数量
   */
  getTotalClientCount(): number {
    let total = 0;
    this.clients.forEach(clients => {
      total += clients.length;
    });
    return total;
  }

  /**
   * 关闭所有连接（服务器关闭时调用）
   */
  closeAllConnections(): void {
    this.clients.forEach((clients, sessionId) => {
      clients.forEach(client => {
        try {
          client.res.end();
        } catch (error) {
          // 忽略错误
        }
      });
    });
    this.clients.clear();
    console.log('🔌 All SSE connections closed');
  }
}

// 导出单例
export const sseProgressService = new SSEProgressService();
