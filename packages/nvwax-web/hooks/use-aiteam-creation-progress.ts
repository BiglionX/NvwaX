import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * SSE 进度事件类型
 */
export interface SSEProgressEvent {
  type: 'progress_update' | 'step_completed' | 'session_status_changed' | 'error';
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * 进度步骤
 */
export interface ProgressStep {
  stepNumber: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * 创建进度
 */
export interface CreationProgress {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  steps: ProgressStep[];
}

/**
 * 会话状态
 */
export type SessionStatus = 
  | 'initiated'
  | 'requirements_gathering'
  | 'role_selection'
  | 'agent_searching'
  | 'skill_matching'
  | 'confirming'
  | 'building'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Hook 返回值
 */
interface UseAiTeamCreationProgressReturn {
  progress: CreationProgress | null;
  status: SessionStatus | null;
  isConnected: boolean;
  error: Error | null;
  events: SSEProgressEvent[];
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * AiTeam 创建进度追踪 Hook
 * 
 * 使用 Server-Sent Events (SSE) 实时接收进度更新
 */
export function useAiTeamCreationProgress(
  sessionId: string | null,
  options?: {
    autoReconnect?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  }
): UseAiTeamCreationProgressReturn {
  const [progress, setProgress] = useState<CreationProgress | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [events, setEvents] = useState<SSEProgressEvent[]>([]);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = options?.maxRetries ?? 5;
  const retryDelay = options?.retryDelay ?? 3000;
  const autoReconnect = options?.autoReconnect ?? true;

  // 建立 SSE 连接
  const connect = useCallback(() => {
    if (!sessionId) {
      console.warn('No sessionId provided');
      return;
    }

    // 关闭现有连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      console.log(`🔌 Connecting to SSE stream for session: ${sessionId}`);
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = typeof window !== 'undefined' ? localStorage.getItem('user_token') : null;
      
      // SSE EventSource 不支持自定义 header，通过 URL 参数传递 token
      const url = token 
        ? `${API_URL}/aiteam-creation/sessions/${sessionId}/stream?token=${encodeURIComponent(token)}`
        : `${API_URL}/aiteam-creation/sessions/${sessionId}/stream`;
      
      const eventSource = new EventSource(url);
      
      eventSourceRef.current = eventSource;

      // 连接成功
      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        setIsConnected(true);
        setError(null);
        retryCountRef.current = 0; // 重置重试计数
      };

      // 监听进度更新
      eventSource.addEventListener('progress_update', (event) => {
        try {
          const data: SSEProgressEvent = JSON.parse(event.data);
          console.log('📊 Progress update:', data);
          
          setEvents(prev => [...prev.slice(-50), data]); // 保留最近 50 个事件
          
          if (data.data.progress) {
            setProgress(data.data.progress as CreationProgress);
          }
          if (data.data.status) {
            setStatus(data.data.status as SessionStatus);
          }
        } catch (err) {
          console.error('Failed to parse progress_update event:', err);
        }
      });

      // 监听步骤完成
      eventSource.addEventListener('step_completed', (event) => {
        try {
          const data: SSEProgressEvent = JSON.parse(event.data);
          console.log('✅ Step completed:', data.data.stepName);
          
          setEvents(prev => [...prev.slice(-50), data]);
          
          // 更新进度中的步骤状态
          setProgress(prev => {
            if (!prev) return prev;
            
            const updatedSteps = prev.steps.map(step => {
              if (step.stepNumber === data.data.stepNumber) {
                return {
                  ...step,
                  status: 'completed' as const,
                  completedAt: data.data.completedAt as string | undefined
                };
              }
              return step;
            });
            
            return {
              ...prev,
              steps: updatedSteps
            };
          });
        } catch (err) {
          console.error('Failed to parse step_completed event:', err);
        }
      });

      // 监听状态变更
      eventSource.addEventListener('session_status_changed', (event) => {
        try {
          const data: SSEProgressEvent = JSON.parse(event.data);
          console.log(`🔄 Status changed: ${data.data.oldStatus} → ${data.data.newStatus}`);
          
          setEvents(prev => [...prev.slice(-50), data]);
          setStatus(data.data.newStatus as SessionStatus);
        } catch (err) {
          console.error('Failed to parse session_status_changed event:', err);
        }
      });

      // 监听错误
      eventSource.addEventListener('error', (event) => {
        try {
          const messageEvent = event as MessageEvent;
          const data: SSEProgressEvent = JSON.parse(messageEvent.data);
          console.error('❌ SSE error:', data.data.errorMessage);
          
          setEvents(prev => [...prev.slice(-50), data]);
          setError(new Error(data.data.errorMessage as string));
        } catch (err) {
          console.error('Failed to parse error event:', err);
        }
      });

      // 连接错误
      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
        
        // 如果连接已打开，说明是临时错误，浏览器会自动重连
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.log('🔄 Browser will attempt to reconnect...');
        } else {
          // 连接关闭，尝试手动重连
          setIsConnected(false);
          
          if (autoReconnect && retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            console.log(`🔄 Retrying connection (${retryCountRef.current}/${maxRetries})...`);
            
            setTimeout(() => {
              connect();
            }, retryDelay);
          } else {
            setError(new Error('Failed to connect after multiple retries'));
          }
        }
      };

    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, [sessionId, autoReconnect, maxRetries, retryDelay]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('🔌 Disconnecting from SSE stream');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // 手动重连
  const reconnect = useCallback(() => {
    console.log('🔄 Manually reconnecting...');
    retryCountRef.current = 0;
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  }, [connect, disconnect]);

  // 组件挂载时连接，卸载时断开
  useEffect(() => {
    if (sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  return {
    progress,
    status,
    isConnected,
    error,
    events,
    reconnect,
    disconnect
  };
}
