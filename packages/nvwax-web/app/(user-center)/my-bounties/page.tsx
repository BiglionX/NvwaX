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
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">请先登录</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">登录后才能查看您的悬赏</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
        >
          去登录
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('published')}
          className={`flex-1 px-4 py-2 font-medium transition-colors rounded-md flex items-center justify-center gap-2 text-sm ${
            activeTab === 'published'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <FileText size={16} />
          我发布的
        </button>
        <button
          onClick={() => setActiveTab('claimed')}
          className={`flex-1 px-4 py-2 font-medium transition-colors rounded-md flex items-center justify-center gap-2 text-sm ${
            activeTab === 'claimed'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <CheckCircle size={16} />
          我领取的
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            状态筛选：
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-colors text-sm"
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : bounties.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">
              {activeTab === 'published' ? '📝' : '🎯'}
            </span>
          </div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
            {activeTab === 'published' ? '还没有发布过悬赏' : '还没有领取过悬赏'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {activeTab === 'published' 
              ? '去发布一个悬赏，寻找优秀的开发者吧！' 
              : '去悬赏市场看看有什么有趣的任务！'}
          </p>
          <Link
            href={activeTab === 'published' ? '/bounties/create' : '/bounties'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
          >
            <Award size={16} />
            {activeTab === 'published' ? '发布悬赏' : '浏览悬赏'}
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bounties.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      )}
    </div>
  );
}
