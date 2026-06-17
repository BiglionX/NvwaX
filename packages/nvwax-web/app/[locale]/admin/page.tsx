'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * AdminRootPage - Sprint 2.4 OIDC 化
 *
 * 用 useAuth() 替代 localStorage 读取
 * 已登录 + is_admin=true → /admin/dashboard
 * 其他 → /admin/login
 */
export default function AdminRootPage() {
  const router = useRouter();
  const { isLoggedIn, userInfo, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (isLoggedIn && userInfo?.is_admin === true) {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/admin/login');
    }
  }, [loading, isLoggedIn, userInfo, router]);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">正在跳转...</p>
      </div>
    </div>
  );
}
