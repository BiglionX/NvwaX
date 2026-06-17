'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api/admin';
import { Shield, Lock, User, Eye, EyeOff, ExternalLink } from 'lucide-react';

// 注意：权限检查和重定向逻辑已由 ProtectedAdminRoute 统一处理

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oidcPrompt, setOidcPrompt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  // Sprint 2.4: 倒计时跳 OIDC issuer
  useEffect(() => {
    if (oidcPrompt === null) return;
    if (countdown <= 0) {
      const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc';
      window.location.href = `${issuer}/oauth/authorize?...`;
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [oidcPrompt, countdown]);

  // 注意：登录状态检查和重定向已由 ProtectedAdminRoute 处理，无需重复
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('[Admin Login Page] Attempting login:', { 
      username, 
      passwordLength: password.length,
      password: password // 临时显示密码用于调试
    });

    try {
      // Sprint 2.4: admins 表独立登录保留为兼容流程
      // 登录成功不再写 localStorage（Sprint 2.3 已清理），改提示走 OIDC
      const response = await adminApi.login(username, password);
      console.log('[Admin Login Page] Legacy login successful:', response.data.admin.email);

      // 提示用户走 OIDC 流程以激活管理权限
      setOidcPrompt(response.data.admin.email);
    } catch (err: unknown) {
      console.error('[Admin Login Page] Login failed:', err);
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error.response?.data?.error || error.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-blue-500 to-blue-700 rounded-xl mb-4">
              <Shield className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NvwaX 管理后台</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">管理员登录</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  placeholder="输入用户名"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  placeholder="输入密码"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* OIDC 跳转提示（Sprint 2.4: 老 admin 登录成功后引导走 OIDC） */}
          {oidcPrompt && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-2">
                账号 <span className="font-mono">{oidcPrompt}</span> 已通过验证。
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                请回 OIDC 入口完成 SSO 登录以激活管理权限（{countdown} 秒后跳转）。
              </p>
              <a
                href={process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc'}
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
              >
                立即跳转 <ExternalLink size={14} />
              </a>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>首次使用？请联系系统管理员创建账户</p>
          </div>
        </div>
      </div>
    </div>
  );
}
