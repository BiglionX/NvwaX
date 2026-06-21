'use client';

import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api/auth';

interface GitHubLoginButtonProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  redirectTo?: string;
  className?: string;
}

/**
 * GitHub 登录按钮组件
 * 
 * 功能：
 * - 点击按钮跳转 GitHub 授权页面
 * - 授权后自动处理回调
 * - 支持自定义成功/失败回调
 * 
 * 使用示例：
 * ```tsx
 * <GitHubLoginButton
 *   onSuccess={(data) => console.log('登录成功', data)}
 *   onError={(error) => console.error('登录失败', error)}
 *   redirectTo="/dashboard"
 * />
 * ```
 */
export function GitHubLoginButton({
  onSuccess,
  onError,
  redirectTo = '/dashboard',
  className = '',
}: GitHubLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 处理 GitHub OAuth 回调
  const handleCallback = useCallback(async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const redirectUri = `${window.location.origin}/api/auth/github/callback`;
      
      const result = await authApi.githubLogin(code, redirectUri);

      if (result.success && result.data) {
        // 保存 token 和用户信息
        localStorage.setItem('nvwax_token', result.data.token);
        localStorage.setItem('nvwax_user', JSON.stringify(result.data.user));

        // 调用成功回调
        if (onSuccess) {
          onSuccess(result.data);
        } else {
          // 默认行为：跳转到指定页面
          window.location.href = redirectTo;
        }
      } else {
        throw new Error(result.error?.message || 'GitHub 登录失败');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message || 'GitHub 登录失败';
      setError(errorMsg);
      
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [redirectTo, onSuccess, onError]);

  // 监听 URL 中的 code 参数（处理回调）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      setError(`GitHub 授权失败: ${error}`);
      // 清除 URL 中的错误参数
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      // 处理 GitHub 回调
      handleCallback(code);
      
      // 清除 URL 中的 code 参数
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [handleCallback]);

  // 发起 GitHub 授权
  const handleGitHubLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const redirectUri = `${window.location.origin}/api/auth/github/callback`;
      
      // 获取授权 URL
      const result = await authApi.githubAuthorize(redirectUri);

      if (result.success && result.data) {
        // 跳转到 GitHub 授权页面
        window.location.href = result.data.authorizeUrl;
      } else {
        throw new Error('获取授权 URL 失败');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message || '获取授权 URL 失败';
      setError(errorMsg);
      setIsLoading(false);
      
      if (onError) {
        onError(errorMsg);
      }
    }
  };

  return (
    <div className="github-login-container">
      <button
        onClick={handleGitHubLogin}
        disabled={isLoading}
        className={`github-login-button ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: '#24292e',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          width: '100%',
          transition: 'background-color 0.2s',
        }}
      >
        {isLoading ? (
          <>
            <SpinnerIcon />
            <span>登录中...</span>
          </>
        ) : (
          <>
            <GitHubIcon />
            <span>使用 GitHub 登录</span>
          </>
        )}
      </button>

      {error && (
        <div
          className="github-login-error"
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#fee',
            color: '#c00',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: '8px',
              background: 'none',
              border: 'none',
              color: '#c00',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * GitHub 图标组件
 */
function GitHubIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/**
 * 加载 spinner 图标
 */
function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        animation: 'spin 1s linear infinite',
      }}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="31.4 31.4"
        strokeLinecap="round"
      />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

export default GitHubLoginButton;
