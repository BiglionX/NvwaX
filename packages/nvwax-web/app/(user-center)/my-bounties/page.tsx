'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Award, FileText, CheckCircle } from 'lucide-react';
import { bountyApi } from '@/lib/api/bounty';
import BountyCard from '@/components/Bounty/BountyCard';
import { Card, Button, Space, Skeleton } from '@/components/UI';
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
        <Card padding="lg">
          <div className="text-center">
            <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🔒</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">请先登录</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">登录后才能查看您的悬赏</p>
            <Button variant="primary" size="lg" asChild>
              <Link href="/login">
                去登录
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Space direction="vertical" size="middle" className="w-full">
      {/* Tabs */}
      <Card padding="sm">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'published' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('published')}
            icon={<FileText size={18} />}
            fullWidth
          >
            我发布的
          </Button>
          <Button
            variant={activeTab === 'claimed' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('claimed')}
            icon={<CheckCircle size={18} />}
            fullWidth
          >
            我领取的
          </Button>
        </div>
      </Card>

      {/* Filter */}
      <Card padding="md">
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
      </Card>
      {/* Bounty List */}
      {currentLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} padding="lg">
              <Skeleton variant="text" width="60%" height="20px" className="mb-2" />
              <Skeleton variant="text" width="100%" height="16px" className="mb-2" />
              <Skeleton variant="text" width="66%" height="16px" />
            </Card>
          ))}
        </div>
      ) : bounties.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-12">
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
            <Button variant="primary" size="lg" icon={<Award size={18} />} asChild>
              <Link href={activeTab === 'published' ? '/bounties/create' : '/bounties'}>
                {activeTab === 'published' ? '发布悬赏' : '浏览悬赏'}
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bounties.map((bounty) => (
            <BountyCard key={bounty.id} bounty={bounty} />
          ))}
        </div>
      )}
    </Space>
  );
}
