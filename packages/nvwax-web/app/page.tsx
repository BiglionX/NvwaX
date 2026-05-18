'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Star, ArrowRight, Sparkles, TrendingUp, Layers } from 'lucide-react';
import { searchApi, Agent } from '@/lib/api/search';

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // 获取热门 Agents（按星级排序）
  const { data: trendingAgents, isLoading: loadingTrending } = useQuery({
    queryKey: ['trending-agents'],
    queryFn: () => searchApi.searchAgents('', 1, 6),
  });

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // 快速筛选
  const quickFilters = [
    { id: 'all', label: '全部', icon: Layers },
    { id: 'github', label: 'GitHub', icon: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> },
    { id: 'gitee', label: 'Gitee', icon: Sparkles },
    { id: 'china', label: '中国公司', icon: TrendingUp },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section with Search */}
      <div className="text-center mb-12 py-8">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          欢迎使用 NvwaX
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          开源的 AI Agent 搜索、发现和管理平台
        </p>

        {/* Search Box */}
        <div className="max-w-3xl mx-auto mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索 AI Agent、技能、框架..."
                className="w-full px-6 py-4 pr-32 text-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all shadow-lg"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2"
              >
                <Search size={20} />
                <span>搜索</span>
              </button>
            </div>
          </form>

          {/* Quick Filters */}
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-gray-400">快速筛选：</span>
            {quickFilters.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>Open Source</span>
          </div>
          <div className="flex items-center gap-2">
            <Star size={16} />
            <span>240+ Agents</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers size={16} />
            <span>Multi-platform</span>
          </div>
        </div>
      </div>

      {/* Trending Agents Preview */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-orange-500" size={24} />
              热门 Agent
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">按星级排序的热门项目</p>
          </div>
          <Link
            href="/marketplace"
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            查看全部
            <ArrowRight size={16} />
          </Link>
        </div>

        {loadingTrending ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {trendingAgents?.data?.slice(0, 6).map((agent: Agent) => (
              <Link
                key={agent.id}
                href={`/search?q=${encodeURIComponent(agent.name)}`}
                className="block bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {agent.name}
                  </h3>
                  {agent.stars && (
                    <div className="flex items-center gap-1 text-orange-500">
                      <Star size={16} fill="currentColor" />
                      <span className="text-sm font-medium">{agent.stars.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {agent.description || '暂无描述'}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                    {agent.source || 'Unknown'}
                  </span>
                  {agent.url && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(agent.url, '_blank', 'noopener,noreferrer');
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      查看 →
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Start Guide */}
      <div className="bg-linear-to-r from-blue-500 to-purple-600 rounded-xl text-white p-8 mb-12">
        <h2 className="text-2xl font-bold mb-6">快速开始</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">搜索 Agent</h3>
                <p className="text-sm text-white/80">搜索全网最优秀的 AI Agent 和技能</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">发现技能</h3>
                <p className="text-sm text-white/80">浏览 SkillHub 平台的实用技能</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">创建团队</h3>
                <p className="text-sm text-white/80">创建和管理您的 AiTeam</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold">4</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">构建系统</h3>
                <p className="text-sm text-white/80">构建强大的 Agent 团队协作系统</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          数据源覆盖
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { name: 'GitHub', count: '186+' },
            { name: 'Gitee', count: '15+' },
            { name: '百度', count: '16' },
            { name: '阿里', count: '16' },
            { name: '腾讯', count: '9' }
          ].map((source) => (
            <div key={source.name} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {source.count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {source.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
