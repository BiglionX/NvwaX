'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi, Agent } from '@/lib/api/search';
import { teamSkillApi, TeamSkill } from '@/lib/api/team-skills';
import { Star, Download, ExternalLink, Users } from 'lucide-react';
import Link from 'next/link';

type Category = 'all' | 'agents' | 'virtual-company' | 'development' | 'analysis' | 'content';

export default function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');

  // 查询 Agents（单个智能体）
  const { data: agentsData } = useQuery({
    queryKey: ['agents', 'popular', 1],
    queryFn: () => searchApi.searchAgents('ai agent', 1, 30),
    enabled: selectedCategory === 'all' || selectedCategory === 'agents'
  });

  // 查询 Team Skills（包括虚拟公司）
  const { data: teamSkillsData, isLoading: loadingTeamSkills } = useQuery({
    queryKey: ['team-skills', selectedCategory],
    queryFn: () => {
      if (selectedCategory === 'all' || selectedCategory === 'agents') {
        return teamSkillApi.getMarketplaceTeamSkills(1, 30);
      } else {
        return teamSkillApi.getTeamSkillsByCategory(selectedCategory, 1, 30);
      }
    },
    enabled: selectedCategory !== 'agents'
  });

  // 分类选项
  const categories: { value: Category; label: string; icon?: React.ElementType }[] = [
    { value: 'all', label: '全部' },
    { value: 'agents', label: '智能体' },
    { value: 'virtual-company', label: '虚拟公司', icon: Users },
    { value: 'development', label: '开发团队' },
    { value: 'analysis', label: '数据分析' },
    { value: 'content', label: '内容创作' },
  ];

  if (loadingTeamSkills) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agent 广场</h1>
        <p className="text-gray-600 dark:text-gray-300">发现和探索优秀的 AI Agent 和虚拟公司</p>
      </div>

      {/* 分类筛选器 */}
      <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
              selectedCategory === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat.icon && <cat.icon size={18} />}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Featured Section for Virtual Companies */}
      {selectedCategory === 'virtual-company' && (
        <div className="mb-8 p-6 bg-linear-to-r from-purple-500 to-pink-500 rounded-xl text-white">
          <h2 className="text-2xl font-bold mb-2">🏢 虚拟公司</h2>
          <p>组建你的 AI 团队，像真实公司一样协作工作</p>
        </div>
      )}

      {/* Featured Section for Agents */}
      {selectedCategory === 'agents' && (
        <div className="mb-8 p-6 bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl text-white">
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
              <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{agent.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full shrink-0 ${
                      agent.source === 'github' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {agent.source}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3 h-12">{agent.description}</p>
                  
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
                    className="inline-flex items-center justify-center w-full gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
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

      {/* Team Skills Grid */}
      {(selectedCategory === 'all' || selectedCategory === 'virtual-company' || selectedCategory === 'development' || selectedCategory === 'analysis' || selectedCategory === 'content') && teamSkillsData?.data?.data && (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">👥</span>
            团队技能
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({teamSkillsData.data.data.length} 个)</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamSkillsData.data.data.map((skill: TeamSkill) => (
              <Link
                key={skill.id}
                href={`/marketplace/team-skills/${skill.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                      {skill.name}
                    </h3>
                    {skill.category === 'virtual-company' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        虚拟公司
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3 h-12">
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
                      <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded">
                        {skill.category}
                      </span>
                    </div>
                  )}

                  <div className="inline-flex items-center justify-center w-full gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
                    查看详情
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {!agentsData?.data?.length && !teamSkillsData?.data?.data?.length && (
        <div className="text-center py-12 text-gray-500">
          暂无数据
        </div>
      )}
    </div>
  );
}
