'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Users, Folder, Shield, Activity, TrendingUp, Clock } from 'lucide-react';
import LoadingState from '@/components/Layout/LoadingState';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 注意：权限验证已由 ProtectedAdminRoute 在 layout 层面处理，无需在此重复检查

export default function AdminDashboardPage() {
  console.log('[AdminDashboard] Component rendering...');
  
  // Hooks 必须在条件语句之前调用
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getSystemStats(),
    retry: 1
  });

  const { data: logs, isLoading: isLoadingLogs, error: logsError } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => adminApi.getSystemLogs(1, 10),
    retry: 1
  });
  
  const isLoading = isLoadingStats || isLoadingLogs;
  
  console.log('[AdminDashboard] Query state:', { 
    isLoading, 
    isLoadingStats, 
    isLoadingLogs,
    hasStats: !!stats, 
    hasLogs: !!logs,
    statsError,
    logsError
  });

  const statCards = [
    {
      label: '管理员总数',
      value: stats?.totalAdmins || 0,
      icon: Shield,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      label: '用户总数',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      label: '项目总数',
      value: stats?.totalProjects || 0,
      icon: Folder,
      color: 'bg-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      label: '系统运行时间',
      value: stats?.systemUptime ? `${Math.floor(stats.systemUptime / 3600)}小时` : '0小时',
      icon: Activity,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30'
    }
  ];

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">数据看板</h1>
        <p className="text-gray-600 dark:text-gray-400">系统运行概况和实时统计</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={stat.color.replace('bg-', 'text-')} size={24} />
                </div>
                <TrendingUp className="text-gray-400" size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Logs & Charts */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* User Growth Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">近 7 天用户增长趋势</h2>
          <div className="h-75">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.userTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">系统信息</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="text-blue-500" size={20} />
                <span className="text-gray-600 dark:text-gray-300">运行时间</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">
                {Math.floor(stats?.systemUptime / 3600)} 小时
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="text-green-500" size={20} />
                <span className="text-gray-600 dark:text-gray-300">系统状态</span>
              </div>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                正常运行
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">最近系统日志</h2>
        </div>
        <div className="p-6">
          {logs?.data?.length > 0 ? (
            <div className="space-y-4">
              {logs.data.map((log: { id: string; level: string; action: string; details?: string; created_at: string }) => (
                <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className={`w-2 h-2 mt-2 rounded-full ${
                    log.level === 'warning' ? 'bg-yellow-500' : 
                    log.level === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900 dark:text-white">{log.action}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock size={14} />
                        <span>{new Date(log.created_at).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="mx-auto mb-2 opacity-50" size={48} />
              <p>暂无日志记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
