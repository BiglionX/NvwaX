import apiClient from './client';

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
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  /**
   * 获取未读通知数量
   */
  getUnreadCount: async (): Promise<{ success: boolean; data: { count: number } }> => {
    try {
      const response = await apiClient.get('/notifications/unread-count', {
        timeout: 5000 // 缩短超时时间到 5 秒，避免长时间等待
      });
      return response.data;
    } catch (error) {
      // 静默失败，不影响页面渲染
      console.warn('Failed to fetch unread count:', error);
      return { success: false, data: { count: 0 } };
    }
  },

  /**
   * 标记通知为已读
   */
  markAsRead: async (id: string): Promise<{ success: boolean; data: Notification }> => {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * 批量标记所有通知为已读
   */
  markAllAsRead: async () => {
    const response = await apiClient.put('/notifications/read-all');
    return response.data;
  },

  /**
   * 删除通知
   */
  deleteNotification: async (id: string) => {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  }
};
