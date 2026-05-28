'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Filter, Search } from 'lucide-react';
import { bountyApi } from '@/lib/api/bounty';
import BountyCard from '@/components/Bounty/BountyCard';
import SearchHistory from '@/components/Bounty/SearchHistory';
import PopularSearches from '@/components/Bounty/PopularSearches';
import SearchSuggestions from '@/components/Bounty/SearchSuggestions';
import { useTranslations } from 'next-intl';

export default function BountiesClient() {
  const t = useTranslations('bountyList');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');

  // 防抖搜索：500ms 后执行
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // 重置到第一页
      
      // 添加到搜索历史
      if (searchQuery.trim() && typeof window !== 'undefined') {
        const STORAGE_KEY = 'bounty_search_history';
        const saved = localStorage.getItem(STORAGE_KEY);
        let history: string[] = [];
        if (saved) {
          try {
            history = JSON.parse(saved);
          } catch {
            // Ignore parse errors
          }
        }
        const trimmed = searchQuery.trim();
        const newHistory = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, 10);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading } = useQuery({
    queryKey: ['bounties', page, status, skillFilter, debouncedSearch],
    queryFn: () => bountyApi.getBounties({ 
      status, 
      page, 
      limit: 12,
      skill: skillFilter || undefined,
      searchQuery: debouncedSearch || undefined
    }),
  });

  const bounties = data?.bounties || [];
  const pagination = data?.pagination;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('pageTitle')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('pageSubtitle')}</p>
        </div>
        <Link
          href="/bounties/create"
          className="px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus size={20} />
          {t('publishBounty')}
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="open">{t('statusOpen')}</option>
              <option value="claimed">{t('statusClaimed')}</option>
              <option value="submitted">{t('statusSubmitted')}</option>
              <option value="completed">{t('statusCompleted')}</option>
              <option value="cancelled">{t('statusCancelled')}</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-50 relative">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            {/* Search Suggestions Dropdown */}
            <SearchSuggestions 
              query={searchQuery} 
              onSelect={(suggestion) => setSearchQuery(suggestion)} 
            />
          </div>

          {/* Skill Filter */}
          <div className="flex items-center gap-2">
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">{t('allSkills')}</option>
              <option value="customer-service">{t('skillCustomerService')}</option>
              <option value="database-connector">{t('skillDatabase')}</option>
              <option value="code-generation">{t('skillCodeGen')}</option>
              <option value="data-analysis">{t('skillDataAnalysis')}</option>
              <option value="api-integration">{t('skillApiIntegration')}</option>
            </select>
          </div>
        </div>
        
        {/* Search History & Popular Searches */}
        <SearchHistory onSearch={setSearchQuery} />
        <PopularSearches onSearch={setSearchQuery} />
      </div>

      {/* Bounty List */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : bounties.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('noBounties')}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('noBountiesDesc')}</p>
          <Link
            href="/bounties/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            <Plus size={20} />
            {t('publishBounty')}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {bounties.map((bounty) => (
              <BountyCard key={bounty.id} bounty={bounty} searchQuery={debouncedSearch} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('prevPage')}
              </button>
              
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                {t('pageInfo', { current: page, total: pagination.totalPages, count: pagination.total })}
              </span>

              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('nextPage')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
