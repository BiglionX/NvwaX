/**
 * Admin API client (Sprint 2.4 迁移到 authedFetch)
 *
 * 鉴权通道：OIDC httpOnly cookie → /api/auth/proxy → 后端 auth.middleware
 * 不再读 localStorage admin_token / admin_info（XSS 安全）
 *
 * adminApi.login() 保留为兼容老 admins 表独立登录：直连后端 (credentials: 'omit')
 *   @deprecated Sprint 2.4 起 admin 鉴权走 OIDC；此方法保留为兼容老流程
 */

import { authedFetch } from '@/lib/oidc/authed-fetch';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ─────────── helpers ───────────

async function getJson<T = any>(path: string): Promise<T> {
  const res = await authedFetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  const json = await res.json();
  // 后端统一响应格式: { success, data, ... }，解包 data
  return (json && typeof json === 'object' && 'data' in json ? (json as { data: T }).data : json) as T;
}

async function postJson<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await authedFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  const json = await res.json();
  return (json && typeof json === 'object' && 'data' in json ? (json as { data: T }).data : json) as T;
}

async function putJson<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await authedFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  const json = await res.json();
  return (json && typeof json === 'object' && 'data' in json ? (json as { data: T }).data : json) as T;
}

async function deleteJson<T = any>(path: string): Promise<T> {
  const res = await authedFetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  const json = await res.json().catch(() => undefined);
  return (json && typeof json === 'object' && 'data' in json ? (json as { data: T }).data : json) as T;
}

/**
 * 某些后端接口直接返回完整 JSON（如分页接口 `response.data` 是 { items, total, page, limit }），
 * 用 rawGetJson 跳过 data 解包。
 */
