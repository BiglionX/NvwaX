'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import { adminApi } from '@/lib/api/admin';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Card, Input, Button, Alert, Space } from '@/components/UI';

// 将使用 useSearchParams 的逻辑提取到单独组件
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: setAuthState, isLoggedIn, loading, userInfo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false); // 标记是否刚刚完成登录

  // 普通用户已登录时才自动重定向，管理员登录由自己的逻辑处理
  useEffect(() => {
    if (loginLoading || justLoggedIn) return;
    
    // 检查是否有 admin_token，如果有说明是管理员，不执行此重定向
    if (typeof window !== 'undefined' && localStorage.getItem('admin_token')) {
      return;
    }
    
    // 检查是否是管理员，如果是则不执行此重定向
    const adminEmails = ['1055603323@qq.com', 'admin@admin.com'];
    if (userInfo && (adminEmails.includes(userInfo.email?.toLowerCase() || '') || userInfo.email?.endsWith('@admin.com'))) {
      return; // 管理员不走这里的重定向
    }
    
    if (!loading && isLoggedIn) {
      const redirect = searchParams.get('redirect') || '/profile';
      console.log('Already logged in, redirecting to:', redirect);
      router.replace(redirect);
    }
  }, [isLoggedIn, loading, loginLoading, justLoggedIn, router, searchParams, userInfo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);

    try {
      // 智能路由：判断是否为管理员邮箱
      const adminEmails = ['1055603323@qq.com', 'admin@admin.com']; // 管理员邮箱列表
      const isAdmin = adminEmails.includes(email.toLowerCase()) || email.toLowerCase().endsWith('@admin.com');
      
      console.log('[Login Page] Email:', email);
      console.log('[Login Page] Is admin?', isAdmin);
      
      if (isAdmin) {
        // 管理员登录：使用 admin API
        // 注意：管理员的 username 可能就是 email 地址
        // 从数据库来看，超级管理员的 username 是 "1055603323@qq.com"
        const username = email; // 直接使用 email 作为 username
        
        console.log('[Login Page] Admin login with username:', username);
        const adminResponse = await adminApi.login(username, password);
        console.log('[Login Page] Admin login response:', adminResponse);
        
        // 只保存 admin token 和 info（不要同时设置 user_token）
        localStorage.setItem('admin_token', adminResponse.data.token);
        localStorage.setItem('admin_info', JSON.stringify(adminResponse.data.admin));
        
        // 同时设置普通用户 token（兼容旧代码和通用组件如通知栏）
        localStorage.setItem('user_token', adminResponse.data.token);
        localStorage.setItem('user_info', JSON.stringify({
          id: adminResponse.data.admin.id,
          email: adminResponse.data.admin.email,
          name: adminResponse.data.admin.username || adminResponse.data.admin.email,
          role: 'admin',
          isAdmin: true
        }));
        
        console.log('[Login Page] Admin tokens saved. Redirecting to dashboard...');
        setJustLoggedIn(true);
        
        // 使用 location.replace 避免浏览器历史记录问题
        setTimeout(() => {
          window.location.replace('/admin/dashboard');
        }, 100);
        
      } else {
        // 普通用户登录
        console.log('Attempting user login with:', { email });
        const response = await authApi.login(email, password);
        console.log('Login response:', response);
        
        // 清除管理员认证状态，避免冲突
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_info');
        
        // 保存 token 和用户信息，并更新 auth 状态
        localStorage.setItem('user_token', response.data.token);
        localStorage.setItem('user_info', JSON.stringify(response.data.user));
        setAuthState(response.data.token, {
          id: response.data.user.id,
          email: response.data.user.email,
          name: response.data.user.name
        });
        console.log('Token and user info saved, auth state updated');
        
        // 设置标志，阻止 useEffect 的重定向逻辑
        setJustLoggedIn(true);
        
        console.log('[Login Page] Navigating to /profile');
        
        // 使用 requestAnimationFrame 确保状态更新后再跳转
        requestAnimationFrame(() => {
          router.push('/profile');
          // 重置标志
          setTimeout(() => setJustLoggedIn(false), 500);
        });
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const error = err as { response?: { data?: { error?: string }; status?: number }; request?: unknown; message?: string };
      
      let errorMessage = '登录失败，请检查邮箱和密码';
      
      if (error.response) {
        // 服务器返回了错误响应
        errorMessage = error.response.data?.error || `服务器错误: ${error.response.status}`;
        console.error('Server error:', error.response.data);
      } else if (error.request) {
        // 请求已发出但没有收到响应
        errorMessage = '无法连接到服务器，请检查后端服务是否运行';
        console.error('No response received');
      } else {
        // 其他错误
        errorMessage = error.message || '登录请求失败';
        console.error('Error message:', error.message);
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
              欢迎回来
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              登录您的 NvwaX 账户
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert
              type="error"
              message={error}
              closable
              onClose={() => setError('')}
              className="mb-6"
            />
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <Space direction="vertical" size="middle" className="w-full">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                label="邮箱地址"
                placeholder="your@email.com"
                prefix={<Mail size={20} />}
                required
              />

              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                label="密码"
                placeholder="••••••••"
                prefix={<Lock size={20} />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
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
                {loginLoading ? '登录中...' : '登录'}
              </Button>
            </Space>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              还没有账户？{' '}
              <Link
                href="/register"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                立即注册
              </Link>
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ← 返回首页
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
          <p className="mt-4 text-gray-600 dark:text-gray-300">加载中...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
