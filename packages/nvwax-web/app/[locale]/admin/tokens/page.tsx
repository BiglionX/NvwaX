'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Coins, AlertTriangle, Users, Zap, Search, RefreshCw, BarChart3, PieChart } from 'lucide-react';
import LoadingState from '@/components/Layout/LoadingState';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function AdminTokensPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [breakdownPeriod, setBreakdownPeriod] = useState<'day' | 'week' | 'month'>('month');
  const limit = 20;

  // 总览统计
  const { data: overview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['admin-token-overview'],
    queryFn: () => adminApi.getTokenOverview(),
    retry: 1
  });

  // 用户列表
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-token-users', page, search],
    queryFn: () => adminApi.getTokenUsersList(page, limit, search || undefined),
    retry: 1
  });

  // 消耗来源分类
  const { data: breakdown, isLoading: isLoadingBreakdown } = useQuery({
    queryKey: ['admin-token-breakdown', breakdownPeriod],
    queryFn: () => adminApi.getTokenConsumptionBreakdown(breakdownPeriod),
    retry: 1
  });

  // 用户详情
  const { data: userDetail, isLoading: isLoadingUserDetail } = useQuery({
    queryKey: ['admin-token-user-detail', selectedUser],
    queryFn: () => adminApi.getTokenUserDetail(selectedUser!, 1, 50),
    enabled: !!selectedUser,
    retry: 1
  });

  // 重置月度配额
  const resetMutation = useMutation({
    mutationFn: () => adminApi.resetMonthlyQuotas(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-token-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-token-users'] });
    }
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const formatCost = (cost: number) => {
    return `¥${cost.toFixed(2)}`;
  };

  const isLoading = isLoadingOverview || isLoadingUsers || isLoadingBreakdown;

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Token 管理</h1>
        <p className="text-gray-600 dark:text-gray-300">管理用户Token配额，监控消耗状况</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="text-blue-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">使用用户数</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {overview?.totalUsers || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Zap className="text-green-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">本月总消耗</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatTokens(overview?.totalTokensThisMonth || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-orange-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">超额Token数</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatTokens(overview?.totalOverageTokens || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Coins className="text-red-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">超额费用</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCost(overview?.totalOverageCost || 0)}
          </p>
        </div>
      </div>

      {/* 图表行 */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* 消耗来源饼图 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PieChart className="text-blue-500" size={20} />
              消耗来源分布
            </h2>
            <select
              value={breakdownPeriod}
              onChange={(e) => setBreakdownPeriod(e.target.value as 'day' | 'week' | 'month')}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value="day">今天</option>
              <option value="week">近7天</option>
              <option value="month">近30天</option>
            </select>
          </div>
          {breakdown && breakdown.length > 0 ? (
            <div className="h-75">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={breakdown}
                    dataKey="total_tokens"
                    nameKey="endpoint"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={(entry: any) => {
                      const e = entry as { endpoint: string; total_tokens: number };
                      return `${e.endpoint.length > 25 ? e.endpoint.slice(0, 25) + '...' : e.endpoint}: ${formatTokens(e.total_tokens)}`;
                    }}
                  >
                    {breakdown.map((_entry: { endpoint: string; total_tokens: number; source_type: string; request_count: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown) => formatTokens(Number(value) || 0)}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="mx-auto mb-2 opacity-50" size={48} />
              <p>暂无消耗数据</p>
            </div>
          )}
        </div>

        {/* 消耗柱状图 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="text-green-500" size={20} />
            消耗来源对比
          </h2>
          {breakdown && breakdown.length > 0 ? (
            <div className="h-75">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="endpoint"
                    stroke="#9ca3af"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val: string) => val.length > 15 ? val.slice(0, 15) + '...' : val}
                  />
                  <YAxis stroke="#9ca3af" tickFormatter={(val: number) => formatTokens(val)} />
                  <Tooltip
                    formatter={(value: unknown) => formatTokens(Number(value) || 0)}
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                  />
                  <Bar dataKey="total_tokens" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 className="mx-auto mb-2 opacity-50" size={48} />
              <p>暂无消耗数据</p>
            </div>
          )}
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">用户 Token 消耗排行</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索邮箱或姓名..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white text-sm w-64"
            />
          </div>
        </div>
        <button
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw size={16} className={resetMutation.isPending ? 'animate-spin' : ''} />
          重置月度配额
        </button>
      </div>

      {/* 用户列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">用户</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">月配额</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">本月已用</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">剩余</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">使用率</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">超额Token</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">超额费用</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {usersData?.data?.length > 0 ? (
                usersData.data.map((user: { user_id: string; user_name: string; user_email: string; monthly_limit: number; used_this_month: number; remaining: number; usage_percent: number; overage_tokens: number; overage_cost: number; total_used: number }) => (
                  <tr key={user.user_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user.user_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.user_email}</p>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{formatTokens(user.monthly_limit)}</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{formatTokens(user.used_this_month)}</span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`text-sm font-medium ${user.remaining <= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatTokens(user.remaining)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              user.usage_percent > 100 ? 'bg-red-500' : user.usage_percent > 80 ? 'bg-orange-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(user.usage_percent, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                          {user.usage_percent}%
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`text-sm ${user.overage_tokens > 0 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                        {user.overage_tokens > 0 ? formatTokens(user.overage_tokens) : '-'}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={`text-sm ${user.overage_cost > 0 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                        {user.overage_cost > 0 ? formatCost(user.overage_cost) : '-'}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <button
                        onClick={() => setSelectedUser(selectedUser === user.user_id ? null : user.user_id)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        {selectedUser === user.user_id ? '收起' : '详情'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <Users className="mx-auto mb-2 opacity-50" size={48} />
                    <p>暂无用户Token数据</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {usersData && usersData.total > limit && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {`第 ${page} / ${Math.ceil(usersData.total / limit)} 页，共 ${usersData.total} 条记录`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(usersData.total / limit)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 用户详情面板 */}
      {selectedUser && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">用户消耗明细</h2>
          {isLoadingUserDetail ? (
            <LoadingState />
          ) : userDetail ? (
            <>
              {/* 配额概览 */}
              {userDetail.quota && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">月配额</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatTokens(userDetail.quota.monthlyLimit)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">本月已用</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatTokens(userDetail.quota.usedThisMonth)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">剩余</p>
                    <p className={`text-lg font-bold ${userDetail.quota.remaining <= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {formatTokens(userDetail.quota.remaining)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">使用率</p>
                    <p className={`text-lg font-bold ${userDetail.quota.usagePercent > 100 ? 'text-red-500' : userDetail.quota.usagePercent > 80 ? 'text-orange-500' : 'text-blue-500'}`}>
                      {userDetail.quota.usagePercent}%
                    </p>
                  </div>
                </div>
              )}

              {/* 消费明细列表 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">时间</th>
                      <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">来源</th>
                      <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">端点</th>
                      <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Token数</th>
                      <th className="text-center py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">超额</th>
                      <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">超额费用</th>
                      <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">模型</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDetail.transactions?.length > 0 ? (
                      userDetail.transactions.map((tx: { id: string; created_at: string; source_type: string; endpoint: string; tokens_consumed: number; is_overage: boolean; overage_cost: number; model: string }) => (
                        <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                          <td className="py-3 px-3 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(tx.created_at).toLocaleString('zh-CN')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                              {tx.source_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 max-w-40 truncate" title={tx.endpoint}>
                            {tx.endpoint || '-'}
                          </td>
                          <td className="text-right py-3 px-3">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatTokens(tx.tokens_consumed)}
                            </span>
                          </td>
                          <td className="text-center py-3 px-3">
                            {tx.is_overage ? (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs">是</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs">否</span>
                            )}
                          </td>
                          <td className="text-right py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                            {tx.overage_cost > 0 ? formatCost(tx.overage_cost) : '-'}
                          </td>
                          <td className="py-3 px-3 text-sm text-gray-500 dark:text-gray-400">
                            {tx.model || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          <p>暂无消费记录</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>该用户暂无配额数据</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
