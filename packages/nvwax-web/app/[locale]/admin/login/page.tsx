'use client';

import { useEffect, useState } from 'react';
import { Shield, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

/**
 * Sprint 2.11 — Admin 登录页面（OIDC 集成版）
 * 
 * 变更说明：
 * 1. 移除传统登录表单（username/password），直接走 OIDC
 * 2. 检查 OIDC session，已登录则重定向到 dashboard
 * 3. 未登录则显示 OIDC 登录按钮，点击后跳转到 account.proclaw.cc
 * 4. 支持 Social Login（Google、GitHub、Discord）
 * 
 * OIDC 流程：
 * - 点击"管理员登录" → 跳转到 OIDC 授权端点
 * - 后端回调时检查 userInfo.is_admin === true
 * - 通过后在 /api/auth/session 中返回 admin 权限
 */

export default function AdminLoginPage() {
  const { isLoggedIn, userInfo, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  // 已登录且是管理员 → 重定向到 dashboard
  useEffect(() => {
    if (loading) return;
    if (isLoggedIn && userInfo?.is_admin) {
      router.replace('/admin/dashboard');
    }
  }, [loading, isLoggedIn, userInfo, router]);

  // 跳转到 OIDC 授权端点
  const handleOidcLogin = () => {
    setRedirecting(true);
    
    // 构建 OIDC 授权 URL
    const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc';
    const clientId = process.env.NEXT_PUBLIC_OIDC_ADMIN_CLIENT_ID || 'nvwax-admin'; // 使用 admin 专用客户端
    const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`); // 修正回调路径
    const responseType = 'code';
    const scope = 'openid profile email';
    const state = Math.random().toString(36).substring(2, 15);
    
    // 存储 state 用于 CSRF 防护
    sessionStorage.setItem('oidc_state', state);
    
    const authUrl = `${issuer}/oidc/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=${responseType}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${state}` +
      `&prompt=login`; // 强制重新登录，确保管理员身份
    
    window.location.href = authUrl;
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">验证会话...</p>
        </div>
      </div>
    );
  }

  // 已登录但不是管理员
  if (isLoggedIn && !userInfo?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-xl mb-4">
                <AlertCircle className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">权限不足</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                当前账户 <span className="font-mono text-sm">{userInfo?.email}</span> 没有管理员权限。
              </p>
              <button
                onClick={() => router.replace('/')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 未登录 → 显示 OIDC 登录界面
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
            <p className="text-gray-600 dark:text-gray-400 mt-2">请使用管理员账户登录</p>
          </div>

          {/* OIDC 登录说明 */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={20} />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">统一认证中心</p>
                <p>使用 account.proclaw.cc 的统一认证系统登录，支持邮箱登录和社交账号登录。</p>
              </div>
            </div>
          </div>

          {/* OIDC 登录按钮 */}
          <button
            onClick={handleOidcLogin}
            disabled={redirecting}
            className="w-full py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {redirecting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                跳转中...
              </>
            ) : (
              <>
                <Shield size={20} />
                管理员登录
              </>
            )}
          </button>

          {/* 社交登录链接 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">或使用社交账号登录</p>
            <div className="flex justify-center gap-4">
              <a
                href={`${process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc'}/portal/login?mode=login&redirectTo=${encodeURIComponent('/admin/dashboard')}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm"
              >
                <ExternalLink size={16} />
                社交登录
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>首次使用？请联系系统管理员创建账户</p>
          </div>
        </div>
      </div>
    </div>
  );
}
