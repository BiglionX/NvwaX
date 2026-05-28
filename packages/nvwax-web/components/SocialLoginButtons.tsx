'use client';

/**
 * SocialLoginButtons 组件
 * 
 * 社交登录按钮组，用于登录页和注册页
 * 支持 Facebook 登录和微信登录（预留）
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/lib/api/auth';
import { Button, Divider } from '@/components/UI';

// Facebook 图标（SVG内联）
function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.0733C24 5.40541 18.6274 0 12 0C5.37258 0 0 5.40541 0 12.0733C0 18.0994 4.38823 23.0943 10.125 24V15.5633H7.07813V12.0733H10.125V9.41343C10.125 6.38755 11.9165 4.71615 14.6576 4.71615C15.9705 4.71615 17.3438 4.95195 17.3438 4.95195V7.92313H15.8306C14.3399 7.92313 13.875 8.85379 13.875 9.8086V12.0733H17.2031L16.6711 15.5633H13.875V24C19.6118 23.0943 24 18.0994 24 12.0733Z" fill="currentColor"/>
    </svg>
  );
}

// Google 图标（SVG内联）
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
      <path d="M12 23C14.97 23 17.46 21.98 19.28 20.34L15.71 17.57C14.73 18.22 13.45 18.62 12 18.62C9.12 18.62 6.68 16.67 5.81 14.08H2.13V16.92C3.93 20.46 7.62 23 12 23Z" fill="#34A853"/>
      <path d="M5.81 14.08C5.58 13.38 5.44 12.63 5.44 11.87C5.44 11.11 5.58 10.36 5.81 9.66V6.82H2.13C1.37 8.32 0.94 10 0.94 11.87C0.94 13.74 1.37 15.42 2.13 16.92L5.81 14.08Z" fill="#FBBC05"/>
      <path d="M12 5.12C13.58 5.12 15 5.69 16.09 6.72L19.35 3.46C17.44 1.68 14.96 0.75 12 0.75C7.62 0.75 3.93 3.29 2.13 6.82L5.81 9.66C6.68 7.07 9.12 5.12 12 5.12Z" fill="#EA4335"/>
    </svg>
  );
}

// 微信图标（SVG内联）
function WeChatIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.5 11C9.32843 11 10 10.3284 10 9.5C10 8.67157 9.32843 8 8.5 8C7.67157 8 7 8.67157 7 9.5C7 10.3284 7.67157 11 8.5 11Z" fill="currentColor"/>
      <path d="M15.5 11C16.3284 11 17 10.3284 17 9.5C17 8.67157 16.3284 8 15.5 8C14.6716 8 14 8.67157 14 9.5C14 10.3284 14.6716 11 15.5 11Z" fill="currentColor"/>
      <path d="M12 2C6.477 2 2 6.037 2 10.5C2 12.772 3.12 14.832 4.93 16.291L4.22 19L7.194 17.151C8.704 17.695 10.31 18 12 18C12.34 18 12.677 17.982 13.012 17.948C12.686 17.154 12.5 16.292 12.5 15.5C12.5 12.462 15.462 9.5 18.5 9.5C19.057 9.5 19.594 9.571 20.108 9.704C19.307 5.28 16.013 2 12 2Z" fill="currentColor" fillOpacity="0.9"/>
      <path d="M18.5 11C16.015 11 14 13.015 14 15.5C14 17.985 16.015 20 18.5 20C19.22 20 19.91 19.862 20.54 19.62L22 20.5L21.5 19.15C22.4 18.48 23 17.56 23 16.5C23 15.12 21.68 14 20 13.5C20.34 12.62 20.5 12 20.5 11C18.5 11 18.5 11 18.5 11Z" fill="currentColor" fillOpacity="0.6"/>
    </svg>
  );
}

export default function SocialLoginButtons() {
  const router = useRouter();
  const { login: setAuthState } = useAuth();
  const { facebookStatus, googleStatus, isLoggingIn, loginError, loginWithFacebook, loginWithGoogle } = useSocialAuth();
  const [wechatClicked, setWechatClicked] = useState(false);

  /**
   * Facebook 登录处理
   */
  const handleFacebookLogin = useCallback(async () => {
    try {
      const result = await loginWithFacebook();
      if (result.success && result.data) {
        setAuthState(result.data.token, result.data.user as User & { [key: string]: unknown });
        router.push('/profile');
      }
    } catch {
      // 错误已经由 useSocialAuth 处理并设置 loginError
    }
  }, [loginWithFacebook, setAuthState, router]);

  /**
   * Google 登录处理
   */
  const handleGoogleLogin = useCallback(async () => {
    try {
      const result = await loginWithGoogle();
      if (result.success && result.data) {
        setAuthState(result.data.token, result.data.user as User & { [key: string]: unknown });
        router.push('/profile');
      }
    } catch {
      // 错误已经由 useSocialAuth 处理并设置 loginError
    }
  }, [loginWithGoogle, setAuthState, router]);

  /**
   * 微信登录处理（预留）
   */
  const handleWechatLogin = useCallback(() => {
    setWechatClicked(true);
    setTimeout(() => setWechatClicked(false), 2000);
  }, []);

  const isFacebookDisabled = facebookStatus !== 'ready' || isLoggingIn;
  const isGoogleDisabled = googleStatus !== 'ready' || isLoggingIn;

  return (
    <div className="mt-6">
      <Divider className="mb-6">
        <span className="text-sm text-gray-400 dark:text-gray-500 px-3">
          其他登录方式
        </span>
      </Divider>

      <div className="flex flex-col gap-3">
        {/* Facebook 登录按钮 */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          fullWidth
          disabled={isFacebookDisabled || !!loginError}
          loading={isLoggingIn}
          onClick={handleFacebookLogin}
          className="!border-gray-300 dark:!border-gray-600 hover:!bg-blue-50 dark:hover:!bg-blue-900/20 hover:!border-blue-400 dark:hover:!border-blue-500 !text-gray-700 dark:!text-gray-300"
        >
          <FacebookIcon size={20} />
          <span className="ml-2">
            {isLoggingIn ? '登录中...' : 'Facebook 登录'}
          </span>
        </Button>

        {/* Google 登录按钮 */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          fullWidth
          disabled={isGoogleDisabled || !!loginError}
          loading={isLoggingIn}
          onClick={handleGoogleLogin}
          className="!border-gray-300 dark:!border-gray-600 hover:!bg-red-50 dark:hover:!bg-red-900/20 hover:!border-red-400 dark:hover:!border-red-500 !text-gray-700 dark:!text-gray-300"
        >
          <GoogleIcon size={20} />
          <span className="ml-2">
            {isLoggingIn ? '登录中...' : 'Google 登录'}
          </span>
        </Button>

        {/* 微信登录按钮（预留） */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          fullWidth
          disabled
          onClick={handleWechatLogin}
          className="!border-gray-200 dark:!border-gray-700 !text-gray-400 dark:!text-gray-500 !cursor-not-allowed !opacity-60"
        >
          <WeChatIcon size={20} />
          <span className="ml-2">
            {wechatClicked ? '即将上线，敬请期待' : '微信登录'}
          </span>
        </Button>
      </div>

      {/* 错误提示 */}
      {loginError && (
        <p className="mt-3 text-sm text-red-500 dark:text-red-400 text-center">
          {loginError}
        </p>
      )}

      {/* Facebook SDK 加载失败提示 */}
      {facebookStatus === 'error' && (
        <p className="mt-2 text-xs text-yellow-500 dark:text-yellow-400 text-center">
          Facebook SDK 加载失败，请刷新页面重试
        </p>
      )}
    </div>
  );
}
