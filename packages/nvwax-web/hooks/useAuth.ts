/**
 * useAuth — Sprint 2.2 重写
 *
 * 数据源：/api/auth/session（OIDC session cookie）
 * 状态：isLoggedIn / userInfo / loading
 *
 * API 兼容性：
 *   - isLoggedIn: boolean
 *   - userInfo: { id?, email?, name?, ... } | null
 *   - loading: boolean
 *   - login(returnTo?: string): 触发 OIDC 跳转
 *   - logout(): 清 cookie + 跳 IdP 撤销
 *   - refresh(): 重新拉取 session（用于跨标签页同步或 refresh 后回调）
 *   - getToken(): 兼容旧 API，返回 null（token 走 httpOnly cookie，业务请用 authedFetch）
 *
 * 与旧实现的差异：
 *   - 不再使用 localStorage（XSS 安全）
 *   - 不再存 access_token（cookie 加密 + API Route 代理）
 *   - 跨标签页用 storage 事件触发 /api/auth/session 轮询
 */

import { useCallback, useEffect, useState } from 'react';
import { startLogin as oidcStartLogin } from '@/lib/oidc/login';
import { buildEndSessionUrl } from '@/lib/oidc/client';

interface UserInfo {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: unknown;
}

interface UseAuthReturn {
  isLoggedIn: boolean;
  userInfo: UserInfo | null;
  loading: boolean;
  /** 触发 OIDC 授权码流程（PKCE） */
  login: (returnTo?: string) => Promise<void>;
  /** 清 session + 跳 IdP 登出 */
  logout: () => Promise<void>;
  /** 重新从 /api/auth/session 拉 session 状态 */
  refresh: () => Promise<void>;
  /**
   * 旧 API 兼容 — 始终返回 null。
   * access_token 走 httpOnly cookie，前端无法直接获取。
   * 需要鉴权 fetch 请使用 authedFetch（lib/oidc/authed-fetch.ts）。
   */
  getToken: () => string | null;
}

export function useAuth(): UseAuthReturn {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (res.status === 401) {
        setIsLoggedIn(false);
        setUserInfo(null);
        return;
      }
      if (!res.ok) {
        setIsLoggedIn(false);
        setUserInfo(null);
        return;
      }
      const data = (await res.json()) as {
        isLoggedIn: boolean;
        userInfo: UserInfo | null;
        expiresAt: number | null;
      };
      setIsLoggedIn(!!data.isLoggedIn);
      setUserInfo(data.userInfo ?? null);
    } catch (err) {
      // 网络错误：保守设为未登录
      // eslint-disable-next-line no-console
      console.error('[useAuth] refresh failed:', err);
      setIsLoggedIn(false);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初次加载 + 跨标签页同步
  useEffect(() => {
    refresh();

    const onStorage = (e: StorageEvent) => {
      // sessionStorage 的 PKCE pending 状态变化触发刷新（用户在另一标签完成登录）
      if (e.key === 'oidc.pkce' || e.key === null) {
        refresh();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  // 页面重新可见时刷新（处理另一标签完成登录/登出）
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refresh]);

  const login = useCallback(async (returnTo: string = '/'): Promise<void> => {
    await oidcStartLogin(returnTo);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      // 先取 refresh_token 撤销
      const me = await fetch('/api/auth/session', { credentials: 'same-origin' });
      let refreshToken: string | undefined;
      if (me.ok) {
        const data = (await me.json()) as { isLoggedIn: boolean };
        if (data.isLoggedIn) {
          // 调 API Route 拿 refresh_token（API Route 读 cookie 解密）
          const tokRes = await fetch('/api/auth/token', { credentials: 'same-origin' });
          if (tokRes.ok) {
            const tok = (await tokRes.json()) as { refreshToken?: string };
            refreshToken = tok.refreshToken;
          }
        }
      }
      await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' });
      if (refreshToken) {
        // 后端 API Route 帮我们调 IdP /oauth/logout
        await fetch('/api/auth/logout-remote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          credentials: 'same-origin',
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[useAuth] logout failed:', err);
    } finally {
      setIsLoggedIn(false);
      setUserInfo(null);
      // 跳 IdP 撤销 end_session（带 post_logout_redirect_uri 跳回首页）
      if (typeof window !== 'undefined') {
        window.location.href = buildEndSessionUrl();
      }
    }
  }, []);

  // 旧 API 兼容 — 始终返回 null
  const getToken = useCallback((): string | null => {
    return null;
  }, []);

  return { isLoggedIn, userInfo, loading, login, logout, refresh, getToken };
}
