'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi, Agent, Skill } from '@/lib/api/search';
import { Search as SearchIcon, Download, Star, ExternalLink, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import SearchInlineChat from '@/components/Search/SearchInlineChat';

export default function SearchClient() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'agents' | 'skills'>('agents');
  const [page, setPage] = useState(1);

  const { data: agentsData, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents-advanced', query, page],
    queryFn: () => searchApi.searchAgents(query, page, 20),
    enabled: showAdvanced && activeTab === 'agents' && query.length > 0
  });

  const { data: skillsData, isLoading: loadingSkills } = useQuery({
    queryKey: ['skills-advanced', query, page],
    queryFn: () => searchApi.searchSkills(query, page, 20),
    enabled: showAdvanced && activeTab === 'skills' && query.length > 0
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const renderAgentCard = (agent: Agent) => (
    <div key={agent.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
        <span className={`px-2 py-1 text-xs rounded-full ${
          agent.source === 'github' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {agent.source}
        </span>
      </div>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{agent.description}</p>
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
        {agent.stars !== undefined && (
          <div className="flex items-center gap-1">
            <Star size={16} />
            <span>{agent.stars}</span>
          </div>
        )}
        {agent.downloads !== undefined && (
          <div className="flex items-center gap-1">
            <Download size={16} />
            <span>{agent.downloads}</span>
          </div>
        )}
      </div>
      {agent.tags && agent.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {agent.tags.slice(0, 5).map((tag, idx) => (
            <span key={idx} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
      <a href={agent.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm">
        <ExternalLink size={16} />
        查看详情
      </a>
    </div>
  );

  const renderSkillCard = (skill: Skill) => (
    <div key={skill.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{skill.name}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{skill.description}</p>
      {skill.category && (
        <span className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-full mb-4">
          {skill.category}
        </span>
      )}
      {skill.usageCount !== undefined && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">使用次数: {skill.usageCount}</p>
      )}
      <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">添加到项目</button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Sparkles size={22} className="text-yellow-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI 搜索 Agent</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">对话式智能搜索，用自然语言发现 Agent</p>
          </div>
        </div>
      </div>

      {/* AI 对话搜索主界面 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden min-h-125">
        <SearchInlineChat />
      </div>

      {/* 高级搜索折叠区域 */}
      <div className="mt-8">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          高级搜索（传统关键词搜索）
        </button>

        {showAdvanced && (
          <div className="mt-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            {/* Search Input */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入关键词搜索 Agent 或 Skill..."
                  className="w-full px-4 py-3 pl-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                />
                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </form>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('agents')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'agents'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Agents ({agentsData?.total || 0})
              </button>
              <button
                onClick={() => setActiveTab('skills')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'skills'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Skills ({skillsData?.total || 0})
              </button>
            </div>

            {/* Results */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTab === 'agents' && (
                <>
                  {loadingAgents ? (
                    <div className="col-span-full text-center py-12 text-gray-500">加载中...</div>
                  ) : agentsData?.data?.length > 0 ? (
                    <>
                      {agentsData.data.map(renderAgentCard)}
                    </>
                  ) : query ? (
                    <div className="col-span-full">
                      <div className="text-center py-12 text-gray-500">
                        <SearchIcon size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg mb-4">未找到相关 Agent</p>
                      </div>
                    </div>
                  ) : (
                    <div className="col-span-full text-center py-12 text-gray-500">输入关键词开始搜索</div>
                  )}
                </>
              )}
              {activeTab === 'skills' && (
                <>
                  {loadingSkills ? (
                    <div className="col-span-full text-center py-12 text-gray-500">加载中...</div>
                  ) : skillsData?.data?.length > 0 ? (
                    skillsData.data.map(renderSkillCard)
                  ) : query ? (
                    <div className="col-span-full text-center py-12 text-gray-500">未找到相关 Skill</div>
                  ) : (
                    <div className="col-span-full text-center py-12 text-gray-500">输入关键词开始搜索</div>
                  )}
                </>
              )}
            </div>

            {/* Pagination */}
            {((activeTab === 'agents' && agentsData?.total > 20) || 
              (activeTab === 'skills' && skillsData?.total > 20)) && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 text-gray-900 dark:text-white"
                >
                  上一页
                </button>
                <span className="px-4 py-2 text-gray-700 dark:text-gray-300">第 {page} 页</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
