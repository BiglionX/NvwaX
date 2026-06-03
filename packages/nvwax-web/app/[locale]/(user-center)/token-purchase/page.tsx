'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { userApi } from '@/lib/api/users';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingCart, Coins, Smartphone, Wallet, CheckCircle, Loader2, AlertCircle, ArrowLeft, CreditCard } from 'lucide-react';
import LoadingState from '@/components/Layout/LoadingState';
import { Card, Button } from '@/components/UI';

const TOKEN_RATE = 100000; // 每元兑换token数
const PACKAGE_AMOUNT = 10; // 固定套餐 ¥10

export default function TokenPurchasePage() {
  const { userInfo } = useAuth();
  const userId = userInfo?.id;

  const [selectedPackage, setSelectedPackage] = useState<'fixed' | 'custom'>('fixed');
  const [customAmount, setCustomAmount] = useState<number>(1);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [orderResult, setOrderResult] = useState<{
    order: Record<string, unknown>;
    paymentConfig: Record<string, unknown> | null;
  } | null>(null);

  // Stripe 重定向状态
  const [stripeSuccess, setStripeSuccess] = useState(false);
  const [stripeCancelled, setStripeCancelled] = useState(false);
  const [stripeOrderId, setStripeOrderId] = useState<string | null>(null);

  // 解析 Stripe 重定向回传参数
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setStripeSuccess(true);
      setStripeOrderId(params.get('order_id'));
    } else if (params.get('cancelled') === 'true') {
      setStripeCancelled(true);
    }
  }, []);

  // 获取可用的支付方式
  const { data: paymentData, isLoading: loadingPayments } = useQuery({
    queryKey: ['user-payment-configs'],
    queryFn: () => userApi.getPaymentConfigs(),
    retry: 1
  });

  const paymentConfigs: Array<{ provider: string; provider_label: string; qr_code_url?: string }> =
    paymentData?.providers || [];
  const stripeAvailable = paymentData?.stripeAvailable || false;

  // 创建订单（微信/支付宝）
  const createOrderMutation = useMutation({
    mutationFn: ({ amount, paymentMethod }: { amount: number; paymentMethod: string }) =>
      userApi.createTokenOrder(userId!, amount, paymentMethod),
    onSuccess: (data) => {
      setOrderResult(data);
    }
  });

  // 创建 Stripe Checkout Session
  const createStripeSessionMutation = useMutation({
    mutationFn: (amount: number) => userApi.createStripeCheckoutSession(userId!, amount),
    onSuccess: (data) => {
      if (data?.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    }
  });

  // 默认选中第一个支付方式
  useEffect(() => {
    if (!selectedPayment) {
      if (paymentConfigs.length > 0) {
        setSelectedPayment(paymentConfigs[0].provider);
      } else if (stripeAvailable) {
        setSelectedPayment('stripe');
      }
    }
  }, [paymentConfigs, stripeAvailable, selectedPayment]);

  const getAmount = () => {
    if (selectedPackage === 'fixed') return PACKAGE_AMOUNT;
    return Math.max(1, customAmount);
  };

  const getTokens = () => {
    return getAmount() * TOKEN_RATE;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const handlePurchase = () => {
    if (!selectedPayment) return;

    if (selectedPayment === 'stripe') {
      createStripeSessionMutation.mutate(getAmount());
    } else {
      createOrderMutation.mutate({
        amount: getAmount(),
        paymentMethod: selectedPayment
      });
    }
  };

  const handleReset = () => {
    setOrderResult(null);
    setSelectedPackage('fixed');
    setCustomAmount(1);
  };

  if (loadingPayments) {
    return <LoadingState />;
  }

  // Stripe 支付成功页面
  if (stripeSuccess) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">支付成功</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Stripe 支付已完成，Token 已自动到账</p>
        </div>

        <Card>
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="text-green-500" size={32} />
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">支付已完成</h2>
            <p className="text-sm text-gray-500 mb-4">
              订单号: {(stripeOrderId || '').substring(0, 16)}...
            </p>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mb-6 max-w-sm mx-auto">
              <p className="text-sm text-green-700 dark:text-green-400">
                ✅ Token 已自动充值到您的账户
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => { window.location.href = '/token-purchase'; }}
              className="w-full max-w-sm mx-auto"
            >
              继续购买
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Stripe 取消页面
  if (stripeCancelled) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">支付已取消</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">您已取消 Stripe 支付</p>
        </div>

        <Card>
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="text-yellow-500" size={32} />
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">支付未完成</h2>
            <p className="text-sm text-gray-500 mb-6">
              如果您仍想购买 Token，请重新下单
            </p>

            <Button
              variant="primary"
              onClick={() => { window.location.href = '/token-purchase'; }}
              className="w-full max-w-sm mx-auto"
            >
              重新购买
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 订单已创建，显示支付信息（微信/支付宝）
  if (orderResult) {
    const paymentInfo = orderResult.paymentConfig as Record<string, unknown> | null;
    const order = orderResult.order as Record<string, unknown>;

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">订单已创建</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">请使用手机扫码完成支付</p>
        </div>

        <Card>
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="text-green-500" size={32} />
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">等待付款</h2>
            <p className="text-sm text-gray-500 mb-6">
              订单号: {(order.id as string)?.substring(0, 16)}...
            </p>

            {/* 金额和Token信息 */}
            <div className="grid grid-cols-2 gap-4 mb-6 max-w-sm mx-auto">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">支付金额</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">¥{Number(order.amount).toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">获得Token</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatTokens(Number(order.tokens))}</p>
              </div>
            </div>

            {/* 支付信息 */}
            {paymentInfo ? (
              <div className="max-w-sm mx-auto">
                <div className="flex items-center justify-center gap-2 mb-4">
                  {selectedPayment === 'wechat' ? (
                    <Smartphone className="text-green-500" size={24} />
                  ) : (
                    <Wallet className="text-blue-500" size={24} />
                  )}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {paymentInfo.provider_label as string}
                  </span>
                </div>

                {!!paymentInfo.qr_code_url && (
                  <div className="mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={paymentInfo.qr_code_url as string}
                      alt={`${paymentInfo.provider_label as string}收款码`}
                      className="w-48 h-48 mx-auto object-contain border-2 border-gray-200 dark:border-gray-700 rounded-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {!!paymentInfo.account_name && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    收款账户: <strong>{paymentInfo.account_name as string}</strong>
                  </p>
                )}
                {!!paymentInfo.account_info && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {paymentInfo.account_info as string}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-4 max-w-sm mx-auto">
                <AlertCircle className="text-yellow-500" size={18} />
                <span className="text-sm text-yellow-700 dark:text-yellow-400">管理员尚未配置支付信息，请联系管理员</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-6 max-w-sm mx-auto">
              <AlertCircle className="text-blue-500" size={18} />
              <span className="text-xs text-blue-700 dark:text-blue-400">
                支付成功后，请联系管理员确认到账，管理员确认后Token会自动到账
              </span>
            </div>

            <Button variant="outline" onClick={handleReset} className="w-full max-w-sm mx-auto">
              <ArrowLeft size={16} />
              返回重新购买
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">购买Token</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">选择套餐并完成支付，即可增加可用Token配额</p>
      </div>

      {/* 定价说明 */}
      <Card className="mb-6">
        <div className="p-4 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-t-xl border-b border-blue-100 dark:border-blue-800">
          <Coins className="text-yellow-500 shrink-0" size={24} />
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-300">定价方案</p>
            <p className="text-sm text-blue-700 dark:text-blue-400">¥{PACKAGE_AMOUNT} = {formatTokens(PACKAGE_AMOUNT * TOKEN_RATE)} Tokens</p>
          </div>
        </div>
      </Card>

      {/* 选择套餐 */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">选择套餐</h2>

          {/* 固定套餐 */}
          <div
            onClick={() => setSelectedPackage('fixed')}
            className={`p-4 border-2 rounded-xl mb-3 cursor-pointer transition-all ${
              selectedPackage === 'fixed'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">推荐套餐</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">获得 {formatTokens(PACKAGE_AMOUNT * TOKEN_RATE)} Tokens</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">¥{PACKAGE_AMOUNT}</p>
                <p className="text-xs text-gray-400">超值优惠</p>
              </div>
            </div>
          </div>

          {/* 自定义金额 */}
          <div
            onClick={() => setSelectedPackage('custom')}
            className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
              selectedPackage === 'custom'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">自定义金额</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">按 ¥1 = {formatTokens(TOKEN_RATE)} 比例兑换</p>
              </div>
            </div>
            {selectedPackage === 'custom' && (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">¥</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full pl-8 pr-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-gray-900 dark:text-white text-lg font-semibold"
                  />
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">可获得</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatTokens(customAmount * TOKEN_RATE)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 选择支付方式 */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">选择支付方式</h2>

          {paymentConfigs.length > 0 || stripeAvailable ? (
            <div className="grid grid-cols-2 gap-4">
              {paymentConfigs.map((config: { provider: string; provider_label: string; qr_code_url?: string }) => (
                <div
                  key={config.provider}
                  onClick={() => setSelectedPayment(config.provider)}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all text-center ${
                    selectedPayment === config.provider
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    {config.provider === 'wechat' ? (
                      <Smartphone className="text-green-500" size={36} />
                    ) : (
                      <Wallet className="text-blue-500" size={36} />
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">{config.provider_label}</p>
                  {selectedPayment === config.provider && (
                    <CheckCircle className="mx-auto mt-2 text-blue-500" size={20} />
                  )}
                </div>
              ))}
              {stripeAvailable && (
                <div
                  onClick={() => setSelectedPayment('stripe')}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all text-center ${
                    selectedPayment === 'stripe'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    <CreditCard className="text-purple-500" size={36} />
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">Stripe（信用卡）</p>
                  <p className="text-xs text-gray-400 mt-1">海外用户适用</p>
                  {selectedPayment === 'stripe' && (
                    <CheckCircle className="mx-auto mt-2 text-blue-500" size={20} />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <AlertCircle className="mx-auto mb-2" size={32} />
              <p className="text-sm">暂无可用支付方式</p>
              <p className="text-xs text-gray-400 mt-1">请联系管理员配置支付信息</p>
            </div>
          )}
        </div>
      </Card>

      {/* 结算信息 */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">支付金额</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">¥{getAmount().toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between mb-6">
            <span className="text-gray-600 dark:text-gray-400">获得Token</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatTokens(getTokens())}</span>
          </div>

          <Button
            variant="primary"
            onClick={handlePurchase}
            disabled={!selectedPayment || createOrderMutation.isPending || createStripeSessionMutation.isPending}
            fullWidth
            size="lg"
          >
            {createOrderMutation.isPending ? (
              <><Loader2 className="animate-spin" size={18} /> 创建订单中...</>
            ) : createStripeSessionMutation.isPending ? (
              <><Loader2 className="animate-spin" size={18} /> 跳转到 Stripe...</>
            ) : (
              <><ShoppingCart size={18} /> 立即购买</>
            )}
          </Button>

          {(createOrderMutation.isError || createStripeSessionMutation.isError) && (
            <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="text-red-500 shrink-0" size={18} />
              <span className="text-sm text-red-700 dark:text-red-400">
                {(createOrderMutation.error as Error)?.message || (createStripeSessionMutation.error as Error)?.message || '创建订单失败，请重试'}
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
