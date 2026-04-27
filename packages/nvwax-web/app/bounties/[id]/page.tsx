'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Clock, Award, CheckCircle, AlertCircle } from 'lucide-react';
import { bountyApi } from '@/lib/api/bounty';

export default function BountyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: bounty, isLoading } = useQuery({
    queryKey: ['bounty', id],
    queryFn: () => bountyApi.getBountyById(id),
  });

  const claimMutation = useMutation({
    mutationFn: () => bountyApi.claimBounty(id),
    onSuccess: () => {
      alert('✅ 领取成功！');
      router.refresh();
    },
    onError: (error: Error) => {
      alert('❌ 领取失败：' + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">悬赏不存在</h2>
        <Link href="/bounties" className="text-blue-600 hover:underline">
          返回悬赏列表
        </Link>
      </div>
    );
  }

  const statusLabels = {
    open: '开放中',
    claimed: '已领取',
    submitted: '待验证',
    verified: '已验证',
    completed: '已完成',
    cancelled: '已取消',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        href="/bounties"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6"
      >
        <ArrowLeft size={18} />
        返回悬赏列表
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{bounty.title}</h1>
          <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
            bounty.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            bounty.status === 'completed' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400' :
            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {bounty.status === 'open' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {statusLabels[bounty.status]}
          </span>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-wrap">
          {bounty.description}
        </p>

        {/* Skills */}
        {bounty.requiredSkills && bounty.requiredSkills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">所需技能</h3>
            <div className="flex flex-wrap gap-2">
              {bounty.requiredSkills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Meta Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">悬赏金额</div>
            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
              <Award size={18} />
              {bounty.rewardAmount} {bounty.currency === 'points' ? '积分' : bounty.currency}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">发布时间</div>
            <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 text-sm">
              <Clock size={16} />
              {formatDate(bounty.createdAt)}
            </div>
          </div>
          {bounty.deadline && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">截止时间</div>
              <div className="text-gray-700 dark:text-gray-300 text-sm">
                {formatDate(bounty.deadline)}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">状态</div>
            <div className="text-gray-700 dark:text-gray-300 text-sm">
              {statusLabels[bounty.status]}
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {bounty.status === 'open' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => claimMutation.mutate()}
            disabled={claimMutation.isPending}
            className="w-full px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {claimMutation.isPending ? '领取中...' : '领取此悬赏'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
            领取后需在截止时间内完成任务并提交成果
          </p>
        </div>
      )}
    </div>
  );
}
