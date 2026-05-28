'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { bountyApi } from '@/lib/api/bounty';
import { useTranslations } from 'next-intl';

interface PopularSearchesProps {
  onSearch: (query: string) => void;
}

export default function PopularSearches({ onSearch }: PopularSearchesProps) {
  const t = useTranslations('bountySearch');
  const { data: popularSearches, isLoading } = useQuery({
    queryKey: ['popular-searches'],
    queryFn: () => bountyApi.getPopularSearches(8),
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });

  if (isLoading || !popularSearches || popularSearches.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
        <TrendingUp size={14} className="text-orange-500" />
        <span>{""}{t('popularSearches')}</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {popularSearches.map((query, index) => (
          <button
            key={index}
            onClick={() => onSearch(query)}
            className="px-3 py-1.5 bg-linear-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/30 dark:hover:to-red-900/30 text-orange-700 dark:text-orange-400 rounded-lg text-sm transition-all border border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700"
          >
            <span className="text-xs opacity-60 mr-1">#{index + 1}</span>
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
