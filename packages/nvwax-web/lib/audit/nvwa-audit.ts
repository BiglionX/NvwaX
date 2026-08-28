/**
 * Nvwa 工作台前端审计模块（v2.3+）
 * ----------------------------------------------------------------
 * 用途：把 Nvwa 工作台的关键操作写到前端审计日志，便于：
 *   1. 浏览器控制台调试（[NvwaAudit] 前缀）
 *   2. sessionStorage 持久化（管理员页面将来可读取）
 *   3. 与后端 system_logs 表对应（user 级操作后端暂无审计，前端先记录）
 *
 * 设计原则：
 *   - 轻量：纯前端，无网络请求，无依赖
 *   - 失败安全：sessionStorage 不可用时不阻断主流程
 *   - 可扩展：将来后端 audit endpoint 就绪后可平滑迁移
 */

const STORAGE_KEY = 'nvwa-audit-log';
const MAX_ENTRIES = 200;

export type NvwaAuditLevel = 'info' | 'warning' | 'error';

export interface NvwaAuditEvent {
  /** ISO 时间戳 */
  timestamp: string;
  /** 简短操作标识（AGENT_CREATED / BLUEPRINT_DEPLOYED / AITEAM_CONFIRMED 等） */
  action: string;
  /** 详细描述 */
  details: string;
  /** 关联的资源 ID（agentId / blueprintId / sessionId / aiteamId） */
  resourceId?: string;
  /** 用户 ID（如果有） */
  userId?: string;
  /** 来源模块（nvwa-workbench / nvwa-blueprint-panel / etc.） */
  source?: string;
  /** 日志级别 */
  level: NvwaAuditLevel;
  /** 额外元数据 */
  meta?: Record<string, unknown>;
}

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    // 探测 sessionStorage 可用
    const probe = '__nvwa_probe__';
    window.sessionStorage.setItem(probe, '1');
    window.sessionStorage.removeItem(probe);
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * 记录一条审计事件。
 * - 始终输出到 console（含 [NvwaAudit] 前缀）
 * - 写入 sessionStorage（异步，非阻塞）
 */
export function recordAudit(
  action: string,
  details: string,
  options: {
    resourceId?: string;
    userId?: string;
    source?: string;
    level?: NvwaAuditLevel;
    meta?: Record<string, unknown>;
  } = {}
): NvwaAuditEvent {
  const event: NvwaAuditEvent = {
    timestamp: new Date().toISOString(),
    action,
    details,
    level: options.level ?? 'info',
    ...(options.resourceId !== undefined ? { resourceId: options.resourceId } : {}),
    ...(options.userId !== undefined ? { userId: options.userId } : {}),
    ...(options.source !== undefined ? { source: options.source } : {}),
    ...(options.meta !== undefined ? { meta: options.meta } : {}),
  };

  // 1. console 输出（生产/开发都能看到）
  const prefix = `[NvwaAudit] ${event.level.toUpperCase()}`;
  const payload = `${event.action} | ${event.details}${
    event.resourceId ? ` | resourceId=${event.resourceId}` : ''
  }`;
  if (event.level === 'error') {
    console.error(prefix, payload, event.meta ?? '');
  } else if (event.level === 'warning') {
    console.warn(prefix, payload, event.meta ?? '');
  } else {
    console.info(prefix, payload, event.meta ?? '');
  }

  // 2. sessionStorage 持久化（异步、不抛错）
  const storage = safeStorage();
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      const arr: NvwaAuditEvent[] = raw ? (JSON.parse(raw) as NvwaAuditEvent[]) : [];
      arr.push(event);
      // 限制最多 MAX_ENTRIES 条（FIFO 淘汰最早）
      while (arr.length > MAX_ENTRIES) arr.shift();
      storage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {
      /* ignore */
    }
  }

  // 3. v2.3+：fire-and-forget POST 到后端审计（不阻塞、不抛错）
  //    后端 /api/admin/system/logs → 写入 system_logs 表（带 user_id + source）
  pushToServer(event);

  return event;
}

/**
 * 把单条审计事件异步推送到后端（v2.3+）。
 * 设计原则：
 * - 不阻塞主流程（no await）
 * - 不抛错（fetch 失败仅 console.warn）
 * - 未登录用户也尝试推送（后端会用 req.user；失败 401 仅警告）
 * - 限制请求频率：5 秒内最多 1 个 in-flight 请求（避免 burst）
 */
