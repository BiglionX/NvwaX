'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authApi } from '@/lib/api/auth';
import { adminApi } from '@/lib/api/admin';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Card, Input, Button, Alert, Space } from '@/components/UI';

// 将使用 useSearchParams 的逻辑提取到单独组件
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const { login: setAuthState, isLoggedIn, loading, userInfo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    if (loginLoading || justLoggedIn) return;
    if (typeof window !== 'undefined' && localStorage.getItem('admin_token')) {
      return;
    }
    const adminEmails = ['1055603323@qq.com', 'admin@admin.com'];
    if (userInfo && (adminEmails.includes(userInfo.email?.toLowerCase() || '') || userInfo.email?.endsWith('@admin.com'))) {
      return;
    }
    if (!loading && isLoggedIn) {
      const redirect = searchParams.get('redirect') || '/profile';
      router.replace(redirect);
    }
  }, [isLoggedIn, loading, loginLoading, justLoggedIn, router, searchParams, userInfo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);

    try {
      const adminEmails = ['1055603323@qq.com', 'admin@admin.com'];
      const isAdmin = adminEmails.includes(email.toLowerCase()) || email.toLowerCase().endsWith('@admin.com');

      if (isAdmin) {
        const username = email;
        const adminResponse = await adminApi.login(username, password);
        localStorage.setItem('admin_token', adminResponse.data.token);
        localStorage.setItem('admin_info', JSON.stringify(adminResponse.data.admin));
        localStorage.setItem('user_token', adminResponse.data.token);
        localStorage.setItem('user_info', JSON.stringify({
          id: adminResponse.data.admin.id,
          email: adminResponse.data.admin.email,
          name: adminResponse.data.admin.username || adminResponse.data.admin.email,
          role: 'admin',
          isAdmin: true
        }));
        setJustLoggedIn(true);
        setTimeout(() => {
          window.location.replace('/admin/dashboard');
        }, 100);
      } else {
        const response = await authApi.login(email, password);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_info');
        localStorage.setItem('user_token', response.data.token);
        localStorage.setItem('user_info', JSON.stringify(response.data.user));
        setAuthState(response.data.token, {
          id: response.data.user.id,
          email: response.data.user.email,
          name: response.data.user.name
        });
        setJustLoggedIn(true);
        requestAnimationFrame(() => {
          router.push('/profile');
          setTimeout(() => setJustLoggedIn(false), 500);
        });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string }; status?: number }; request?: unknown; message?: string };
      let errorMessage = t('loginTitle') === 'Login to NvwaX'
        ? 'Login failed, please check your email and password'
        : '登录失败，请检查邮箱和密码';

      if (error.response) {
        errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Unable to connect to server';
      } else {
        errorMessage = error.message || 'Login request failed';
      }
      setError(errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card padding="lg" shadow>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-blue-500 to-blue-700 rounded-2xl mb-4">
              <Mail className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('loginTitle')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('emailPlaceholder')}
            </p>
          </div>

          {error && (
            <Alert
              type="error"
              message={error}
              closable
              onClose={() => setError('')}
              className="mb-6"
            />
          )}

          <form onSubmit={handleLogin}>
            <Space direction="vertical" size="middle" className="w-full">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                label={t('email')}
                placeholder={t('emailPlaceholder')}
                prefix={<Mail size={20} />}
                required
              />

              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                label={t('password')}
                placeholder="••••••••"
                prefix={<Lock size={20} />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                }
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loginLoading}
                rightIcon={!loginLoading ? <ArrowRight size={20} /> : undefined}
              >
                {loginLoading ? tc('loading') : t('loginNow')}
              </Button>
            </Space>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {t('noAccount')}{' '}
              <Link
                href="/register"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {t('registerNow')}
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {tc('back')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function LoginClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{'Loading...'}</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
