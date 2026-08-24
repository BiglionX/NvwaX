import { authedJson, buildQuery } from '@/lib/oidc/authed-fetch';

/**
 * 通知定义
 */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 通知搜索结果
 */
export interface NotificationSearchResult {
  notifications: Notification[];
  total: number;
}

/**
 * 通知 API 客户端
 *
 * 鉴权说明：后端 /notifications 挂载 universalAuthMiddleware（仅认 Bearer / ?token=），
 * 统一走 authedJson（/api/auth/proxy 注入 OIDC token）。
 */
export const notificationApi = {
  /**
   * 获取用户的通知列表
   */
  getUserNotifications: async (params?: {
    isRead?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: NotificationSearchResult }> => {
    return authedJson<{ success: boolean; data: NotificationSearchResult }>(
      `/notifications${buildQuery(params as Record<string, unknown>)}`,
    );
  },

  /**
   * 获取未读通知数量
   */
  getUnreadCount: async (): Promise<{ success: boolean; data: { count: number } }> => {
    try {
      return await authedJson<{ success: boolean; data: { count: number } }>(
        '/notifications/unread-count',
      );
    } catch {
      // 静默失败，不打印日志，避免干扰开发体验
      // 通知功能是可选的，失败不影响核心功能
      return { success: false, data: { count: 0 } };
    }
  },

  /**
   * 标记通知为已读
   */
  markAsRead: async (id: string): Promise<{ success: boolean; data: Notification }> => {
    return authedJson<{ success: boolean; data: Notification }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  /**
   * 批量标记所有通知为已读
   */
  markAllAsRead: async () => {
    return authedJson('/notifications/read-all', { method: 'PUT' });
  },

  /**
   * 删除通知
   */
  deleteNotification: async (id: string) => {
    return authedJson(`/notifications/${id}`, { method: 'DELETE' });
  },
};
