'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    // 检查是否已登录
    const adminToken = localStorage.getItem('admin_token');
    const userToken = localStorage.getItem('user_token');
    
    if (adminToken || userToken) {
      // 已登录，跳转到仪表板
      router.replace('/admin/dashboard');
    } else {
      // 未登录，跳转到登录页
      router.replace('/admin/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">正在跳转...</p>
      </div>
    </div>
  );
}
