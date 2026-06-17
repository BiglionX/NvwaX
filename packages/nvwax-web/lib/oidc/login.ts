/**
 * 浏览器侧 OIDC 登录触发器（Sprint 2.2）
 *
 * 流程：
 *   1. 生成 code_verifier / code_challenge / state / nonce
 *   2. PKCE 一次性数据存 sessionStorage（关闭浏览器即销毁，最小暴露面）
 *   3. window.location.href 跳 IdP /oauth/authorize
 *
 * 配合 lib/oidc/callback.ts 在 /oauth/callback 路由消费 code + state。
 */

import { generateCodeVerifier, deriveCodeChallenge, generateState, generateNonce } from './pkce';
import { buildAuthorizationUrl } from './client';

const PKCE_STORAGE_KEY = 'oidc.pkce';

interface PkcePendingState {
  codeVerifier: string;
  state: string;
  nonce: string;
  returnTo: string;
  createdAt: number;
}

function safeSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isSafeReturnTo(value: string): boolean {
  // 仅允许同源相对路径，避免 open redirect
  if (!value) return false;
  if (value.startsWith('//')) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const u = new URL(value);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

function normalizeReturnTo(value: string | undefined | null): string {
  if (!value) return '/';
  // sessionStorage 里可能存的是被 encode 过的（来自 buildAuthorizationUrl）
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * 启动 OIDC 登录。
 * @param returnTo 登录成功后回跳路径（同源相对路径或完整 URL），默认 '/'
 */
export async function startLogin(returnTo: string = '/'): Promise<void> {
  console.log('[oidc] startLogin called with returnTo=', returnTo);
  if (typeof window === 'undefined') {
    throw new Error('[oidc] startLogin must be called in browser');
  }
  const safeReturn = isSafeReturnTo(returnTo) ? returnTo : '/';

  const codeVerifier = generateCodeVerifier();
  console.log('[oidc] codeVerifier generated, length=', codeVerifier.length);
  const codeChallenge = await deriveCodeChallenge(codeVerifier);
  console.log('[oidc] codeChallenge derived');
  const state = generateState();
  const nonce = generateNonce();

  const storage = safeSessionStorage();
  if (!storage) {
    throw new Error('[oidc] sessionStorage is not available');
  }
  const pending: PkcePendingState = {
    codeVerifier,
    state,
    nonce,
    returnTo: safeReturn,
    createdAt: Date.now(),
  };
  storage.setItem(PKCE_STORAGE_KEY, JSON.stringify(pending));
  console.log('[oidc] sessionStorage set, navigating to IdP');

  const url = buildAuthorizationUrl({
    state,
    nonce,
    codeChallenge,
    returnTo: safeReturn,
  });
  console.log('[oidc] startLogin navigating to:', url);
  // 直接调 assign 而非赋值 href —— 在 React 19 + headless Chromium 场景下
  // `window.location.href = url` 在 React onClick 异步微任务中可能被 React 调度吞掉，
  // 改用 window.location.assign 是显式 navigation API，行为更稳定。
  window.location.assign(url);
  console.log('[oidc] startLogin navigation dispatched');
}

/**
 * 读出并清空 pending PKCE 状态。
 * callback 页调用：state 校验通过后取 code_verifier 去换 token。
 */
export function consumePendingPkce(): PkcePendingState | null {
  const storage = safeSessionStorage();
  if (!storage) return null;
  const raw = storage.getItem(PKCE_STORAGE_KEY);
  if (!raw) return null;
  storage.removeItem(PKCE_STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as PkcePendingState;
    // 超过 10 分钟的 pending 状态作废（防 stale state）
    if (Date.now() - parsed.createdAt > 10 * 60 * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export { normalizeReturnTo, isSafeReturnTo, PKCE_STORAGE_KEY };
export type { PkcePendingState };
