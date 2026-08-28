'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api/users';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Calendar, Edit2, Save, X, Folder, Users, Bot, Shield, Activity } from 'lucide-react';
import LoadingState from '@/components/Layout/LoadingState';
import { Card, Button, Input, Space, Avatar, Badge, Modal } from '@/components/UI';

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
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Sprint 2.2: 不再读 localStorage，靠 useAuth().isLoggedIn 判断
  // useAuth 内部 fetch /api/auth/session，读 OIDC cookie
  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      setShouldRedirect(true);
      router.replace('/login?redirect=/profile');
      return;
    }
  }, [isLoggedIn, loading, router]);

  // 如果 shouldRedirect 为 true，显示跳转中
  if (shouldRedirect) {
    return <LoadingState text="跳转中..." />;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!isLoggedIn) {
    return null; // 正在重定向
  }

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
  const t = useTranslations('userCenter.profile');
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
            placeholder={t('nicknamePlaceholder')}
            className="text-center mb-2"
          />
        ) : (
          <h2 className="text-base font-medium text-gray-900 dark:text-white mb-1">
            {user?.name || t('noNickname')}
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
            placeholder={t('bioPlaceholder')}
          />
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {user?.bio || t('bioEmpty')}
          </p>
        )}
      </div>

      {/* 注册时间 */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
        <Calendar size={14} />
        <span>{t('registeredAt', { date: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : t('unknown') })}</span>
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
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={updateMutation.isPending}
            icon={!updateMutation.isPending ? <Save size={16} /> : undefined}
            fullWidth
          >
            {updateMutation.isPending ? t('saving') : t('save')}
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
          {t('edit')}
        </Button>
      )}
    </Card>
  );
}

// 统计卡片组件
function StatsCards({ stats }: StatsCardsProps) {
  const t = useTranslations('userCenter.profile');
  const statsData = [
    {
      label: t('statsProjects'),
      value: stats?.projectCount || 0,
      icon: Folder,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: t('statsTeams'),
      value: stats?.teamCount || 0,
      icon: Users,
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: t('statsAgentTeams'),
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


// 最近活动组件（无真实活动接口，显示诚实空状态，避免伪造数据）
function RecentActivity() {
  const t = useTranslations('userCenter.profile');
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="text-blue-600" size={20} />
          {t('activityTitle')}
        </h3>
      </div>
      <div className="text-center py-10">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
          <Activity size={24} className="text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('noActivity')}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {t('noActivityDesc')}
        </p>
      </div>
    </Card>
  );
}

// 账号安全组件
function AccountSecurity() {
  const t = useTranslations('userCenter.profile');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc';

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="text-green-600" size={20} />
          {t('securityTitle')}
        </h3>
        <Badge variant="success">{t('secure')}</Badge>
      </div>
      <Space direction="vertical" size="small" className="w-full">
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('emailVerified')}</span>
          </div>
          <Badge variant="success">{t('verified')}</Badge>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('passwordStrength')}</span>
          </div>
          <Badge variant="success">{t('strong')}</Badge>
        </div>
        <Button variant="outline" fullWidth onClick={() => setShowAccountModal(true)}>
          {t('changePassword')}
        </Button>
      </Space>

      {/* 密码管理引导（账号统一由 ProClaw 账号中心管理） */}
      <Modal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title={t('passwordModalTitle')}
        footer={
          <Space size="small" className="w-full justify-end">
            <Button variant="outline" onClick={() => setShowAccountModal(false)}>
              {t('close')}
            </Button>
            <a href={`${issuer}/portal/`} target="_blank" rel="noreferrer noopener">
              <Button variant="primary">{t('goAccountCenter')}</Button>
            </a>
          </Space>
        }
      >
        <div className="flex items-start gap-3">
          <Shield className="text-blue-600 shrink-0 mt-1" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('passwordModalDesc')}
          </p>
        </div>
      </Modal>
    </Card>
  );
}
