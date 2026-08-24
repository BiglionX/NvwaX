'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Folder, Users, Bot, Plus, ArrowRight, FolderOpen, Lock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { userApi } from '@/lib/api/users';
import { projectApi, Project } from '@/lib/api/projects';
import LoadingState from '@/components/Layout/LoadingState';
import { Card, Button, EmptyState } from '@/components/UI';

/**
 * NvwaX 用户工作台（真实数据）
 *
 * 原实现为整页模拟数据（假进度、假趋势图），登录后展示伪造统计，
 * 已重写为基于真实 API 的个人总览：
 * - 统计卡片：项目数 / AiTeam 数 / Agent Team 数（GET /user/stats）
 * - 最近项目列表（GET /projects）
 * - 快捷入口：组建 AI 公司、AI 团队市场、人才库
 */

export default function ProjectDashboard() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading, userInfo } = useAuth();

  const { data: stats, isLoading: loadingStats, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['user-stats', userInfo?.id],
    queryFn: () => userApi.getStats(userInfo?.id || ''),
    enabled: !!userInfo?.id,
    retry: 1,
  });

  const { data: projectsData, isLoading: loadingProjects, isError: projectsError, refetch: refetchProjects } = useQuery({
    queryKey: ['dashboard-projects', userInfo?.id],
    queryFn: () => projectApi.getProjects(userInfo?.id || '', 1, 5),
    enabled: !!userInfo?.id,
    retry: 1,
  });

  // 未登录：提示并引导登录（middleware 已做路由级保护，此处兜底）
  if (!authLoading && !isLoggedIn) {
    return (
      <div className="min-h-[60vh] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card padding="lg" className="max-w-md w-full text-center">
          <LockIcon />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">请先登录</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">登录后查看您的项目与团队概览。</p>
          <Button variant="primary" onClick={() => router.push('/login?redirect=/dashboard')}>
            前往登录
          </Button>
        </Card>
      </div>
    );
  }

  if (authLoading || loadingStats || loadingProjects) {
    return <LoadingState text="加载中..." />;
  }

  const projects: Project[] = projectsData?.data || [];

  // 任一数据源失败：给出可重试的错误态（不再无限 loading）
  if (statsError || projectsError) {
    return (
      <div className="min-h-[60vh] bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card padding="lg" className="max-w-md w-full text-center border-red-200 dark:border-red-900/50">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">数据加载失败</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            暂时无法获取您的数据，请检查网络后重试。
          </p>
          <Button variant="primary" onClick={() => { refetchStats(); refetchProjects(); }}>
            重试
          </Button>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      label: '项目数',
      value: stats?.projectCount ?? 0,
      icon: Folder,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      href: '/projects',
    },
    {
      label: 'AI 公司数',
      value: stats?.teamCount ?? 0,
      icon: Users,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      href: '/my-aiteam',
    },
    {
      label: 'AI 合伙人',
      value: stats?.agentTeamCount ?? 0,
      icon: Bot,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      href: '/agent-repository',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            👋 欢迎回来{userInfo?.name ? `，${userInfo.name}` : ''}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            这里是您的项目与团队总览。
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Link key={index} href={stat.href} className="block group">
                <Card className="hover:border-blue-300 dark:hover:border-blue-700 transition-all group-hover:shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={stat.iconColor} size={20} />
                    </div>
                    <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                  <p className="text-3xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* 快捷操作 */}
        <div className="flex flex-wrap gap-3">
          <Link href="/nvwa">
            <Button variant="primary" icon={<Plus size={16} />}>
              组建 AI 公司
            </Button>
          </Link>
          <Link href="/my-aiteam">
            <Button variant="outline" icon={<Users size={16} />}>
              我的 AI 公司
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="outline" icon={<FolderOpen size={16} />}>
              去 AI 团队市场
            </Button>
          </Link>
          <Link href="/agent-repository">
            <Button variant="outline" icon={<Bot size={16} />}>
              人才库 · 员工管理
            </Button>
          </Link>
        </div>

        {/* 最近项目 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Folder size={20} className="text-blue-600" />
              最近项目
            </h2>
            <Link href="/projects" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
              查看全部 →
            </Link>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              icon={<Folder size={40} />}
              title="还没有项目"
              description="创建您的第一个 AI 项目，开始组建 AI 团队。"
              actionText="创建项目"
              onAction={() => router.push('/projects')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="block group">
                  <Card className="hover:border-blue-300 dark:hover:border-blue-700 transition-all group-hover:shadow-md h-full">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
                        <Folder size={18} className="text-white" />
                      </div>
                      <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                      {project.name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {project.description || '暂无描述'}
                    </p>
                    <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function LockIcon() {
  return (
    <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
      <Lock size={26} className="text-blue-600 dark:text-blue-400" />
    </div>
  );
}
