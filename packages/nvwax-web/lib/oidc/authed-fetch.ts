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
