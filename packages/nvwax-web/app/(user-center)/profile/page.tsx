'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api/users';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Calendar, Edit2, Save, X, Folder, Users, Bot, Clock, Shield, Activity } from 'lucide-react';
import Link from 'next/link';
import LoadingState from '@/components/Layout/LoadingState';
import { Card, Button, Input, Space, Avatar, Badge } from '@/components/UI';

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
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-white text-sm"
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
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50 dark:bg-violet-900/20',
      iconColor: 'text-violet-600 dark:text-violet-400'
    },
    {
      label: 'AiTeam 数',
      value: stats?.teamCount || 0,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400'
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
          <Card key={index} className="hover:border-violet-300 dark:hover:border-violet-700 transition-all">
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
    { type: 'project', message: '创建了新项目 "AI Agent 平台"', time: '2 小时前', icon: Folder, color: 'text-violet-600' },
    { type: 'team', message: '加入了 AiTeam "前端开发组"', time: '1 天前', icon: Users, color: 'text-purple-600' },
    { type: 'agent', message: '收藏了 Agent "Code Review Bot"', time: '3 天前', icon: Bot, color: 'text-blue-600' }
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="text-violet-600" size={20} />
          最近活动
        </h3>
        <Link href="/activity" prefetch={false} className="text-sm text-violet-600 dark:text-violet-400 hover:underline font-medium">
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