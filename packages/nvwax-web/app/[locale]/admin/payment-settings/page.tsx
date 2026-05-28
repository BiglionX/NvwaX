'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { CreditCard, Save, Loader2, CheckCircle, XCircle, Wallet, Smartphone, AlertCircle } from 'lucide-react';

export default function PaymentSettingsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [orderPage, setOrderPage] = useState(1);

  // 获取支付配置
  const { data: configs, isLoading: loadingConfigs } = useQuery({
    queryKey: ['admin-payment-configs'],
    queryFn: () => adminApi.getPaymentConfigs(),
    retry: 1
  });

  // 获取Token订单
  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ['admin-token-orders', orderPage, statusFilter],
    queryFn: () => adminApi.getTokenOrders(orderPage, 20, statusFilter || undefined),
    retry: 1
  });

  // 保存支付配置
  const saveConfigMutation = useMutation({
    mutationFn: (data: { provider: string; provider_label: string; qr_code_url?: string; account_name?: string; account_info?: string; sort_order?: number }) =>
      adminApi.savePaymentConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-configs'] });
    }
  });

  // 切换支付配置状态
  const toggleMutation = useMutation({
    mutationFn: ({ provider, enabled }: { provider: string; enabled: boolean }) =>
      adminApi.togglePaymentConfig(provider, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-configs'] });
    }
  });

  // 确认付款
  const confirmMutation = useMutation({
    mutationFn: (orderId: string) => adminApi.confirmTokenOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-token-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-token-overview'] });
    }
  });

  // 取消订单
  const cancelMutation = useMutation({
    mutationFn: (orderId: string) => adminApi.cancelTokenOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-token-orders'] });
    }
  });



  const formatAmount = (amount: number) => `¥${amount.toFixed(2)}`;
  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium"><CheckCircle size={12} /> 已付款</span>;
      case 'pending':
        return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium"><AlertCircle size={12} /> 待付款</span>;
      case 'cancelled':
        return <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full text-xs font-medium"><XCircle size={12} /> 已取消</span>;
      default:
        return <span className="text-xs">{status}</span>;
    }
  };

  const getConfig = (provider: string) => {
    if (!configs) return null;
    return configs.find((c: { provider: string }) => c.provider === provider);
  };

  const ConfigCard = ({ provider, label, icon, description }: { provider: string; label: string; icon: React.ReactNode; description: string }) => {
    const config = getConfig(provider);
    const isEnabled = config?.enabled || false;
    const [localForm, setLocalForm] = useState({
      provider_label: config?.provider_label || label,
      qr_code_url: config?.qr_code_url || '',
      account_name: config?.account_name || '',
      account_info: config?.account_info || '',
      sort_order: config?.sort_order ?? (provider === 'wechat' ? 0 : 1)
    });

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{label}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
          </div>
          <button
            onClick={() => toggleMutation.mutate({ provider, enabled: !isEnabled })}
            disabled={toggleMutation.isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">名称</label>
            <input
              type="text"
              value={localForm.provider_label}
              onChange={(e) => setLocalForm({ ...localForm, provider_label: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-900 dark:text-white text-sm"
              placeholder={label}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">收款二维码URL</label>
            <input
              type="text"
              value={localForm.qr_code_url}
              onChange={(e) => setLocalForm({ ...localForm, qr_code_url: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-900 dark:text-white text-sm"
              placeholder="输入二维码图片URL..."
            />
            {localForm.qr_code_url && (
              <div className="mt-2 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={localForm.qr_code_url}
                  alt={`${localForm.provider_label} 二维码预览`}
                  className="w-20 h-20 object-contain border border-gray-200 dark:border-gray-600 rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-xs text-gray-400">二维码预览</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">账户名称</label>
            <input
              type="text"
              value={localForm.account_name}
              onChange={(e) => setLocalForm({ ...localForm, account_name: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-900 dark:text-white text-sm"
              placeholder="例如：张三"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">账户信息（选填）</label>
            <input
              type="text"
              value={localForm.account_info}
              onChange={(e) => setLocalForm({ ...localForm, account_info: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-900 dark:text-white text-sm"
              placeholder="例如：微信号 / 支付宝账号"
            />
          </div>

          <button
            onClick={() => saveConfigMutation.mutate({
              provider,
              provider_label: localForm.provider_label,
              qr_code_url: localForm.qr_code_url || undefined,
              account_name: localForm.account_name || undefined,
              account_info: localForm.account_info || undefined,
              sort_order: localForm.sort_order
            })}
            disabled={saveConfigMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {saveConfigMutation.isPending ? (
              <><Loader2 className="animate-spin" size={16} /> 保存中...</>
            ) : (
              <><Save size={16} /> 保存配置</>
            )}
          </button>
        </div>
      </div>
    );
  };

  if (loadingConfigs) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <Loader2 className="animate-spin mr-2" size={24} />
        加载中...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">支付设置</h1>
            <p className="text-gray-600 dark:text-gray-300">配置微信/支付宝收款信息</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle size={16} />
            <span>定价: ¥10 = 1,000,000 tokens</span>
          </div>
        </div>
      </div>

      {/* 支付配置卡片 */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <ConfigCard
          provider="wechat"
          label="微信支付"
          icon={<Smartphone className="text-green-500" size={28} />}
          description="配置微信收款码和账户信息"
        />
        <ConfigCard
          provider="alipay"
          label="支付宝"
          icon={<Wallet className="text-blue-500" size={28} />}
          description="配置支付宝收款码和账户信息"
        />
      </div>

      {/* Token订单管理 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CreditCard className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Token购买订单</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setOrderPage(1); }}
              className="px-3 py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:border-blue-500"
            >
              <option value="">全部状态</option>
              <option value="pending">待付款</option>
              <option value="paid">已付款</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
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
                    <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">订单号</th>
                    <th className="text-left py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">用户</th>
                    <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">金额</th>
                    <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Token数</th>
                    <th className="text-center py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">支付方式</th>
                    <th className="text-center py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">状态</th>
                    <th className="text-right py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">时间</th>
                    <th className="text-center py-3 px-3 text-sm font-semibold text-gray-600 dark:text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersData.data.map((order: { id: string; user_name?: string; user_email?: string; user_id: string; amount: number; tokens: number; payment_method: string; status: string; created_at: string }) => (
                    <tr key={order.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-3 text-xs text-gray-900 dark:text-white font-mono">
                        {order.id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-900 dark:text-white">
                        {order.user_name || order.user_email || order.user_id?.substring(0, 8)}
                      </td>
                      <td className="py-3 px-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {formatAmount(order.amount)}
                      </td>
                      <td className="py-3 px-3 text-sm text-right text-gray-600 dark:text-gray-400">
                        {formatTokens(order.tokens)}
                      </td>
                      <td className="py-3 px-3 text-sm text-center text-gray-600 dark:text-gray-400">
                        {order.payment_method === 'wechat' ? '微信' : '支付宝'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {statusBadge(order.status)}
                      </td>
                      <td className="py-3 px-3 text-xs text-right text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {order.status === 'pending' && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => confirmMutation.mutate(order.id)}
                              disabled={confirmMutation.isPending}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs disabled:opacity-50 transition-colors"
                            >
                              确认付款
                            </button>
                            <button
                              onClick={() => cancelMutation.mutate(order.id)}
                              disabled={cancelMutation.isPending}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs disabled:opacity-50 transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {ordersData.total > 20 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-500">
                  共 {ordersData.total} 条记录
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                    disabled={orderPage <= 1}
                    className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setOrderPage(p => p + 1)}
                    disabled={orderPage * 20 >= ordersData.total}
                    className="px-3 py-1 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-300"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <CreditCard className="mx-auto mb-3" size={40} />
            <p>暂无订单记录</p>
          </div>
        )}
      </div>
    </div>
  );
}
