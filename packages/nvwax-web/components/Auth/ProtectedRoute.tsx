'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  console.log('ProtectedRoute render - isLoggedIn:', isLoggedIn, 'loading:', loading, 'pathname:', pathname);

  useEffect(() => {
    console.log('ProtectedRoute effect triggered - isLoggedIn:', isLoggedIn, 'loading:', loading);
    
    // 只在加载完成后才检查登录状态
    if (!loading) {
      if (!isLoggedIn) {
        // 保存当前路径，登录后可以跳回来
        const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
        console.log('Not logged in, redirecting to:', redirectUrl);
        router.replace(redirectUrl);
      } else {
        console.log('User is logged in, showing protected content');
      }
    } else {
      console.log('Still loading auth state...');
    }
  }, [isLoggedIn, loading]);

  // 加载中或已登录时显示内容
  if (loading || isLoggedIn) {
    return <>{children}</>;
  }

  // 未登录时显示加载状态
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">正在验证登录状态...</p>
      </div>
    </div>
  );
}
