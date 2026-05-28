'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api/users';
import { authApi, SocialAccountInfo } from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { Mail, Calendar, Edit2, Save, X, Folder, Users, Bot, Clock, Shield, Activity, Link2, Unlink, Globe } from 'lucide-react';
import Link from 'next/link';
import LoadingState from '@/components/Layout/LoadingState';
import { Card, Button, Input, Space, Avatar, Badge, Alert } from '@/components/UI';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  projectCount: number;
  teamCount: number;
  agentTeamCount: number;
}

interface UpdateMutation {
  isPending: boolean;
  mutate: (data: { name?: string; bio?: string }) => void;
}

interface ProfileCardProps {
  user: User | undefined;
  isEditing: boolean;
  editForm: { name: string; bio: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ name: string; bio: string }>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  handleSave: () => void;
  handleCancel: () => void;
  updateMutation: UpdateMutation;
}

interface StatsCardsProps {
  stats: UserStats | undefined;
}

export default function ProfilePage() {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();
  const hasCheckedAuth = useRef(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  console.log('=== ProfilePage Render ===');
  console.log('isLoggedIn:', isLoggedIn);
  console.log('loading:', loading);

  // 在组件挂载时立即检查 localStorage，不等待 useAuth
  useEffect(() => {
    if (hasCheckedAuth.current) return;
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const userInfoStr = typeof window !== 'undefined' ? localStorage.getItem('userInfo') : null;
    
    console.log('ProfilePage immediate check - token exists:', !!token, 'userInfo exists:', !!userInfoStr);
    
    if (!token || !userInfoStr) {
      // 确实未登录，重定向到 login
      console.log('No auth found, redirecting to login...');
      setShouldRedirect(true);
      router.replace('/login?redirect=/profile');
      return;
    }
    
    // 有 token，标记为已检查
    hasCheckedAuth.current = true;
    
    // 检查是否为管理员
    try {
      const user = JSON.parse(userInfoStr);
      const adminEmails = ['1055603323@qq.com', 'admin'];
      const userEmail = user.email?.toLowerCase();
      const isAdmin = userEmail && (adminEmails.includes(userEmail) || userEmail.endsWith('@admin.com'));
      
      if (isAdmin) {
        console.log('Admin user detected, redirecting to admin dashboard...');
        router.replace('/admin/dashboard');
      }
    } catch (e) {
      console.error('Failed to parse user info:', e);
    }
  }, []); // 只在挂载时执行一次

  // 如果 shouldRedirect 为 true，显示跳转中
  if (shouldRedirect) {
    return <LoadingState text="跳转中..." />;
  }

  if (loading) {
    console.log('ProfilePage: Loading...');
    return <LoadingState />;
  }

  if (!isLoggedIn) {
    console.log('ProfilePage: Not logged in, returning null');
    return null; // 正在重定向
  }

  console.log('ProfilePage: Rendering ProfileContent');
  return <ProfileContent />;
}

function ProfileContent() {
  const queryClient = useQueryClient();
  const { userInfo } = useAuth();
  
  // 使用真实用户 ID
  const userId = userInfo?.id;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '' });

  // 获取用户信息
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userApi.getProfile(userId!),
    enabled: !!userId
  });

  // 获取用户统计
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: () => userApi.getStats(userId!),
    enabled: !!userId
  });

  // 更新用户信息
  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; bio?: string }) => {
      if (!userId) throw new Error('User ID is required');
      return userApi.updateProfile(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      setIsEditing(false);
    }
  });

  const handleSave = () => {
    updateMutation.mutate(editForm);
  };

  const handleCancel = () => {
    setEditForm({ name: user?.name || '', bio: user?.bio || '' });
    setIsEditing(false);
  };

  if (loadingUser || loadingStats) {
    return <LoadingState />;
  }

  return (
    <Space direction="vertical" size="middle" className="w-full">
      {/* 个人信息卡片 */}
      <ProfileCard 
        user={user} 
        isEditing={isEditing}
        editForm={editForm}
        setEditForm={setEditForm}
        setIsEditing={setIsEditing}
        handleSave={handleSave}
        handleCancel={handleCancel}
        updateMutation={updateMutation}
      />
      
      {/* 统计卡片 */}
      <StatsCards stats={stats} />
      
      {/* 账号安全 */}
      <AccountSecurity />
      
      {/* 社交账号绑定 */}
      <SocialAccounts />
      
      {/* 最近活动 */}
      <RecentActivity />
    </Space>
  );
}

