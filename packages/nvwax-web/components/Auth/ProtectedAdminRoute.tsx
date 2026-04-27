'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // 如果已经检查过，跳过
    if (hasChecked) {
      return;
    }

    const checkAdminAuth = () => {
      const adminToken = localStorage.getItem('admin_token');
      const userToken = localStorage.getItem('user_token');
      const userInfo = localStorage.getItem('user_info');
      
      // 检查是否有管理员权限
      let hasAdminAccess = !!adminToken;
      
      if (!hasAdminAccess && userToken && userInfo) {
        try {
          const user = JSON.parse(userInfo);
          const adminEmails = ['1055603323@qq.com', 'admin'];
          hasAdminAccess = adminEmails.includes(user.email) || user.email?.endsWith('@admin.com');
          
          if (hasAdminAccess) {
            localStorage.setItem('admin_token', userToken);
            localStorage.setItem('admin_info', userInfo);
          }
        } catch (e) {
          console.error('[ProtectedAdminRoute] Failed to parse user info:', e);
        }
      }
      
      if (!hasAdminAccess && pathname !== '/admin/login') {
        // 未登录且不是登录页，跳转到登录页
        router.replace('/admin/login');
        return; // 跳转后返回，不执行后面的 setIsChecking
      }
      
      // 已登录或在登录页，允许访问
      setHasChecked(true);
      setIsChecking(false);
    };

    checkAdminAuth();
  }, [pathname, router, hasChecked]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">验证管理员权限...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
