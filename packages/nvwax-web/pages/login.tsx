import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { GitHubLoginButton } from '@/components/auth/GitHubLoginButton';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import Link from 'next/link';

/**
 * 登录页面
 * 
 * 支持多种登录方式：
 * - 邮箱 + 密码登录
 * - GitHub 社交登录
 * - Google 社交登录
 * - Facebook 社交登录（预留）
 */
function LoginPage() {
  const router = useRouter();
  const { error: oauthError } = router.query;
  
  // 邮箱登录表单
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Google 登录 Hook
  const {
    googleStatus,
    isLoggingIn: isGoogleLoggingIn,
    loginError: googleError,
    loginWithGoogle,
    clearError: clearGoogleError,
  } = useSocialAuth();

  /**
   * 处理邮箱登录
   */
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    try {
      // 调用后端登录 API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // 登录成功
        localStorage.setItem('nvwax_token', data.data.token);
        localStorage.setItem('nvwax_user', JSON.stringify(data.data.user));
        router.push('/dashboard');
      } else {
        throw new Error(data.error?.message || '登录失败');
      }
    } catch (err: any) {
      setLoginError(err.message || '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理 Google 登录
   */
  const handleGoogleLogin = async () => {
    try {
      clearGoogleError();
      const result = await loginWithGoogle();
      
      if (result.success && result.data) {
        // 登录成功
        localStorage.setItem('nvwax_token', result.data.token);
        localStorage.setItem('nvwax_user', JSON.stringify(result.data.user));
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Google login failed:', err);
    }
  };

  return (
    <>
      <Head>
        <title>登录 - NvwaX</title>
        <meta name="description" content="登录到 NvwaX 平台" />
      </Head>

      <div style={styles.container}>
        <div style={styles.card}>
          {/* Logo 和标题 */}
          <div style={styles.header}>
            <h1 style={styles.title}>欢迎回来</h1>
            <p style={styles.subtitle}>登录到 NvwaX 平台</p>
          </div>

          {/* OAuth 错误提示 */}
          {oauthError && (
            <div style={styles.alertError}>
              <span>登录失败：{oauthError}</span>
            </div>
          )}

          {/* 社交登录按钮 */}
          <div style={styles.socialLogin}>
            {/* GitHub 登录 */}
            <GitHubLoginButton
              onSuccess={() => router.push('/dashboard')}
              onError={(error) => console.error('GitHub login failed:', error)}
              className="mb-3"
            />

            {/* Google 登录 */}
            <div style={styles.googleButtonContainer}>
              <GoogleLoginButton
                onClick={handleGoogleLogin}
                isLoading={isGoogleLoggingIn}
                disabled={googleStatus !== 'ready'}
                error={googleError}
              />
            </div>
          </div>

          {/* 分隔线 */}
          <div style={styles.divider}>
            <span style={styles.dividerText}>或使用邮箱登录</span>
          </div>

          {/* 邮箱登录表单 */}
          <form onSubmit={handleEmailLogin} style={styles.form}>
            {/* 邮箱输入 */}
            <div style={styles.formGroup}>
              <label htmlFor="email" style={styles.label}>
                邮箱地址
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                placeholder="you@example.com"
              />
            </div>

            {/* 密码输入 */}
            <div style={styles.formGroup}>
              <label htmlFor="password" style={styles.label}>
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
                placeholder="••••••••"
              />
            </div>

            {/* 错误提示 */}
            {loginError && (
              <div style={styles.alertError}>
                <span>{loginError}</span>
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...styles.submitButton,
                ...(isLoading ? styles.submitButtonDisabled : {}),
              }}
            >
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* 注册链接 */}
          <div style={styles.footer}>
            <p>
              还没有账号？{' '}
              <Link href="/register" style={styles.link}>
                立即注册
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Google 登录按钮组件
 */
function GoogleLoginButton({
  onClick,
  isLoading,
  disabled,
  error,
}: {
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
  error: string | null;
}) {
  return (
    <div>
      <button
        onClick={onClick}
        disabled={disabled || isLoading}
        style={{
          ...styles.googleButton,
          ...(disabled || isLoading ? styles.googleButtonDisabled : {}),
        }}
      >
        <GoogleIcon />
        <span>{isLoading ? '登录中...' : '使用 Google 登录'}</span>
      </button>

      {error && (
        <div style={styles.alertError}>
          <span>{error}</span>
          <button
            onClick={() => window.location.reload()}
            style={styles.alertClose}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Google 图标组件
 */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * 样式定义
 */
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '48px',
    maxWidth: '400px',
    width: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '30px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  socialLogin: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  googleButtonContainer: {
    width: '100%',
  },
  divider: {
    position: 'relative',
    margin: '24px 0',
    textAlign: 'center',
  },
  dividerText: {
    position: 'relative',
    backgroundColor: 'white',
    padding: '0 12px',
    color: '#6b7280',
    fontSize: '14px',
    zIndex: 1,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitButton: {
    padding: '10px 16px',
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '8px',
  },
  submitButtonDisabled: {
    backgroundColor: '#a5b4fc',
    cursor: 'not-allowed',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280',
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'none',
    fontWeight: 500,
  },
  alertError: {
    padding: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    color: '#dc2626',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertClose: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '18px',
    lineHeight: 1,
  },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.2s',
  },
  googleButtonDisabled: {
    backgroundColor: '#f9fafb',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
};

export default LoginPage;
