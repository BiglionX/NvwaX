'use client';

/**
 * useSocialAuth Hook
 * 
 * 管理社交登录（Facebook、微信等）的客户端逻辑
 * 
 * 功能：
 * - 动态加载 Facebook SDK
 * - Facebook 登录（弹出授权窗口 → 获取 token → 发送到后端）
 * - 处理登录成功/失败状态
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { authApi, SocialLoginResponse } from '@/lib/api/auth';

// Google Identity Services 加载状态
type GoogleSdkStatus = 'loading' | 'ready' | 'error';

// Facebook SDK 加载状态
type FacebookSdkStatus = 'loading' | 'ready' | 'error';

// Facebook SDK 全局类型
declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; version: string; cookie?: boolean; xfbml?: boolean }) => void;
      login: (callback: (response: { authResponse?: { accessToken: string }; status: string }) => void, options?: { scope: string }) => void;
      getLoginStatus: (callback: (response: { status: string; authResponse?: { accessToken: string } }) => void) => void;
      api: (path: string, params: { fields: string }, callback: (response: Record<string, unknown>) => void) => void;
    };
    fbAsyncInit: () => void;
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (momentListener?: (moment: { type: string }) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export function useSocialAuth() {
  // Facebook
  const [facebookStatus, setFacebookStatus] = useState<FacebookSdkStatus>('loading');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const facebookAppId = useRef<string>('');

  // Google
  const [googleStatus, setGoogleStatus] = useState<GoogleSdkStatus>('loading');

  // 获取 Facebook App ID（从后端或环境变量）
  useEffect(() => {
    facebookAppId.current = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
  }, []);

  // 加载 Facebook SDK
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId) {
      setFacebookStatus('error');
      return;
    }

    // 如果 SDK 已经加载
    if (window.FB) {
      window.FB.init({ appId, version: 'v19.0' });
      setFacebookStatus('ready');
      return;
    }

    // 设置初始化回调
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, version: 'v19.0', cookie: true });
      setFacebookStatus('ready');
    };

    // 加载 SDK 脚本
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/zh_CN/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      console.error('[SocialAuth] Failed to load Facebook SDK');
      setFacebookStatus('error');
    };
    document.body.appendChild(script);

    return () => {
      // 清理脚本
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  /**
   * Facebook 登录
   * 
   * 流程：
   * 1. 调用 FB.login() 弹出授权窗口
   * 2. 获取 access token
   * 3. 发送到后端验证并获取 JWT
   * 4. 返回登录结果
   */
  const loginWithFacebook = useCallback(async (): Promise<SocialLoginResponse> => {
    setIsLoggingIn(true);
    setLoginError(null);

    return new Promise((resolve, reject) => {
      if (!window.FB || facebookStatus !== 'ready') {
        const error = { success: false as const, error: { code: 'SDK_NOT_READY', message: 'Facebook SDK 尚未加载完成' } };
        setLoginError('Facebook SDK 加载中，请稍后再试');
        setIsLoggingIn(false);
        reject(error);
        return;
      }

      window.FB.login(async (response) => {
        if (!response.authResponse) {
          setIsLoggingIn(false);
          const error = { success: false as const, error: { code: 'USER_CANCELLED', message: '已取消 Facebook 登录' } };
          setLoginError('已取消登录');
          reject(error);
          return;
        }

        try {
          const accessToken = response.authResponse.accessToken;
          const result = await authApi.facebookLogin(accessToken);

          if (result.success && result.data) {
            // 保存 token 和用户信息
            localStorage.setItem('user_token', result.data.token);
            localStorage.setItem('user_info', JSON.stringify(result.data.user));
            setIsLoggingIn(false);
            resolve(result);
          } else {
            const errorMsg = result.error?.message || 'Facebook 登录失败';
            setLoginError(errorMsg);
            setIsLoggingIn(false);
            reject(result);
          }
        } catch (err: unknown) {
          const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
          const msg = axiosError?.response?.data?.error?.message || 'Facebook 登录失败';
          setLoginError(msg);
          setIsLoggingIn(false);
          reject(err);
        }
      }, { scope: 'public_profile,email' });
    });
  }, [facebookStatus]);

  // 加载 Google Identity Services SDK
  useEffect(() => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      setGoogleStatus('error');
      return;
    }

    // 如果 SDK 已经加载
    if (window.google?.accounts?.id) {
      setGoogleStatus('ready');
      return;
    }

    // 加载 GIS SDK 脚本
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleStatus('ready');
    };
    script.onerror = () => {
      console.error('[SocialAuth] Failed to load Google Identity Services SDK');
      setGoogleStatus('error');
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  /**
   * Google 登录
   *
   * 流程：
   * 1. 初始化 Google 一键登录
   * 2. 弹出 Google 授权窗口
   * 3. 获取 credential (ID Token)
   * 4. 发送到后端验证并获取 JWT
   */
  const loginWithGoogle = useCallback(async (): Promise<SocialLoginResponse> => {
    setIsLoggingIn(true);
    setLoginError(null);

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId || !window.google?.accounts?.id) {
      setIsLoggingIn(false);
      const error = { success: false as const, error: { code: 'GOOGLE_SDK_NOT_READY', message: 'Google SDK 尚未加载完成' } };
      setLoginError('Google SDK 加载中，请稍后再试');
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      // 初始化 Google 一键登录
      window.google!.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setIsLoggingIn(false);
            const error = { success: false as const, error: { code: 'GOOGLE_NO_CREDENTIAL', message: '未获取到 Google 登录凭证' } };
            setLoginError('Google 登录失败，请重试');
            reject(error);
            return;
          }

          try {
            const result = await authApi.googleLogin(response.credential);

            if (result.success && result.data) {
              localStorage.setItem('user_token', result.data.token);
              localStorage.setItem('user_info', JSON.stringify(result.data.user));
              setIsLoggingIn(false);
              resolve(result);
            } else {
              const errorMsg = result.error?.message || 'Google 登录失败';
              setLoginError(errorMsg);
              setIsLoggingIn(false);
              reject(result);
            }
          } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
            const msg = axiosError?.response?.data?.error?.message || 'Google 登录失败';
            setLoginError(msg);
            setIsLoggingIn(false);
            reject(err);
          }
        },
        cancel_on_tap_outside: false
      });

      // 弹出 Google 一键登录窗口
      window.google!.accounts.id.prompt((notification) => {
        if (notification.type === 'skipped' || notification.type === 'dismissed') {
          setIsLoggingIn(false);
          const error = { success: false as const, error: { code: 'GOOGLE_CANCELLED', message: '已取消 Google 登录' } };
          setLoginError('已取消登录');
          reject(error);
        }
      });
    });
  }, []);

  /**
   * 清除登录错误
   */
  const clearError = useCallback(() => {
    setLoginError(null);
  }, []);

  return {
    facebookStatus,
    googleStatus,
    isLoggingIn,
    loginError,
    loginWithFacebook,
    loginWithGoogle,
    clearError
  };
}