// 个人信息卡片组件
function ProfileCard({ user, isEditing, editForm, setEditForm, setIsEditing, handleSave, handleCancel, updateMutation }: ProfileCardProps) {
  return (
    <Card padding="lg">
      {/* 头像 */}
      <div className="flex justify-center mb-4">
        <Avatar
          src={user?.avatar}
          alt={user?.name || 'User'}
          size="lg"
        />
      </div>

      {/* 用户信息 */}
      <div className="text-center mb-4">
        {isEditing ? (
          <Input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="输入昵称"
            className="text-center mb-2"
          />
        ) : (
          <h2 className="text-base font-medium text-gray-900 dark:text-white mb-1">
            {user?.name || '未设置昵称'}
          </h2>
        )}
        
        <div className="flex items-center justify-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <Mail size={14} />
          <span className="truncate max-w-50">{user?.email}</span>
        </div>
      </div>

      {/* 个人简介 */}
      <div className="mb-4">
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">个人简介</h3>
        {isEditing ? (
          <textarea
            value={editForm.bio}
            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-sm"
            rows={3}
            placeholder="介绍一下自己..."
          />
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {user?.bio || '暂无简介'}
          </p>
        )}
      </div>

      {/* 注册时间 */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
        <Calendar size={14} />
        <span>注册于 {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '未知'}</span>
      </div>

      {/* 编辑按钮 */}
      {isEditing ? (
        <Space size="small" className="w-full">
          <Button
            variant="outline"
            onClick={handleCancel}
            icon={<X size={16} />}
            fullWidth
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={updateMutation.isPending}
            icon={!updateMutation.isPending ? <Save size={16} /> : undefined}
            fullWidth
          >
            {updateMutation.isPending ? '保存中...' : '保存'}
          </Button>
        </Space>
      ) : (
        <Button
          variant="primary"
          onClick={() => {
            setEditForm({ name: user?.name || '', bio: user?.bio || '' });
            setIsEditing(true);
          }}
          icon={<Edit2 size={16} />}
          fullWidth
        >
          编辑资料
        </Button>
      )}
    </Card>
  );
}

// 统计卡片组件
function StatsCards({ stats }: StatsCardsProps) {
  const statsData = [
    {
      label: '项目数',
      value: stats?.projectCount || 0,
      icon: Folder,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'AiTeam 数',
      value: stats?.teamCount || 0,
      icon: Users,
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Agent Team 数',
      value: stats?.agentTeamCount || 0,
      icon: Bot,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={stat.iconColor} size={20} />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
          </Card>
        );
      })}
    </div>
  );
}


// 最近活动组件
function RecentActivity() {
  const activities = [
    { type: 'project', message: '创建了新项目 "AI Agent 平台"', time: '2 小时前', icon: Folder, color: 'text-blue-600' },
    { type: 'team', message: '加入了 AiTeam "前端开发组"', time: '1 天前', icon: Users, color: 'text-blue-600' },
    { type: 'agent', message: '收藏了 Agent "Code Review Bot"', time: '3 天前', icon: Bot, color: 'text-blue-600' }
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="text-blue-600" size={20} />
          最近活动
        </h3>
        <Link href="/activity" prefetch={false} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
          查看全部
        </Link>
      </div>
      <Space direction="vertical" size="small" className="w-full">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
              <div className={`w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0`}>
                <Icon className={activity.color} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">{activity.message}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </Space>
    </Card>
  );
}