async function rawGetJson<T = any>(path: string): Promise<T> {
  const res = await authedFetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

// ─────────── types ───────────

export interface Admin {
  id: string;
  username: string;
  email: string;
  name?: string;
  role: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface SocialAccountSummary {
  provider: string;
  providerUserId: string;
  displayName?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  bio?: string;
  isBanned?: boolean;
  banReason?: string;
  socialAccounts?: SocialAccountSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status?: string;
  reviewNotes?: string;
  userEmail?: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  message: string;
  data: {
    admin: Admin;
    token: string;
  };
}

// ─────────── adminApi ───────────

export const adminApi = {
  /**
   * 兼容老 admins 表独立登录（Sprint 2.4 起新流程走 OIDC，此方法标 @deprecated）
   * 直连后端不走 proxy，credentials: 'omit' 避免污染 OIDC session cookie
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'omit',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || `Login failed: ${res.status}`);
    }
    return res.json();
  },

  // ─── 当前管理员信息 ───
  getProfile: () => getJson<Admin>('/admin/profile'),
  updateProfile: (data: Partial<Pick<Admin, 'name' | 'email' | 'avatar'>>) =>
    putJson<Admin>('/admin/profile', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    postJson<void>('/admin/change-password', { oldPassword, newPassword }),

  // ─── 管理员管理 ───
  getAllAdmins: () => getJson<Admin[]>('/admin/admins'),
  createAdmin: (data: { username: string; password: string; email: string; name?: string; role?: string }) =>
    postJson<Admin>('/admin/admins', data),
  deleteAdmin: (id: string) => deleteJson<void>(`/admin/admins/${id}`),

  // ─── 系统统计 / 日志 ───
  getSystemStats: () => getJson<any>('/admin/system/stats'),
  getSystemLogs: (page: number = 1, limit: number = 20) =>
    rawGetJson<any>(`/admin/system/logs${qs({ page, limit })}`),

  // ─── 爬虫管理 ───
  getCrawlerStatus: () => getJson<any>('/admin/crawler/status'),
  triggerCrawler: () => postJson<any>('/admin/crawler/trigger'),
  updateCrawlerConfig: (intervalHours: number) =>
    putJson<any>('/admin/crawler/config', { intervalHours }),
  getCrawlerHistory: (limit: number = 20) =>
    rawGetJson<any>(`/admin/crawler/history${qs({ limit })}`),
  cleanOldAgents: (days: number) => postJson<any>('/admin/crawler/clean', { days }),

  // ─── 用户管理 ───
  getUserList: (page: number = 1, limit: number = 20, search?: string) =>
    rawGetJson<any>(`/admin/users${qs({ page, limit, search })}`),
  getUserStats: () => getJson<any>('/admin/users/stats'),
  banUser: (userId: string, reason?: string) =>
    postJson<any>(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId: string) => postJson<any>(`/admin/users/${userId}/unban`),
  getUserSocialAccounts: (userId: string) =>
    rawGetJson<any>(`/admin/users/${userId}/social-accounts`),
  getUserSocialStats: () => getJson<any>('/admin/users/social-stats'),

  // ─── 项目管理 ───
  getProjectList: (page: number = 1, limit: number = 20, search?: string, status?: string) =>
    rawGetJson<any>(`/admin/projects${qs({ page, limit, search, status })}`),
  getProjectStats: () => getJson<any>('/admin/projects/stats'),
  reviewProject: (projectId: string, approved: boolean, notes?: string) =>
    postJson<any>(`/admin/projects/${projectId}/review`, { approved, notes }),
  suspendProject: (projectId: string, reason?: string) =>
    postJson<any>(`/admin/projects/${projectId}/suspend`, { reason }),
  restoreProject: (projectId: string) =>
    postJson<any>(`/admin/projects/${projectId}/restore`),

  // ─── 系统管理 ───
  getSystemHealth: () => getJson<any>('/admin/system/health'),
  clearCache: () => postJson<any>('/admin/system/clear-cache'),
  backupDatabase: () => postJson<any>('/admin/system/backup'),

  // ─── AI 业务管理 ───
  getAgentList: (page: number = 1, limit: number = 20, search?: string) =>
    rawGetJson<any>(`/admin/agents${qs({ page, limit, search })}`),
  getAiTeamBuilds: () => rawGetJson<any>('/admin/virtual-companies/builds'),
  sendAnnouncement: (data: { title: string; message: string; priority?: string }) =>
    postJson<any>('/admin/notifications/announce', data),

  // ─── Token 配额管理 ───
  getTokenOverview: () => getJson<any>('/admin/tokens/overview'),
  getTokenUsersList: (page: number = 1, limit: number = 20, search?: string) =>
    rawGetJson<any>(`/admin/tokens/users${qs({ page, limit, search })}`),
  getTokenUserDetail: (userId: string, page: number = 1, limit: number = 20, sourceType?: string) =>
    getJson<any>(`/admin/tokens/users/${userId}${qs({ page, limit, sourceType })}`),
  getTokenConsumptionBreakdown: (period: 'day' | 'week' | 'month' = 'month') =>
    getJson<any>(`/admin/tokens/consumption-breakdown${qs({ period })}`),
  resetMonthlyQuotas: () => postJson<any>('/admin/tokens/reset-monthly'),
  toggleInternalTeam: (userId: string) =>
    putJson<any>(`/admin/tokens/internal-team/${userId}`),

  // ─── 支付配置管理 ───
  getDeveloperList: (page: number = 1, limit: number = 20, search?: string) =>
    rawGetJson<any>(`/admin/developers${qs({ page, limit, search })}`),
  getPaymentConfigs: () => getJson<any>('/admin/payment-configs'),
  savePaymentConfig: (data: {
    provider: string;
    provider_label: string;
    qr_code_url?: string;
    account_name?: string;
    account_info?: string;
    sort_order?: number;
  }) => postJson<any>('/admin/payment-configs', data),
  togglePaymentConfig: (provider: string, enabled: boolean) =>
    postJson<any>(`/admin/payment-configs/${provider}/toggle`, { enabled }),

  // ─── Token 订单 ───
  getTokenOrders: (page: number = 1, limit: number = 20, status?: string) =>
    rawGetJson<any>(`/admin/token-orders${qs({ page, limit, status })}`),
  confirmTokenOrder: (orderId: string) =>
    postJson<any>(`/admin/token-orders/${orderId}/confirm`),
  cancelTokenOrder: (orderId: string) =>
    postJson<any>(`/admin/token-orders/${orderId}/cancel`),
};