const SERVER_ENDPOINT = '/api/admin/system/logs';
let inflightPush: Promise<void> | null = null;
let lastPushAt = 0;
const MIN_PUSH_INTERVAL_MS = 5000;

function pushToServer(event: NvwaAuditEvent): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (inflightPush || now - lastPushAt < MIN_PUSH_INTERVAL_MS) {
    // 节流：丢弃本次推送（sessionStorage 仍保留）
    return;
  }
  lastPushAt = now;
  inflightPush = (async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const url = baseURL.startsWith('http') ? `${baseURL.replace(/\/$/, '')}${SERVER_ENDPOINT}` : `${baseURL}${SERVER_ENDPOINT}`;
      await fetch(url, {
        method: 'POST',
        credentials: 'include', // 带 OIDC cookie
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: event.level,
          action: event.action,
          details: event.details,
          resourceId: event.resourceId,
          meta: event.meta,
          source: event.source ?? NVWA_AUDIT_SOURCE,
        }),
        keepalive: true, // 即使页面关闭也尽量送达
      });
    } catch (err) {
      // 后端未登录或网络故障——静默忽略（sessionStorage 仍是 source of truth）
      console.warn('[NvwaAudit] pushToServer failed (kept in sessionStorage):', err);
    } finally {
      inflightPush = null;
    }
  })();
}

/** 获取当前 session 的全部审计日志（最新在最后） */
export function getAuditLog(): NvwaAuditEvent[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NvwaAuditEvent[]) : [];
  } catch {
    return [];
  }
}

/** 清空当前 session 的审计日志 */
export function clearAuditLog(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 导出审计日志为 JSON 文件并触发浏览器下载。
 *
 * 文件名格式：`nvwa-audit-{timestamp}.json`
 * 文件结构：{ exportedAt, source, total, events: [...] }
 *
 * 必须在浏览器环境调用（依赖 Blob / URL.createObjectURL / DOM）。
 */
export function downloadAuditLog(): { filename: string; count: number } | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const events = getAuditLog();
  if (events.length === 0) return null;

  const payload = {
    exportedAt: new Date().toISOString(),
    source: NVWA_AUDIT_SOURCE,
    total: events.length,
    events,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const filename = `nvwa-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // 必须挂到 DOM 才能触发下载（Firefox）
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 释放对象 URL（下一个 tick，避免某些浏览器竞态）
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { filename, count: events.length };
}

/** 标准化的 Nvwa 操作标识常量（便于 admin 后台将来按 action 过滤） */
export const NvwaAuditAction = {
  AGENT_CREATED: 'AGENT_CREATED',
  AGENT_UPDATED: 'AGENT_UPDATED',
  AGENT_UPSERT_FAILED: 'AGENT_UPSERT_FAILED',
  BLUEPRINT_CREATED: 'BLUEPRINT_CREATED',
  BLUEPRINT_UPDATED: 'BLUEPRINT_UPDATED',
  BLUEPRINT_DEPLOYED: 'BLUEPRINT_DEPLOYED',
  BLUEPRINT_DEPLOY_FAILED: 'BLUEPRINT_DEPLOY_FAILED',
  AITEAM_SESSION_CREATED: 'AITEAM_SESSION_CREATED',
  AITEAM_SESSION_FAILED: 'AITEAM_SESSION_FAILED',
  AITEAM_CONFIRMED: 'AITEAM_CONFIRMED',
  AITEAM_CONFIRM_FAILED: 'AITEAM_CONFIRM_FAILED',
  AITEAM_EXPORTED: 'AITEAM_EXPORTED',
  AUDIT_EXPORTED: 'AUDIT_EXPORTED',
  SSE_CONNECTED: 'SSE_CONNECTED',
  SSE_DISCONNECTED: 'SSE_DISCONNECTED',
  SSE_ERROR: 'SSE_ERROR',
} as const;

export type NvwaAuditActionType = (typeof NvwaAuditAction)[keyof typeof NvwaAuditAction];

export const NVWA_AUDIT_SOURCE = 'nvwa-workbench';
