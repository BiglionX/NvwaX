'use client';

/**
 * Sprint 2.12 — 统一登录模块 social auth 按钮
 *
 * Google：动态加载 Google Identity Services (GIS) SDK，renderButton + decodeCredential
 *   拿到 credential (Google ID Token JWT) 后 POST 到 /api/portal/social/google
 *   backend 验签 + find/create user + 签 pc_session → 返回 redirectTo → window.location.assign
 *
 * GitHub：直接 window.location.href 跳到 /api/portal/social/github/start?redirectTo=X
 *   backend 302 GitHub → 用户授权 → GitHub 302 /api/portal/social/github/callback
 *   → backend 签 pc_session → 302 回 redirectTo（带 social_success 参数）
 *
 * Facebook / 微信：暂未启用，仅显示文案占位
 *
 * redirectTo 来源：URL ?redirectTo= 参数（OIDC authorize 链路）或父组件 props 注入
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, translate } from '@/lib/i18n';

// Google GIS SDK 全局类型（避免引入 @types/google.accounts）
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void; auto_select?: boolean; itp_support?: boolean }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
            },
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GIS_SCRIPT_ID = 'pc-gis-client-script';

function loadGisScript(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'));
    if (window.google?.accounts?.id) return resolve();
    if (document.getElementById(GIS_SCRIPT_ID)) {
      // 已在加载中，等 onload
      const existing = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement;
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GIS script load failed')));
      return;
    }
    const s = document.createElement('script');
    s.id = GIS_SCRIPT_ID;
    s.src = `${GIS_SCRIPT_SRC}?client_id=${encodeURIComponent(clientId)}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('GIS script load failed'));
    document.head.appendChild(s);
  });
}

export type SocialButtonsProps = {
  /** 从 URL ?redirectTo= 读取，或父组件注入 */
  redirectTo?: string;
  /** 成功后跳转（默认 = 后端返回的 redirectTo） */
  onSuccess?: (info: { provider: string; redirectTo: string; isNewUser: boolean }) => void;
  /** 失败回调（用于顶部错误提示） */
  onError?: (message: string) => void;
};

export function SocialButtons({ redirectTo, onSuccess, onError }: SocialButtonsProps) {
  const locale = useLocale();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

  // 动态加载 GIS SDK
  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;
    loadGisScript(googleClientId)
      .then(() => {
        if (cancelled) return;
        setGoogleReady(true);
      })
      .catch((err) => {
        console.warn('[SocialButtons] GIS load failed:', err);
        if (onError) onError(translate(locale, 'social.error.generic'));
      });
    return () => {
      cancelled = true;
    };
  }, [googleClientId, locale, onError]);

  // 渲染 Google 按钮 + 绑定 callback
  useEffect(() => {
    if (!googleReady || !googleClientId || !googleBtnRef.current || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (resp) => {
        try {
          const r = await fetch('/api/portal/social/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // 必须，让 pc_session cookie 写入
            body: JSON.stringify({ credential: resp.credential, redirectTo: redirectTo ?? '/portal/' }),
          });
          const json = await r.json();
          if (!r.ok || !json.success) {
            const msg = json?.error?.message ?? translate(locale, 'social.error.generic');
            if (onError) onError(msg);
            return;
          }
          const data = json.data as { ok: true; redirectTo: string; isNewUser: boolean; provider: string };
          if (onSuccess) {
            onSuccess({ provider: data.provider, redirectTo: data.redirectTo, isNewUser: data.isNewUser });
          } else {
            window.location.assign(data.redirectTo);
          }
        } catch (err) {
          console.error('[SocialButtons] Google sign-in failed:', err);
          if (onError) onError(translate(locale, 'social.error.generic'));
        }
      },
      itp_support: true,
    });

    if (googleBtnRef.current) {
      googleBtnRef.current.innerHTML = ''; // 防止多次渲染
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320,
      });
    }
  }, [googleReady, googleClientId, locale, redirectTo, onError, onSuccess]);

  const handleGithub = useCallback(() => {
    setGithubBusy(true);
    const url = `/api/portal/social/github/start?redirectTo=${encodeURIComponent(redirectTo ?? '/portal/')}`;
    window.location.assign(url);
  }, [redirectTo]);

  return (
    <div className="pc-social" data-testid="social-buttons">
      <div className="pc-social__divider" data-testid="social-divider">
        <span>{translate(locale, 'social.divider')}</span>
      </div>

      {/* Google — GIS 渲染 */}
      {googleClientId ? (
        <div ref={googleBtnRef} className="pc-social__google" data-testid="social-google-btn" />
      ) : (
        <button type="button" className="pc-social__btn pc-social__btn--google" disabled>
          {translate(locale, 'social.google')}
        </button>
      )}

      {/* GitHub — 直接跳转 */}
      <button
        type="button"
        className="pc-social__btn pc-social__btn--github"
        onClick={handleGithub}
        disabled={githubBusy}
        data-testid="social-github-btn"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.03c-3.2.7-3.87-1.37-3.87-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.19 1.78 1.19 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.27-5.23-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.03 0 0 .97-.31 3.17 1.17.92-.26 1.9-.39 2.88-.39s1.96.13 2.88.39c2.2-1.48 3.17-1.17 3.17-1.17.62 1.58.23 2.74.11 3.03.73.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.37-5.25 5.65.41.35.78 1.04.78 2.09v3.1c0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"
          />
        </svg>
        <span>{githubBusy ? translate(locale, 'common.loading') : translate(locale, 'social.github')}</span>
      </button>

      {/* Facebook / 微信 占位（暂未启用） */}
      <button type="button" className="pc-social__btn pc-social__btn--facebook" disabled aria-disabled="true">
        {translate(locale, 'social.facebook')}
      </button>
      <button type="button" className="pc-social__btn pc-social__btn--wechat" disabled aria-disabled="true">
        {translate(locale, 'social.wechat')}
      </button>
    </div>
  );
}

export default SocialButtons;