'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api/users';
import { useAuth } from '@/hooks/useAuth';
import { User as UserIcon, Mail, Calendar, Edit2, Save, X, Folder, Users, Bot, Clock, Star, Award, Settings, Shield, Activity } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
  const { isLoggedIn, loading, userInfo } = useAuth();

  console.log('=== ProfilePage Render ===');
  console.log('isLoggedIn:', isLoggedIn);
  console.log('loading:', loading);

  useEffect(() => {
    console.log('ProfilePage useEffect - isLoggedIn:', isLoggedIn, 'loading:', loading);
    // 只在加载完成后才检查登录状态，避免竞态条件
    if (!loading) {
      if (!isLoggedIn) {
        console.log('Not logged in, redirecting to login...');
        router.replace('/login?redirect=/profile');
      } else {
        console.log('User is logged in, showing profile');
        
        // 检查是否为管理员用户，如果是则重定向到管理后台
        const adminEmails = ['1055603323@qq.com', 'admin'];
        const userEmail = userInfo?.email?.toLowerCase();
        const isAdmin = userEmail && (adminEmails.includes(userEmail) || userEmail.endsWith('@admin.com'));
        
        if (isAdmin) {
          console.log('Admin user detected, redirecting to admin dashboard...');
          router.replace('/admin/dashboard');
          return;
        }
      }
    }
  }, [isLoggedIn, loading, router, userInfo]);

  if (loading) {
    console.log('ProfilePage: Loading...');
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
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
    return (
      <div className="text-center py-12 text-gray-500">加载中...</div>
    );
  }

  return (
    <div>
      {/* Header - 移除，因为 layout 中已有用户中心标题 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧 - 个人信息卡片 */}
        <div className="lg:col-span-4 space-y-6">
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
          
          {/* 账号安全 */}
          <AccountSecurity />
        </div>

        {/* 右侧 - 统计和功能区域 */}
        <div className="lg:col-span-8 space-y-6">
          {/* 统计卡片 */}
          <StatsCards stats={stats} />
          
          {/* 快捷操作 */}
          <QuickActions />
          
          {/* 最近活动 */}
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}

// 个人信息卡片组件
function ProfileCard({ user, isEditing, editForm, setEditForm, setIsEditing, handleSave, handleCancel, updateMutation }: ProfileCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-5">
        {/* 头像 */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 p-0.5">
            <div className="w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center overflow-hidden">
              {user?.avatar ? (
                <Image src={user.avatar} alt={user?.name || 'User'} width={80} height={80} className="rounded-full object-cover" />
              ) : (
                <UserIcon className="text-gray-600 dark:text-gray-300" size={40} />
              )}
            </div>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="text-center mb-4">
          {isEditing ? (
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="text-base font-medium text-gray-900 dark:text-white bg-transparent border-b border-blue-500 focus:outline-none text-center w-full mb-2"
              placeholder="输入昵称"
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
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              <X size={14} />
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
            >
              <Save size={14} />
              {updateMutation.isPending ? '保存中...' : '保存'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditForm({ name: user?.name || '', bio: user?.bio || '' });
              setIsEditing(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Edit2 size={14} />
            编辑资料
          </button>
        )}
      </div>
    </div>
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
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      label: 'Agent Team 数',
      value: stats?.agentTeamCount || 0,
      icon: Bot,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={stat.iconColor} size={20} />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}

// 快捷操作组件
function QuickActions() {
  const actions = [
    { label: '我的项目', icon: Folder, href: '/projects', color: 'from-blue-500 to-blue-600', description: '查看和管理您的项目' },
    { label: '我的悬赏', icon: Award, href: '/my-bounties', color: 'from-purple-500 to-purple-600', description: '查看悬赏任务' },
    { label: '收藏的 Agent', icon: Star, href: '/favorites', color: 'from-pink-500 to-pink-600', description: '查看收藏内容' },
    { label: '设置', icon: Settings, href: '/settings', color: 'from-gray-500 to-gray-600', description: '账户设置' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        快捷操作
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link
              key={index}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <div className={`w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center`}>
                <Icon className="text-white" size={20} />
              </div>
              <div className="text-center">
                <span className="text-sm font-medium text-gray-900 dark:text-white block">
                  {action.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// 最近活动组件
function RecentActivity() {
  const activities = [
    { type: 'project', message: '创建了新项目 "AI Agent 平台"', time: '2 小时前', icon: Folder, color: 'text-blue-600' },
    { type: 'team', message: '加入了 AiTeam "前端开发组"', time: '1 天前', icon: Users, color: 'text-purple-600' },
    { type: 'agent', message: '收藏了 Agent "Code Review Bot"', time: '3 天前', icon: Bot, color: 'text-green-600' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="text-blue-600" size={18} />
          最近活动
        </h3>
        <Link href="/activity" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
          查看全部
        </Link>
      </div>
      <div className="space-y-3">
        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
              <div className={`w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0`}>
                <Icon className={activity.color} size={18} />
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
      </div>
    </div>
  );
}

// 账号安全组件
function AccountSecurity() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="text-green-600" size={18} />
          账号安全
        </h3>
        <div className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
          安全
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">邮箱已验证</span>
          </div>
          <span className="text-xs text-green-600 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded">已验证</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">密码强度</span>
          </div>
          <span className="text-xs text-green-600 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded">强</span>
        </div>
        <button className="w-full mt-3 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
          修改密码
        </button>
      </div>
    </div>
  );
}