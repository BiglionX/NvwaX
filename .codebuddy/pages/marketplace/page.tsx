'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi, Agent } from '@/lib/api/search';
import { teamSkillApi, TeamSkill } from '@/lib/api/team-skills';
import { Star, Download, ExternalLink, Users, Search, X } from 'lucide-react';
import Link from 'next/link';
import LoadingState from '@/components/Layout/LoadingState';
import { Button, Input, Space, Container, Card, Badge, Tag } from '@/components/UI';

type Category = 'all' | 'agents' | 'virtual-company';

export default function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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
    <Container size="lg" className="py-6">
      {/* 页面标题和搜索 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agent 广场</h1>
            <p className="text-gray-600 dark:text-gray-400">发现和探索优秀的 AI Agent 和虚拟公司</p>
          </div>
          
          {/* 搜索框 */}
          <Input
            type="text"
            placeholder="搜索智能体或虚拟公司..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<Search size={20} />}
            suffix={searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={20} />
              </button>
            ) : undefined}
            className="w-full md:w-96"
          />
        </div>
        
        {/* 搜索提示 */}
        {debouncedSearch && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Search size={16} />
            <span>搜索结果：</span>
            <span className="font-medium text-violet-600 dark:text-violet-400">{debouncedSearch}</span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
            >
              清除搜索
            </button>
          </div>
        )}
      </div>

      {/* 分类筛选器 */}
      <Space size="small" className="mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'primary' : 'outline'}
            onClick={() => setSelectedCategory(cat.value)}
            icon={cat.icon ? <cat.icon size={18} /> : undefined}
          >
            {cat.label}
          </Button>
        ))}
      </Space>

      {/* Featured Section for Agents */}
      {selectedCategory === 'agents' && (
        <Card className="mb-8 bg-linear-to-r from-blue-600 to-cyan-600 text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">🤖 智能体</h2>
          <p>发现和探索优秀的单个 AI Agent</p>
        </Card>
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
              <Card key={agent.id} className="hover:-translate-y-1 hover:shadow-xl transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{agent.name}</h3>
                  <Badge variant={agent.source === 'github' ? 'default' : 'warning'}>
                    {agent.source}
                  </Badge>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{agent.description}</p>
                
                <Space size="middle" className="mb-4">
                  {agent.stars !== undefined && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Star size={16} className="text-yellow-500" />
                      <span>{agent.stars.toLocaleString()}</span>
                    </div>
                  )}
                  {agent.downloads !== undefined && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Download size={16} />
                      <span>{agent.downloads.toLocaleString()}</span>
                    </div>
                  )}
                </Space>

                {agent.tags && agent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.tags.slice(0, 3).map((tag, idx) => (
                      <Tag key={idx} variant="primary" size="sm">
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}

                <a
                  href={agent.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full"
                >
                  <Button variant="primary" fullWidth icon={<ExternalLink size={16} />}>
                    查看详情
                  </Button>
                </a>
              </Card>
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
                className="block"
              >
                <Card className="hover:-translate-y-1 hover:shadow-xl transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {skill.name}
                    </h3>
                    {skill.category === 'virtual-company' && (
                      <Badge variant="info">
                        虚拟公司
                      </Badge>
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
                      <Tag variant="primary" size="sm">
                        {skill.category}
                      </Tag>
                    </div>
                  )}

                  <Button variant="primary" fullWidth>
                    查看详情
                  </Button>
                </Card>
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
        <Card padding="lg">
          <div className="text-center py-12">
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
        </Card>
      )}

    </Container>
  );
}
