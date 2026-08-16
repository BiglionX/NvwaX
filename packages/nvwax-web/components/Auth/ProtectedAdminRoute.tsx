'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedAdminRoute - Sprint 2.4 OIDC 化
 *
 * 来源：useAuth() OIDC session（httpOnly cookie + /api/auth/session）
 * 校验：已登录 AND userInfo.is_admin === true
 * 不再读 localStorage（XSS 安全）
 */
export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, userInfo, loading } = useAuth();
  const t = useTranslations('admin');

  useEffect(() => {
    if (loading) return;
    // /admin/login 始终允许访问
    if (pathname === '/admin/login') return;

    if (!isLoggedIn) {
      router.replace('/admin/login');
      return;
    }
    if (userInfo?.is_admin !== true) {
      router.replace('/admin/login');
    }
  }, [loading, isLoggedIn, userInfo, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('verifyingAdmin')}</p>
        </div>
      </div>
    );
  }

  // /admin/login 页面：允许渲染
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // 未通过 admin 校验：返回 null（已触发跳转）
  if (!isLoggedIn || userInfo?.is_admin !== true) {
    return null;
  }

  return <>{children}</>;
}
