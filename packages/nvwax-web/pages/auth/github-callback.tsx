import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authApi } from '@/lib/api/auth';

/**
 * GitHub OAuth 回调页面
 * 
 * 处理 GitHub 授权后的回调，完成登录流程
 */
function GitHubCallbackPage() {
  const router = useRouter();
  const { code, error, state } = router.query;
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('正在处理 GitHub 登录...');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    // 等待 router 准备就绪
    if (!router.isReady) return;

    // 处理 GitHub 返回的错误
    if (error) {
      setStatus('error');
      setMessage('GitHub 授权失败');
      setErrorDetails(getErrorMessage(error as string));
      return;
    }

    // 处理授权 code
    if (code && typeof code === 'string') {
      handleGitHubCallback(code);
    } else {
      setStatus('error');
      setMessage('无效的回调参数');
      setErrorDetails('未收到授权码 (code)');
    }
  }, [router.isReady, code, error]);

  /**
   * 处理 GitHub OAuth 回调
   */
  const handleGitHubCallback = async (authorizationCode: string) => {
    try {
      setStatus('processing');
      setMessage('正在验证授权码...');

      // 构建回调地址（必须与发起授权时一致）
      const redirectUri = `${window.location.origin}/api/auth/github/callback`;

      // 调用后端 API 完成登录
      const result = await authApi.githubLogin(authorizationCode, redirectUri);

      if (result.success && result.data) {
        // 登录成功
        setStatus('success');
        setMessage(result.data.isNewUser ? '注册成功！正在跳转...' : '登录成功！正在跳转...');

        // 保存用户信息（可选，建议后端使用 httpOnly cookie）
        if (result.data.token) {
          localStorage.setItem('nvwax_token', result.data.token);
        }
        if (result.data.user) {
          localStorage.setItem('nvwax_user', JSON.stringify(result.data.user));
        }

        // 跳转到首页或返回页
        const returnTo = localStorage.getItem('github_return_to') || '/dashboard';
        localStorage.removeItem('github_return_to');

        setTimeout(() => {
          router.push(returnTo);
        }, 1000);
      } else {
        // 登录失败
        throw new Error(result.error?.message || 'GitHub 登录失败');
      }
    } catch (err: any) {
      console.error('[GitHub Callback] Login failed:', err);
      
      setStatus('error');
      setMessage('登录失败');
      
      // 提取错误信息
      const errorMsg = err.response?.data?.error?.message 
        || err.message 
        || '未知错误';
      setErrorDetails(errorMsg);
    }
  };

  /**
   * 获取用户友好的错误信息
   */
  const getErrorMessage = (error: string): string => {
    switch (error) {
      case 'access_denied':
        return '您拒绝了 GitHub 授权请求';
      case 'redirect_uri_mismatch':
        return '回调地址不匹配，请联系管理员';
      default:
        return `授权失败: ${error}`;
    }
  };

  /**
   * 重试登录
   */
  const handleRetry = () => {
    router.push('/login');
  };

  return (
    <>
      <Head>
        <title>GitHub 登录 - NvwaX</title>
        <meta name="description" content="正在处理 GitHub 登录" />
      </Head>

      <div style={styles.container}>
        <div style={styles.card}>
          {/* Logo */}
          <div style={styles.logo}>
            <GitHubLogo />
          </div>

          {/* 标题 */}
          <h1 style={styles.title}>
            {status === 'processing' && '正在登录'}
            {status === 'success' && '登录成功'}
            {status === 'error' && '登录失败'}
          </h1>

          {/* 状态图标 */}
          <div style={styles.statusIcon}>
            {status === 'processing' && <LoadingSpinner />}
            {status === 'success' && <SuccessIcon />}
            {status === 'error' && <ErrorIcon />}
          </div>

          {/* 消息 */}
          <p style={styles.message}>{message}</p>

          {/* 错误详情 */}
          {status === 'error' && errorDetails && (
            <div style={styles.errorDetails}>
              <p>{errorDetails}</p>
              <button onClick={handleRetry} style={styles.retryButton}>
                返回登录页
              </button>
            </div>
          )}

          {/* 成功提示 */}
          {status === 'success' && (
            <div style={styles.successDetails}>
              <p>正在跳转到首页...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * GitHub Logo 组件
 */
function GitHubLogo() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 16 16"
      fill="#24292e"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/**
 * 加载 Spinner 组件
 */
function LoadingSpinner() {
  return (
    <div style={styles.spinner}>
      <div style={styles.spinnerInner}></div>
    </div>
  );
}

/**
 * 成功图标组件
 */
function SuccessIcon() {
  return (
    <div style={{ ...styles.statusIconInner, backgroundColor: '#10b981' }}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

/**
 * 错误图标组件
 */
function ErrorIcon() {
  return (
    <div style={{ ...styles.statusIconInner, backgroundColor: '#ef4444' }}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
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
    textAlign: 'center',
  },
  logo: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '16px',
  },
  statusIcon: {
    marginBottom: '24px',
  },
  statusIconInner: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  errorDetails: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
  },
  successDetails: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
  },
  retryButton: {
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: '#24292e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  spinner: {
    width: '64px',
    height: '64px',
    margin: '0 auto',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #24292e',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  spinnerInner: {
    width: '0',
    height: '0',
  },
};

export default GitHubCallbackPage;
