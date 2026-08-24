/**
 * authedFetch — 浏览器侧代发 API 请求（Sprint 2.2）
 *
 * access_token 存于 httpOnly cookie，前端 JS 拿不到。
 * 业务组件 / axios interceptor 想要带 Bearer 头时，调用本工具走 API Route 代理：
 *   - 前端发起 fetch('/api/auth/proxy?path=...')
 *   - API Route 读 cookie 解密 → 注入 Authorization 头 → 转发到 nvwax-server
 *
 * 用法：
 *   import { authedFetch } from '@/lib/oidc/authed-fetch';
 *   const res = await authedFetch('/api/users/me');
 *   const data = await res.json();
 */

export interface AuthedFetchOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: BodyInit | null;
  headers?: HeadersInit;
}

const PROXY_PATH = '/api/auth/proxy';

export async function authedFetch(
  upstreamPath: string,
  options: AuthedFetchOptions = {},
): Promise<Response> {
  const url = `${PROXY_PATH}?path=${encodeURIComponent(upstreamPath)}`;
  return fetch(url, {
    ...options,
    credentials: 'same-origin',
  });
}

/**
 * 把 params 对象序列化为查询字符串（?a=b&c=d）。
 * - 丢弃 undefined / null / 空字符串
 * - 数组以逗号连接（与后端多值参数约定一致）
 * - 无有效参数时返回空字符串
 */
export function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(','));
    } else {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** 从后端错误响应中提取可读错误信息 */
function extractErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const err = d.error;
    if (typeof err === 'string' && err) return err;
    if (err && typeof err === 'object') {
      const msg = (err as Record<string, unknown>).message;
      if (typeof msg === 'string' && msg) return msg;
    }
    if (typeof d.message === 'string' && d.message) return d.message;
  }
  return fallback;
}

/**
 * 带鉴权的 JSON 请求助手：authedFetch + 自动解析 + 非 2xx 抛错。
 * 返回后端完整响应体（如 { success, data, error }），保持与调用方既有契约一致。
 */
export async function authedJson<T = Record<string, unknown>>(
  upstreamPath: string,
  options: AuthedFetchOptions = {},
): Promise<T> {
  const res = await authedFetch(upstreamPath, options);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = undefined;
  }
  if (!res.ok) {
    const err = new Error(extractErrorMessage(data, `请求失败（${res.status}）`)) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return data as T;
}
