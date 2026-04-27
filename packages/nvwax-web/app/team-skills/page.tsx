'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teamSkillApi, TeamSkill } from '@/lib/api/team-skills';
import { Search, Filter, Star, Users, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: 'development', label: '开发' },
  { value: 'research', label: '研究' },
  { value: 'content', label: '内容创作' },
  { value: 'analysis', label: '数据分析' },
  { value: 'marketing', label: '市场营销' },
  { value: 'other', label: '其他' }
];

export default function TeamSkillsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

  // 搜索 Team Skills
  const { data, isLoading } = useQuery({
    queryKey: ['team-skills', searchQuery, selectedCategory, page],
    queryFn: () => teamSkillApi.searchTeamSkills({
      query: searchQuery || undefined,
      category: selectedCategory || undefined,
      isPublic: true,
      page,
      limit
    })
  });

  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Team Skills 市场
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          探索可复用的团队协作模板，一键应用到您的项目
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700 mb-8">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索 Team Skills..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Search size={20} />
              搜索
            </button>
          </div>
        </form>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <Filter size={20} className="text-gray-500 dark:text-gray-400 mt-1" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryChange(cat.value)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-600 dark:text-gray-300">
          找到 <span className="font-semibold text-gray-900 dark:text-white">{total}</span> 个 Team Skills
        </p>
      </div>

      {/* Team Skills Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : data?.data?.data?.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <Search size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            未找到匹配的 Team Skills
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            尝试调整搜索条件或浏览其他类别
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {data?.data?.data?.map((skill: TeamSkill) => (
            <Link
              key={skill.id}
              href={`/team-skills/${skill.id}`}
              className="group block bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    skill.category === 'development' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                    skill.category === 'research' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                    skill.category === 'content' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                    skill.category === 'analysis' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {CATEGORIES.find(c => c.value === skill.category)?.label || skill.category}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={16} fill="currentColor" />
                    <span className="text-sm font-medium">4.8</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {skill.name}
                </h3>

                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4">
                  {skill.description}
                </p>

                {/* Team Members Preview */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
                  <Users size={16} />
                  <span>{skill.roles?.length || 0} 个角色</span>
                  <span className="mx-2">•</span>
                  <Zap size={16} />
                  <span>{skill.workflow?.steps?.length || 0} 个工作流步骤</span>
                </div>

                {/* Leader Info */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Leader</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {skill.leaderConfig?.name || '未指定'}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                    查看详情 →
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: 实现应用到项目功能
                      alert('即将实现：选择项目并应用此模板');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCircle size={16} />
                    应用模板
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            上一页
          </button>
          
          <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
            第 {page} / {totalPages} 页
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            下一页
          </button>
        </div>
      )}

      {/* CTA Section */}
      <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold mb-4">
            没有找到合适的模板？
          </h2>
          <p className="text-blue-100 mb-6 text-lg">
            使用 Nvwa 智能体工厂，通过对话式需求分析，自动生成专属的团队配置
          </p>
          <Link
            href="/nvwa"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            开始创建 <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
}
