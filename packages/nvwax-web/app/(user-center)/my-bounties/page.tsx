'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Award, FileText, CheckCircle } from 'lucide-react';
import { bountyApi } from '@/lib/api/bounty';
import BountyCard from '@/components/Bounty/BountyCard';
import { useAuth } from '@/hooks/useAuth';

export default function MyBountiesPage() {
  const { userInfo, isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<'published' | 'claimed'>('published');
  const [status, setStatus] = useState<string>('all');

  const userId = userInfo?.id;

  // 获取我发布的悬赏
  const { data: publishedData, isLoading: loadingPublished } = useQuery({
    queryKey: ['my-published-bounties', userId, status],
    queryFn: () => {
      if (!userId) return Promise.resolve({ bounties: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } });
      return bountyApi.getMyPublishedBounties(userId, { 
        status: status === 'all' ? undefined : status,
        limit: 12 
      });
    },
    enabled: !!userId && activeTab === 'published',
  });

  // 获取我领取的悬赏
  const { data: claimedData, isLoading: loadingClaimed } = useQuery({
    queryKey: ['my-claimed-bounties', userId, status],
    queryFn: () => {
      if (!userId) return Promise.resolve({ bounties: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } });
      return bountyApi.getMyClaimedBounties(userId, { 
        status: status === 'all' ? undefined : status,
        limit: 12 
      });
    },
    enabled: !!userId && activeTab === 'claimed',
  });

  const currentData = activeTab === 'published' ? publishedData : claimedData;
  const currentLoading = activeTab === 'published' ? loadingPublished : loadingClaimed;
  const bounties = currentData?.bounties || [];

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔒</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">请先登录</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">登录后才能查看您的悬赏</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border-2 border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('published')}
              className={`w-full px-4 py-2.5 font-medium transition-all rounded-lg flex items-center justify-center gap-2 mb-2 ${
                activeTab === 'published'
                  ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <FileText size={18} />
              我发布的
            </button>
            <button
              onClick={() => setActiveTab('claimed')}
              className={`w-full px-4 py-2.5 font-medium transition-all rounded-lg flex items-center justify-center gap-2 ${
                activeTab === 'claimed'
                  ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <CheckCircle size={18} />
              我领取的
            </button>
          </div>

          {/* Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                状态筛选：
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              >
                <option value="all">全部</option>
                <option value="open">开放中</option>
                <option value="claimed">已领取</option>
                <option value="submitted">待验证</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>
      {/* Bounty List */}
      {currentLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : bounties.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">
              {activeTab === 'published' ? '📝' : '🎯'}
            </span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {activeTab === 'published' ? '还没有发布过悬赏' : '还没有领取过悬赏'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {activeTab === 'published' 
              ? '去发布一个悬赏，寻找优秀的开发者吧！' 
              : '去悬赏市场看看有什么有趣的任务！'}
          </p>
          <Link
            href={activeTab === 'published' ? '/bounties/create' : '/bounties'}
            className="inline-flex items-center gap-2 px-8 py-3 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Award size={18} />
            {activeTab === 'published' ? '发布悬赏' : '浏览悬赏'}
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bounties.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      )}
    </div>
  );
}
