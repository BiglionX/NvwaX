'use client';

import { useEffect } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

/**
 * Sprint 2.12 — Admin 登录页面（OIDC 集成版，修复版）
 *
 * 变更说明（相对 Sprint 2.11 手拼授权 URL 的实现）：
 * 1. 删除手拼 /oidc/auth URL（该端点不存在，且未带 PKCE code_challenge，
 *    导致授权必然失败）。现在直接复用 useAuth().login() → lib/oidc/login.startLogin，
 *    与主站登录走同一套 PKCE + state 校验流程。
 * 2. 管理员身份不依赖单独 client：回调后 IdP userinfo 会带 is_admin claim，
 *    本页根据 userInfo.is_admin 决定放行 /admin/dashboard 还是提示权限不足。
 * 3. 未登录时点击按钮 → OIDC 登录 → 回跳 /admin/dashboard。
 *
 * 注意：/admin/login 已在 middleware ALWAYS_PUBLIC 白名单，避免未登录访问时
 * 被中间件先弹去 /login（那样按钮就永远到不了）。
 */

export default function AdminLoginPage() {
  const { isLoggedIn, userInfo, loading, login } = useAuth();
  const router = useRouter();

  // 已登录且是管理员 → 重定向到 dashboard
  useEffect(() => {
    if (loading) return;
    if (isLoggedIn && userInfo?.is_admin) {
      router.replace('/admin/dashboard');
    }
  }, [loading, isLoggedIn, userInfo, router]);

  // 触发标准 OIDC 登录（PKCE + state），成功后回跳 /admin/dashboard
  const handleOidcLogin = async () => {
    try {
      await login('/admin/dashboard');
    } catch (err) {
      console.error('[admin/login] OIDC login failed:', err);
    }
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
              <Shield className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={20} />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">统一认证中心</p>
                <p>使用 account.proclaw.cc 的统一认证系统登录，支持邮箱登录和社交账号登录。管理员权限由系统后台按邮箱授权。</p>
              </div>
            </div>
          </div>

          {/* OIDC 登录按钮 */}
          <button
            onClick={handleOidcLogin}
            className="w-full py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Shield size={20} />
            管理员登录
          </button>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>首次使用？请联系系统管理员创建账户</p>
          </div>
        </div>
      </div>
    </div>
  );
}
