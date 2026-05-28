'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, User } from '@/lib/api/admin';
import { 
  Search, 
  Ban, 
  CheckCircle, 
  AlertTriangle,
  Users as UsersIcon,
  Loader2,
  Mail,
  Calendar,
  Globe
} from 'lucide-react';

interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');

  const limit = 20;

  // 获取用户列表
  const { data: usersData, isLoading: loadingUsers } = useQuery<UserListResponse>({
    queryKey: ['admin-users', page, debouncedSearch],
    queryFn: () => adminApi.getUserList(page, limit, debouncedSearch || undefined),
    placeholderData: (previousData) => previousData
  });

  // 获取用户统计
  const { data: userStats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: () => adminApi.getUserStats()
  });

  // 搜索处理（防抖）
  const handleSearch = (value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1); // 重置到第一页
    }, 500);
    return () => clearTimeout(timer);
  };

  // 封禁用户
  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) => 
      adminApi.banUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-stats'] });
      setShowBanModal(false);
      setSelectedUser(null);
      setBanReason('');
      alert('用户已封禁');
    },
    onError: (error: Error) => {
      alert('封禁失败: ' + error.message);
    }
  });

  // 解封用户
  const unbanMutation = useMutation({
    mutationFn: (userId: string) => adminApi.unbanUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-stats'] });
      alert('用户已解封');
    },
    onError: (error: Error) => {
      alert('解封失败: ' + error.message);
    }
  });

  const handleBanClick = (user: User) => {
    setSelectedUser(user);
    setShowBanModal(true);
  };

  const handleConfirmBan = () => {
    if (selectedUser) {
      banMutation.mutate({ userId: selectedUser.id, reason: banReason });
    }
  };

  const handleUnban = (userId: string) => {
    if (confirm('确定要解封该用户吗？')) {
      unbanMutation.mutate(userId);
    }
  };

  const totalPages = usersData ? Math.ceil(usersData.total / limit) : 0;

  if (loadingUsers || loadingStats) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Loader2 className="animate-spin mx-auto mb-4" size={48} />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">用户管理</h1>
        <p className="text-gray-600 dark:text-gray-300">管理系统用户账户和权限</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <UsersIcon className="text-blue-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">总用户数</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {userStats?.total || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">活跃用户</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {userStats?.active || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Ban className="text-red-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">被封禁用户</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {userStats?.banned || 0}
          </p>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜索..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">用户</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">状态</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">社交绑定</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">注册时间</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {usersData?.data && usersData.data.length > 0 ? (
              usersData.data.map((user: User) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.name || '未设置'}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Mail size={14} />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.isBanned ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                          <Ban size={14} />
                          已封禁
                        </span>
                        {user.banReason && (
                          <p className="text-xs text-gray-500 mt-1">{user.banReason}</p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <CheckCircle size={14} />
                        正常
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="group relative">
                        <Globe size={18} className={user.socialAccounts?.some(sa => sa.provider === 'facebook') ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'} />
                        {user.socialAccounts?.some(sa => sa.provider === 'facebook') ? (
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {user.socialAccounts?.find(sa => sa.provider === 'facebook')?.displayName || 'Facebook 已绑定'}
                          </span>
                        ) : (
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            未绑定
                          </span>
                        )}
                      </div>
                      <div className="group relative">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill={user.socialAccounts?.some(sa => sa.provider === 'google') ? '#4285F4' : '#D1D5DB'}/>
                          <path d="M12 23C14.97 23 17.46 21.98 19.28 20.34L15.71 17.57C14.73 18.22 13.45 18.62 12 18.62C9.12 18.62 6.68 16.67 5.81 14.08H2.13V16.92C3.93 20.46 7.62 23 12 23Z" fill={user.socialAccounts?.some(sa => sa.provider === 'google') ? '#34A853' : '#D1D5DB'}/>
                          <path d="M5.81 14.08C5.58 13.38 5.44 12.63 5.44 11.87C5.44 11.11 5.58 10.36 5.81 9.66V6.82H2.13C1.37 8.32 0.94 10 0.94 11.87C0.94 13.74 1.37 15.42 2.13 16.92L5.81 14.08Z" fill={user.socialAccounts?.some(sa => sa.provider === 'google') ? '#FBBC05' : '#D1D5DB'}/>
                          <path d="M12 5.12C13.58 5.12 15 5.69 16.09 6.72L19.35 3.46C17.44 1.68 14.96 0.75 12 0.75C7.62 0.75 3.93 3.29 2.13 6.82L5.81 9.66C6.68 7.07 9.12 5.12 12 5.12Z" fill={user.socialAccounts?.some(sa => sa.provider === 'google') ? '#EA4335' : '#D1D5DB'}/>
                        </svg>
                        {user.socialAccounts?.some(sa => sa.provider === 'google') ? (
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {user.socialAccounts?.find(sa => sa.provider === 'google')?.displayName || 'Google 已绑定'}
                          </span>
                        ) : (
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            未绑定
                          </span>
                        )}
                      </div>
                      <div className="group relative">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-400 opacity-50">
                          <path d="M8.5 11C9.32843 11 10 10.3284 10 9.5C10 8.67157 9.32843 8 8.5 8C7.67157 8 7 8.67157 7 9.5C7 10.3284 7.67157 11 8.5 11Z" fill="currentColor"/>
                          <path d="M15.5 11C16.3284 11 17 10.3284 17 9.5C17 8.67157 16.3284 8 15.5 8C14.6716 8 14 8.67157 14 9.5C14 10.3284 14.6716 11 15.5 11Z" fill="currentColor"/>
                          <path d="M12 2C6.477 2 2 6.037 2 10.5C2 12.772 3.12 14.832 4.93 16.291L4.22 19L7.194 17.151C8.704 17.695 10.31 18 12 18C12.34 18 12.677 17.982 13.012 17.948C12.686 17.154 12.5 16.292 12.5 15.5C12.5 12.462 15.462 9.5 18.5 9.5C19.057 9.5 19.594 9.571 20.108 9.704C19.307 5.28 16.013 2 12 2Z" fill="currentColor" fillOpacity="0.9"/>
                          <path d="M18.5 11C16.015 11 14 13.015 14 15.5C14 17.985 16.015 20 18.5 20C19.22 20 19.91 19.862 20.54 19.62L22 20.5L21.5 19.15C22.4 18.48 23 17.56 23 16.5C23 15.12 21.68 14 20 13.5C20.34 12.62 20.5 12 20.5 11C18.5 11 18.5 11 18.5 11Z" fill="currentColor" fillOpacity="0.6"/>
                        </svg>
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          微信登录即将上线
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar size={16} />
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {user.isBanned ? (
                        <button
                          onClick={() => handleUnban(user.id)}
                          disabled={unbanMutation.isPending}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors disabled:opacity-50 text-sm"
                        >
                          <CheckCircle size={16} />
                          解封
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBanClick(user)}
                          className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm"
                        >
                          <Ban size={16} />
                          封禁
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <UsersIcon className="mx-auto mb-2 opacity-50" size={48} />
                  <p>暂无数据</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              第 {page} / {totalPages} 页，共 {usersData?.total || 0} 条
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-all"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-all"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 封禁确认弹窗 */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="text-red-500 shrink-0" size={24} />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">封禁用户</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  确定要封禁用户 {selectedUser.email} 吗？
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                封禁原因（可选）
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="请输入封禁原因..."
                rows={3}
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setSelectedUser(null);
                  setBanReason('');
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleConfirmBan}
                disabled={banMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {banMutation.isPending ? '封禁中...' : '确认封禁'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
