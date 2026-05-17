'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { searchApi, Agent } from '@/lib/api/search';
import { teamSkillApi, TeamSkill } from '@/lib/api/team-skills';
import { Star, Download, ExternalLink, Users, Search, X } from 'lucide-react';
import Link from 'next/link';
import VirtualCompanyChatModal from '@/components/virtual-company-chat-modal';
import LoadingState from '@/components/Layout/LoadingState';

type Category = 'all' | 'agents' | 'virtual-company';

export default function MarketplacePage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 查询 Agents（单个智能体）
  const { data: agentsData, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents', debouncedSearch, 1],
    queryFn: () => {
      if (debouncedSearch) {
        return searchApi.searchAgents(debouncedSearch, 1, 30);
      }
      return searchApi.searchAgents('ai agent', 1, 30);
    },
    enabled: selectedCategory === 'all' || selectedCategory === 'agents'
  });

  // 查询 Team Skills（虚拟公司）
  const { data: teamSkillsData, isLoading: loadingTeamSkills } = useQuery({
    queryKey: ['team-skills', selectedCategory, debouncedSearch],
    queryFn: () => {
      if (debouncedSearch) {
        // 有搜索关键词时，使用搜索 API
        return teamSkillApi.searchTeamSkills({
          query: debouncedSearch,
          category: selectedCategory === 'virtual-company' ? 'virtual-company' : undefined,
          isPublic: true,
          page: 1,
          limit: 30
        });
      } else if (selectedCategory === 'all' || selectedCategory === 'agents') {
        return teamSkillApi.getMarketplaceTeamSkills(1, 30);
      } else {
        // 只查询虚拟公司类型
        return teamSkillApi.getTeamSkillsByCategory('virtual-company', 1, 30);
      }
    },
    enabled: selectedCategory !== 'agents'
  });

  // 分类选项 - 只保留产品类型分类
  const categories: { value: Category; label: string; icon?: React.ElementType }[] = [
    { value: 'all', label: '全部' },
    { value: 'agents', label: '智能体' },
    { value: 'virtual-company', label: '虚拟公司', icon: Users },
  ];

  const isLoading = loadingAgents || loadingTeamSkills;

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 页面标题和搜索 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agent 广场</h1>
            <p className="text-gray-600 dark:text-gray-400">发现和探索优秀的 AI Agent 和虚拟公司</p>
          </div>
          
          {/* 搜索框 */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜索智能体或虚拟公司..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
        
        {/* 搜索提示 */}
        {debouncedSearch && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Search size={16} />
            <span>搜索结果：</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{debouncedSearch}</span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              清除搜索
            </button>
          </div>
        )}
      </div>

      {/* 分类筛选器 */}
      <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.value
                ? 'bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-gray-200 dark:border-gray-700'
            }`}
          >
            {cat.icon && <cat.icon size={18} />}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Featured Section for Virtual Companies */}
      {selectedCategory === 'virtual-company' && (
        <div className="mb-8 p-6 bg-linear-to-r from-purple-600 to-pink-600 rounded-xl text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">🏢 虚拟公司</h2>
          <p className="mb-4">组建你的 AI 团队，像真实公司一样协作工作</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 bg-white text-purple-600 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-md hover:shadow-lg"
          >
            ✨ 创建虚拟公司
          </button>
        </div>
      )}

      {/* Featured Section for Agents */}
      {selectedCategory === 'agents' && (
        <div className="mb-8 p-6 bg-linear-to-r from-blue-600 to-cyan-600 rounded-xl text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">🤖 智能体</h2>
          <p>发现和探索优秀的单个 AI Agent</p>
        </div>
      )}

      {/* Agents Grid */}
      {(selectedCategory === 'all' || selectedCategory === 'agents') && agentsData?.data && (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            智能体
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({agentsData.data.length} 个)</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {agentsData.data.map((agent: Agent) => (
              <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-700 hover:-translate-y-1 overflow-hidden group">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{agent.name}</h3>
                    <span className={`px-3 py-1.5 text-xs font-medium rounded-lg shrink-0 ${
                      agent.source === 'github' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {agent.source}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{agent.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {agent.stars !== undefined && (
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-yellow-500" />
                        <span>{agent.stars.toLocaleString()}</span>
                      </div>
                    )}
                    {agent.downloads !== undefined && (
                      <div className="flex items-center gap-1">
                        <Download size={16} />
                        <span>{agent.downloads.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {agent.tags && agent.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {agent.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <a
                    href={agent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-sm font-medium"
                  >
                    <ExternalLink size={16} />
                    查看详情
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Team Skills Grid - 只显示虚拟公司 */}
      {(selectedCategory === 'all' || selectedCategory === 'virtual-company') && teamSkillsData?.data?.data && (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl"></span>
            虚拟公司
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({teamSkillsData.data.data?.length || 0} 个)
            </span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamSkillsData.data.data?.map((skill: TeamSkill) => (
              <Link
                key={skill.id}
                href={`/marketplace/team-skills/${skill.id}`}
                className="block bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-700 hover:-translate-y-1 overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {skill.name}
                    </h3>
                    {skill.category === 'virtual-company' && (
                      <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        虚拟公司
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {skill.description}
                  </p>
                  
                  {/* 显示团队成员数量 */}
                  {skill.roles && Array.isArray(skill.roles) && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <Users size={16} />
                      <span>{skill.roles.length} 个角色</span>
                    </div>
                  )}

                  {skill.category && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg">
                        {skill.category}
                      </span>
                    </div>
                  )}

                  <div className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-sm font-medium">
                    查看详情
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* 空状态 */}
      {(() => {
        if (selectedCategory === 'all') {
          return !agentsData?.data?.length && !teamSkillsData?.data?.data?.length;
        }
        if (selectedCategory === 'agents') {
          return !agentsData?.data?.length;
        }
        return !teamSkillsData?.data?.data?.length;
      })() && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <div className="w-20 h-20 bg-linear-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {debouncedSearch ? '未找到匹配的结果' : '暂无数据'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {debouncedSearch ? '请尝试其他关键词' : 'Agent 广场数据正在加载中'}
          </p>
        </div>
      )}

      {/* 虚拟公司创建弹窗（对话式） */}
      {showCreateModal && (
        <VirtualCompanyChatModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(teamSkillId) => {
            setShowCreateModal(false);
            router.push(`/team-skills/${teamSkillId}`);
          }}
        />
      )}
    </div>
  );
}
