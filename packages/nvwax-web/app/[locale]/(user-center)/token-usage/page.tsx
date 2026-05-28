'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '@/lib/api/users';
import { useAuth } from '@/hooks/useAuth';
import { Coins, Zap, AlertTriangle, Clock, ArrowUpRight, Loader2, CheckCircle, XCircle } from 'lucide-react';
import LoadingState from '@/components/Layout/LoadingState';
import { Card } from '@/components/UI';

export default function TokenUsagePage() {
  const { userInfo } = useAuth();
  const userId = userInfo?.id;
  const [txPage, setTxPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);

  // 获取Token配额
  const { data: quota, isLoading: loadingQuota } = useQuery({
    queryKey: ['user-token-quota', userId],
    queryFn: () => userApi.getTokenQuota(userId!),
    enabled: !!userId,
    retry: 1
  });

  // 获取消费记录
  const { data: txsData, isLoading: loadingTxs } = useQuery({
    queryKey: ['user-token-transactions', userId, txPage],
    queryFn: () => userApi.getTokenTransactions(userId!, txPage, 20),
    enabled: !!userId,
    retry: 1
  });

  // 获取购买订单
  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ['user-token-orders', userId, orderPage],
    queryFn: () => userApi.getTokenOrders(userId!, orderPage, 20),
    enabled: !!userId,
    retry: 1
  });

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

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs"><CheckCircle size={12} /> 已付款</span>;
      case 'pending':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs"><Clock size={12} /> 待付款</span>;
      case 'cancelled':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full text-xs"><XCircle size={12} /> 已取消</span>;
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  if (loadingQuota) {
    return <LoadingState />;
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Token消耗</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">查看您的Token使用情况和购买记录</p>
      </div>

      {/* Token配额概览 */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Coins className="text-yellow-500" size={24} />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">本月配额</h2>
          </div>

          {quota ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">月度限额</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatTokens(quota.monthlyLimit)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">本月已用</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatTokens(quota.usedThisMonth)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">剩余</p>
                  <p className={`text-xl font-bold ${quota.remaining <= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {formatTokens(quota.remaining)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">累计已用</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatTokens(quota.totalUsed)}</p>
                </div>
              </div>

              {/* 使用率进度条 */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">使用率</span>
                  <span className={`text-sm font-semibold ${
                    quota.usagePercent > 100 ? 'text-red-500' :
                    quota.usagePercent > 80 ? 'text-orange-500' : 'text-blue-500'
                  }`}>{quota.usagePercent}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      quota.usagePercent > 100 ? 'bg-red-500' :
                      quota.usagePercent > 80 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(quota.usagePercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* 超额信息 */}
              {quota.overageTokens > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertTriangle className="text-red-500 shrink-0" size={18} />
                  <div className="text-sm text-red-700 dark:text-red-400">
                    超额使用 <strong>{formatTokens(quota.overageTokens)}</strong> Tokens，超额费用 <strong>{formatCost(quota.overageCost)}</strong>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Coins className="mx-auto mb-2" size={32} />
              <p className="text-sm">暂无配额数据</p>
              <p className="text-xs text-gray-400 mt-1">新注册用户默认每月赠送 {formatTokens(1000000)} 免费额度</p>
            </div>
          )}
        </div>
      </Card>

      {/* 消费记录 */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="text-orange-500" size={20} />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">消费记录</h2>
          </div>

          {loadingTxs ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="animate-spin mx-auto mb-2" size={24} />
              加载中...
            </div>
          ) : txsData?.data?.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500">时间</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500">来源</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500">模型</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Token数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txsData.data.map((tx: { id: string; source_type: string; model?: string; tokens_consumed: number; created_at: string; endpoint?: string }) => (
                      <tr key={tx.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 px-2 text-xs text-gray-500">
                          {new Date(tx.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-900 dark:text-white">
                          {tx.source_type === 'api_call' ? (tx.endpoint || 'API调用') : tx.source_type}
                        </td>
                        <td className="py-2 px-2 text-xs text-gray-500">{tx.model || '-'}</td>
                        <td className="py-2 px-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatTokens(tx.tokens_consumed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {txsData.total > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setTxPage(p => Math.max(1, p - 1))}
                    disabled={txPage <= 1}
                    className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setTxPage(p => p + 1)}
                    disabled={txPage * 20 >= txsData.total}
                    className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">暂无消费记录</p>
            </div>
          )}
        </div>
      </Card>

      {/* 购买记录 */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpRight className="text-green-500" size={20} />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">购买记录</h2>
          </div>

          {loadingOrders ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="animate-spin mx-auto mb-2" size={24} />
              加载中...
            </div>
          ) : ordersData?.data?.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 text-xs font-semibold text-gray-500">订单号</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">金额</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">Token数</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500">支付方式</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-gray-500">状态</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-gray-500">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersData.data.map((order: { id: string; amount: number; tokens: number; payment_method: string; status: string; created_at: string }) => (
                      <tr key={order.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 px-2 text-xs text-gray-500 font-mono">{order.id.substring(0, 8)}...</td>
                        <td className="py-2 px-2 text-sm text-right font-medium text-gray-900 dark:text-white">¥{order.amount.toFixed(2)}</td>
                        <td className="py-2 px-2 text-sm text-right text-gray-600 dark:text-gray-400">{formatTokens(order.tokens)}</td>
                        <td className="py-2 px-2 text-sm text-center text-gray-600 dark:text-gray-400">
                          {order.payment_method === 'wechat' ? '微信' : '支付宝'}
                        </td>
                        <td className="py-2 px-2 text-center">{statusBadge(order.status)}</td>
                        <td className="py-2 px-2 text-xs text-right text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ordersData.total > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                    disabled={orderPage <= 1}
                    className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setOrderPage(p => p + 1)}
                    disabled={orderPage * 20 >= ordersData.total}
                    className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">暂无购买记录</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
