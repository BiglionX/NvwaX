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
        // 兼容两种 key 名称（新版 user_token / 旧版 token）
        const token = localStorage.getItem('user_token') || localStorage.getItem('token');
        const userInfoStr = localStorage.getItem('user_info') || localStorage.getItem('userInfo');
        
        // 清理不一致的状态
        if (userInfoStr && !token) {
          console.warn('useAuth: Found userInfo but no token, cleaning up localStorage');
          localStorage.removeItem('user_info');
          localStorage.removeItem('userInfo');
        }
        
        if (token && userInfoStr) {
          const user = JSON.parse(userInfoStr);
          // 同时更新两个状态，React 会批处理
          setUserInfo(user);
          setIsLoggedIn(true);
        } else {
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
      if (e.key === 'user_token' || e.key === 'token' || e.key === 'user_info' || e.key === 'userInfo') {
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
    // 清除所有认证状态（用户 + 管理员，兼容新旧 key 名称）
    localStorage.removeItem('token');
    localStorage.removeItem('user_token');
    localStorage.removeItem('userInfo');
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
