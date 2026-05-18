import { useState, useEffect } from 'react';

interface UserInfo {
  id?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查登录状态
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const userInfoStr = localStorage.getItem('userInfo');
        
        console.log('useAuth checkAuth - token exists:', !!token, 'userInfo exists:', !!userInfoStr);
        
        if (token && userInfoStr) {
          const user = JSON.parse(userInfoStr);
          console.log('useAuth: User logged in:', user.email || user.name);
          // 同时更新两个状态，React 会批处理
          setUserInfo(user);
          setIsLoggedIn(true);
        } else {
          console.log('useAuth: No user found in localStorage');
          // 先设置未登录状态，再清空用户信息
          setIsLoggedIn(false);
          setUserInfo(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsLoggedIn(false);
        setUserInfo(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // 监听 storage 变化（跨标签页）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_token' || e.key === 'user_info') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 登录
  const login = (token: string, user: UserInfo) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userInfo', JSON.stringify(user));
    setIsLoggedIn(true);
    setUserInfo(user);
  };

  // 登出
  const logout = () => {
    // 清除所有认证状态（用户 + 管理员）
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    setIsLoggedIn(false);
    setUserInfo(null);
  };

  // 获取 Token
  const getToken = () => {
    return localStorage.getItem('token');
  };

  return {
    isLoggedIn,
    userInfo,
    loading,
    login,
    logout,
    getToken
  };
}
