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

async function getJson<T = unknown>(path: string): Promise<T> {
  const res = await authedFetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  const json = await res.json();
  // 后端统一响应格式: { success, data, ... }，解包 data
  return (json && typeof json === 'object' && 'data' in json ? (json as { data: T }).data : json) as T;
}

async function postJson<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await authedFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  const json = await res.json();
  return (json && typeof json === 'object' && 'data' in json ? (json as { data: T }).data : json) as T;
}

async function putJson<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await authedFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  const json = await res.json();
  return (json && typeof json === 'object' && 'data' in json ? (json as { data: T }).data : json) as T;
}

async function deleteJson<T = unknown>(path: string): Promise<T> {
  const res = await authedFetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  const json = await res.json().catch(() => undefined);
  return (json && typeof json === 'object' && 'data' in json ? (json as { data: T }).data : json) as T;
}

/**
 * 某些后端接口直接返回完整 JSON（如分页接口 `response.data` 是 { items, total, page, limit }），
 * 用 rawGetJson 跳过 data 解包。
 */
async function rawGetJson<T = unknown>(path: string): Promise<T> {
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

/**
 * 后端 /admin/system/health 响应（admin.controller.ts: getSystemHealth）
 * 高频接口——两个 page 文件访问 24+ 处，给具体类型避免消费侧手动断言。
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptime: number;
  memory: { rss: number; [key: string]: number };
  database: {
    status: 'healthy' | 'unhealthy';
    poolSize: number;
    idleCount: number;
    waitingCount: number;
  };
  nodeVersion: string;
  platform: string;
}

/**
 * 通用分页响应包装（后端 controller 用 res.json({ data: { items, total, page, limit } })）。
 * 用泛型 T 代表列表项类型。
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Agent / 智能体记录（后端 /admin/agents 列表项，参见 admin.controller.ts: getAgentList）。
 * 与 agents/page.tsx 里的本地 interface Agent 同步。
 */
export interface Agent {
  id: string;
  name: string;
  description?: string;
  userId: string;
  userEmail?: string;
  createdAt: string;
}

/**
 * 爬虫状态响应（crawler 页面访问 scheduler.isRunning / statistics.totalAgents / githubAgents / huggingfaceAgents / lastCrawlTime）。
 */
export interface CrawlerStatus {
  scheduler: { isRunning: boolean; [key: string]: unknown };
  statistics: {
    totalAgents: number;
    githubAgents: number;
    huggingfaceAgents: number;
    lastCrawlTime?: string;
  };
}

/**
 * 后端 /admin/system/stats 响应（dashboard 页面访问 totalAdmins / totalUsers / totalProjects / systemUptime / userTrend）。
 * 后端实际返回字段可能更多，这里只列消费侧使用的字段。
 */
export interface SystemStats {
  totalAdmins: number;
  totalUsers: number;
  totalProjects: number;
  systemUptime: number;
  userTrend: { date: string; count: number }[];
}

/**
 * Token 概览（dashboard 页面访问 totalTokensThisMonth）。
 */
export interface TokenOverview {
  totalTokensThisMonth: number;
  [key: string]: number;
}

/**
 * 审计日志记录（后端 /admin/system/logs 列表项，参见 admin.controller.ts: getAuditLogs）。
 * 所有字段为必填，与 audit-logs/page.tsx 本地 interface AuditLog 一致。
 */
export interface AuditLog {
  id: string;
  adminId: string;
  level: string;
  action: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

/**
 * 爬取历史中的 Agent 记录（crawler 页面访问 source / stars / downloads / last_crawled_at）。
 */
export interface CrawledAgent {
  id: string;
  name: string;
  source: string;
  stars: number;
  downloads: number;
  last_crawled_at: string;
}

/**
 * AiTeam 打包任务记录（virtual-companies 页面用）。
 */
export interface BuildJob {
  id: string;
  teamSkillId: string;
  platform: 'windows' | 'macos' | 'linux';
  status: 'queued' | 'building' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * 用户统计（users 页面用）。
 */
export interface UserStats {
  total: number;
  active: number;
  banned: number;
  [key: string]: number;
}

/**
 * Token 用户详情（tokens 页面访问 quota + transactions 列表项）。
 */
export interface TokenUserDetail {
  quota: {
    monthlyLimit: number;
    usedThisMonth: number;
    remaining: number;
    usagePercent: number;
  };
  transactions: {
    id: string;
    created_at: string;
    source_type: string;
    endpoint: string;
    tokens_consumed: number;
    is_overage: boolean;
    overage_cost: number;
    model: string;
  }[];
}

/**
 * Token 消耗分布（tokens 页面用）。
 */
export interface TokenConsumptionEntry {
  endpoint: string;
  total_tokens: number;
  source_type: string;
  request_count: number;
}

/**
 * 项目统计（projects 页面用）。
 */
export interface ProjectStats {
  total: number;
  active: number;
  suspended: number;
  underReview: number;
  [key: string]: number;
}

/**
 * 支付渠道配置（payment-settings 页面使用）。
 */
export interface PaymentConfig {
  provider: string;
  provider_label: string;
  enabled: boolean;
  qr_code_url?: string;
  account_name?: string;
  account_info?: string;
  sort_order?: number;
}

/**
 * 开发者记录（developers 页面用，含 API key 数量与本月使用情况）。
 */
export interface DeveloperInfo {
  user_id: string;
  user_name: string;
  user_email: string;
  api_key_count: number;
  api_keys: { id: string; key_prefix: string; name: string; permissions: string[]; is_active: boolean; last_used_at: string | null; created_at: string; rate_limit: number }[];
  monthly_limit: number;
  used_this_month: number;
  remaining: number;
  usage_percent: number;
  overage_tokens: number;
  overage_cost: number;
  total_used: number;
  is_internal_team: boolean;
}

/**
 * Token 配额用户记录（tokens 页面访问 user_id / user_name / monthly_limit / used_this_month / is_internal_team 等）。
 */
export interface TokenUser {
  user_id: string;
  user_name: string;
  user_email: string;
  monthly_limit: number;
  used_this_month: number;
  remaining: number;
  usage_percent: number;
  overage_tokens: number;
  overage_cost: number;
  total_used: number;
  is_internal_team: boolean;
}

/**
 * Token 订单记录（payment-settings 页面访问 amount / tokens / payment_method / status / created_at）。
 */
export interface TokenOrder {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  amount: number;
  tokens: number;
  payment_method: string;
  status: string;
  created_at: string;
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
  getSystemStats: () => getJson<SystemStats>('/admin/system/stats'),
  getSystemLogs: (page: number = 1, limit: number = 20) =>
    rawGetJson<PaginatedResponse<AuditLog>>(`/admin/system/logs${qs({ page, limit })}`),

  // ─── 爬虫管理 ───
  getCrawlerStatus: () => getJson<CrawlerStatus>('/admin/crawler/status'),
  triggerCrawler: () => postJson<unknown>('/admin/crawler/trigger'),
  updateCrawlerConfig: (intervalHours: number) =>
    putJson<unknown>('/admin/crawler/config', { intervalHours }),
  getCrawlerHistory: (limit: number = 20) =>
    rawGetJson<PaginatedResponse<CrawledAgent>>(`/admin/crawler/history${qs({ limit })}`),
  cleanOldAgents: (days: number) => postJson<unknown>('/admin/crawler/clean', { days }),

  // ─── 用户管理 ───
  getUserList: (page: number = 1, limit: number = 20, search?: string) =>
    rawGetJson<PaginatedResponse<User>>(`/admin/users${qs({ page, limit, search })}`),
  getUserStats: () => getJson<UserStats>('/admin/users/stats'),
  banUser: (userId: string, reason?: string) =>
    postJson<unknown>(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId: string) => postJson<unknown>(`/admin/users/${userId}/unban`),
  getUserSocialAccounts: (userId: string) =>
    rawGetJson<unknown>(`/admin/users/${userId}/social-accounts`),
  getUserSocialStats: () => getJson<unknown>('/admin/users/social-stats'),

  // ─── 项目管理 ───
  getProjectList: (page: number = 1, limit: number = 20, search?: string, status?: string) =>
    rawGetJson<PaginatedResponse<Project>>(`/admin/projects${qs({ page, limit, search, status })}`),
  getProjectStats: () => getJson<ProjectStats>('/admin/projects/stats'),
  reviewProject: (projectId: string, approved: boolean, notes?: string) =>
    postJson<unknown>(`/admin/projects/${projectId}/review`, { approved, notes }),
  suspendProject: (projectId: string, reason?: string) =>
    postJson<unknown>(`/admin/projects/${projectId}/suspend`, { reason }),
  restoreProject: (projectId: string) =>
    postJson<unknown>(`/admin/projects/${projectId}/restore`),

  // ─── 系统管理 ───
  getSystemHealth: () => getJson<SystemHealth>('/admin/system/health'),
  clearCache: () => postJson<unknown>('/admin/system/clear-cache'),
  backupDatabase: () => postJson<unknown>('/admin/system/backup'),

  // ─── AI 业务管理 ───
  getAgentList: (page: number = 1, limit: number = 20, search?: string) =>
    rawGetJson<PaginatedResponse<Agent>>(`/admin/agents${qs({ page, limit, search })}`),
  getAiTeamBuilds: () => rawGetJson<PaginatedResponse<BuildJob>>('/admin/virtual-companies/builds'),
  sendAnnouncement: (data: { title: string; message: string; priority?: string }) =>
    postJson<unknown>('/admin/notifications/announce', data),

  // ─── Token 配额管理 ───
  getTokenOverview: () => getJson<TokenOverview>('/admin/tokens/overview'),
  getTokenUsersList: (page: number = 1, limit: number = 20, search?: string) =>
    rawGetJson<PaginatedResponse<TokenUser>>(`/admin/tokens/users${qs({ page, limit, search })}`),
  getTokenUserDetail: (userId: string, page: number = 1, limit: number = 20, sourceType?: string) =>
    getJson<TokenUserDetail>(`/admin/tokens/users/${userId}${qs({ page, limit, sourceType })}`),
  getTokenConsumptionBreakdown: (period: 'day' | 'week' | 'month' = 'month') =>
    getJson<TokenConsumptionEntry[]>(`/admin/tokens/consumption-breakdown${qs({ period })}`),
  resetMonthlyQuotas: () => postJson<unknown>('/admin/tokens/reset-monthly'),
  toggleInternalTeam: (userId: string) =>
    putJson<unknown>(`/admin/tokens/internal-team/${userId}`),

  // ─── 支付配置管理 ───
  getDeveloperList: (page: number = 1, limit: number = 20, search?: string) =>
    rawGetJson<PaginatedResponse<DeveloperInfo>>(`/admin/developers${qs({ page, limit, search })}`),
  getPaymentConfigs: () => getJson<PaymentConfig[]>('/admin/payment-configs'),
  savePaymentConfig: (data: {
    provider: string;
    provider_label: string;
    qr_code_url?: string;
    account_name?: string;
    account_info?: string;
    sort_order?: number;
  }) => postJson<unknown>('/admin/payment-configs', data),
  togglePaymentConfig: (provider: string, enabled: boolean) =>
    postJson<unknown>(`/admin/payment-configs/${provider}/toggle`, { enabled }),

  // ─── Token 订单 ───
  getTokenOrders: (page: number = 1, limit: number = 20, status?: string) =>
    rawGetJson<PaginatedResponse<TokenOrder>>(`/admin/token-orders${qs({ page, limit, status })}`),
  confirmTokenOrder: (orderId: string) =>
    postJson<unknown>(`/admin/token-orders/${orderId}/confirm`),
  cancelTokenOrder: (orderId: string) =>
    postJson<unknown>(`/admin/token-orders/${orderId}/cancel`),
};