// 账号安全组件
function AccountSecurity() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="text-green-600" size={20} />
          账号安全
        </h3>
        <Badge variant="success">安全</Badge>
      </div>
      <Space direction="vertical" size="small" className="w-full">
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">邮箱已验证</span>
          </div>
          <Badge variant="success">已验证</Badge>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">密码强度</span>
          </div>
          <Badge variant="success">强</Badge>
        </div>
        <Button variant="outline" fullWidth>
          修改密码
        </Button>
      </Space>
    </Card>
  );
}

// 社交账号绑定组件
function SocialAccounts() {
  const [accounts, setAccounts] = useState<SocialAccountInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { facebookStatus, googleStatus, loginWithFacebook, loginWithGoogle } = useSocialAuth();
  const [facebookBinding, setFacebookBinding] = useState(false);

  // 加载已绑定的社交账号
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const result = await authApi.getSocialAccounts();
      if (result.success) {
        setAccounts(result.data);
      }
    } catch {
      // 忽略错误
    }
  };

  // 绑定 Facebook 账号
  const handleBindFacebook = async () => {
    setError(null);
    setSuccessMsg(null);
    setFacebookBinding(true);

    try {
      const loginResult = await loginWithFacebook();
      if (loginResult.success && loginResult.data) {
        // 绑定到当前用户
        const bindResult = await authApi.bindSocialAccount('facebook', loginResult.data.token);
        if (bindResult.success) {
          setSuccessMsg('Facebook 账号绑定成功');
          await loadAccounts();
        }
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      if (axiosError?.response?.data?.error?.code === 'ALREADY_BOUND') {
        setError('该 Facebook 账号已被其他用户绑定');
      } else {
        setError('绑定失败，请重试');
      }
    } finally {
      setFacebookBinding(false);
    }
  };

  // 解绑社交账号
  const handleUnbind = async (account: SocialAccountInfo) => {
    setError(null);
    setSuccessMsg(null);

    if (!confirm(`确定要解绑 ${account.displayName || account.provider} 账号吗？`)) {
      return;
    }

    try {
      const result = await authApi.unbindSocialAccount(account.provider, account.providerUserId);
      if (result.success) {
        setSuccessMsg(`${account.provider === 'facebook' ? 'Facebook' : '社交'} 账号解绑成功`);
        await loadAccounts();
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = axiosError?.response?.data?.error?.message || '解绑失败'; 
      setError(msg);
    }
  };

  const hasFacebook = accounts.some(a => a.provider === 'facebook');
  const hasGoogle = accounts.some(a => a.provider === 'google');
  const hasWechat = accounts.some(a => a.provider === 'wechat');

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Link2 className="text-blue-600" size={20} />
          社交账号绑定
        </h3>
      </div>

      {/* 成功提示 */}
      {successMsg && (
        <Alert type="success" message={successMsg} closable onClose={() => setSuccessMsg(null)} className="mb-4" />
      )}

      {/* 错误提示 */}
      {error && (
        <Alert type="error" message={error} closable onClose={() => setError(null)} className="mb-4" />
      )}

      <Space direction="vertical" size="small" className="w-full">
        {/* Facebook 绑定 */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-blue-600" />
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Facebook</span>
              {hasFacebook && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {accounts.find(a => a.provider === 'facebook')?.displayName || '已绑定'}
                </p>
              )}
            </div>
          </div>
          {hasFacebook ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const fbAccount = accounts.find(a => a.provider === 'facebook');
                if (fbAccount) handleUnbind(fbAccount);
              }}
              className="!text-red-500 !border-red-200 hover:!bg-red-50 dark:hover:!bg-red-900/20"
            >
              <Unlink size={14} className="mr-1" />
              解绑
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleBindFacebook}
              disabled={facebookStatus !== 'ready'}
              loading={facebookBinding}
            >
              <Link2 size={14} className="mr-1" />
              绑定
            </Button>
          )}
        </div>

        {/* Google 绑定 */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23C14.97 23 17.46 21.98 19.28 20.34L15.71 17.57C14.73 18.22 13.45 18.62 12 18.62C9.12 18.62 6.68 16.67 5.81 14.08H2.13V16.92C3.93 20.46 7.62 23 12 23Z" fill="#34A853"/>
              <path d="M5.81 14.08C5.58 13.38 5.44 12.63 5.44 11.87C5.44 11.11 5.58 10.36 5.81 9.66V6.82H2.13C1.37 8.32 0.94 10 0.94 11.87C0.94 13.74 1.37 15.42 2.13 16.92L5.81 14.08Z" fill="#FBBC05"/>
              <path d="M12 5.12C13.58 5.12 15 5.69 16.09 6.72L19.35 3.46C17.44 1.68 14.96 0.75 12 0.75C7.62 0.75 3.93 3.29 2.13 6.82L5.81 9.66C6.68 7.07 9.12 5.12 12 5.12Z" fill="#EA4335"/>
            </svg>
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Google</span>
              {hasGoogle && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {accounts.find(a => a.provider === 'google')?.displayName || '已绑定'}
                </p>
              )}
            </div>
          </div>
          {hasGoogle ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const googleAccount = accounts.find(a => a.provider === 'google');
                if (googleAccount) handleUnbind(googleAccount);
              }}
              className="!text-red-500 !border-red-200 hover:!bg-red-50 dark:hover:!bg-red-900/20"
            >
              <Unlink size={14} className="mr-1" />
              解绑
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                loginWithGoogle().then(async (result) => {
                  if (result.success && result.data) {
                    const bindResult = await authApi.bindSocialAccount('google', result.data.token);
                    if (bindResult.success) {
                      setSuccessMsg('Google 账号绑定成功');
                      await loadAccounts();
                    }
                  }
                }).catch(() => {
                  // 错误已由 hook 处理
                });
              }}
              disabled={googleStatus !== 'ready'}
            >
              <Link2 size={14} className="mr-1" />
              绑定
            </Button>
          )}
        </div>

        {/* 微信绑定（预留） */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-700 opacity-60">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500">
              <path d="M8.5 11C9.32843 11 10 10.3284 10 9.5C10 8.67157 9.32843 8 8.5 8C7.67157 8 7 8.67157 7 9.5C7 10.3284 7.67157 11 8.5 11Z" fill="currentColor"/>
              <path d="M15.5 11C16.3284 11 17 10.3284 17 9.5C17 8.67157 16.3284 8 15.5 8C14.6716 8 14 8.67157 14 9.5C14 10.3284 14.6716 11 15.5 11Z" fill="currentColor"/>
              <path d="M12 2C6.477 2 2 6.037 2 10.5C2 12.772 3.12 14.832 4.93 16.291L4.22 19L7.194 17.151C8.704 17.695 10.31 18 12 18C12.34 18 12.677 17.982 13.012 17.948C12.686 17.154 12.5 16.292 12.5 15.5C12.5 12.462 15.462 9.5 18.5 9.5C19.057 9.5 19.594 9.571 20.108 9.704C19.307 5.28 16.013 2 12 2Z" fill="currentColor" fillOpacity="0.9"/>
              <path d="M18.5 11C16.015 11 14 13.015 14 15.5C14 17.985 16.015 20 18.5 20C19.22 20 19.91 19.862 20.54 19.62L22 20.5L21.5 19.15C22.4 18.48 23 17.56 23 16.5C23 15.12 21.68 14 20 13.5C20.34 12.62 20.5 12 20.5 11C18.5 11 18.5 11 18.5 11Z" fill="currentColor" fillOpacity="0.6"/>
            </svg>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">微信</span>
              {hasWechat && (
                <p className="text-xs text-gray-400 mt-0.5">已绑定</p>
              )}
            </div>
          </div>
          <Badge variant="default">即将上线</Badge>
        </div>
      </Space>
    </Card>
  );
}