'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi, Agent, SkillRecommendation } from '@/lib/api/search';
import { aiteamApi, AiTeam } from '@/lib/api/aiteams';
import { teamSkillApi, TeamSkill } from '@/lib/api/team-skills';
import { Star, Download, ExternalLink, Users, Search, X, TrendingUp, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button, Input, Space, Container, Card, Badge, Tag, Modal } from '@/components/UI';
import { useAiSearch } from '@/contexts/AiSearchContext';

type Category = 'all' | 'agents' | 'aiteams' | 'virtual-company';

export default function MarketplaceClient() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  // 推荐结果状态
  const [recommendedAiteams, setRecommendedAiteams] = useState<AiTeam[]>([]);
  const [recommendedSkills, setRecommendedSkills] = useState<SkillRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [generatingAiTeam, setGeneratingAiTeam] = useState(false);
  const [generatedAiTeamPreview, setGeneratedAiTeamPreview] = useState<{
    name: string;
    description: string;
    category?: string;
    tags: string[];
    members: Array<{role: string; responsibilities?: string}>;
    workflow?: {steps: Array<unknown>};
  } | null>(null);

  const { openAiSearch } = useAiSearch();

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

  // 查询已发布的 AiTeam（AI 团队）
  const { data: aiteamsData, isLoading: loadingAiteams } = useQuery({
    queryKey: ['marketplace-aiteams', selectedCategory, debouncedSearch],
    queryFn: () => {
      if (debouncedSearch) {
        return aiteamApi.searchPublishedAiTeams({ q: debouncedSearch, limit: 30 });
      }
      return aiteamApi.searchPublishedAiTeams({ limit: 6 });
    },
    enabled: selectedCategory === 'all' || selectedCategory === 'aiteams'
  });

  // 查询 Team Skills（虚拟公司/团队）
  const { data: teamSkillsData, isLoading: loadingTeamSkills } = useQuery({
    queryKey: ['team-skills', selectedCategory, debouncedSearch],
    queryFn: () => {
      if (debouncedSearch) {
        // 有搜索关键词时，使用搜索 API
        return teamSkillApi.searchTeamSkills({
          query: debouncedSearch,
          isPublic: true,
          page: 1,
          limit: 30
        });
      }
      // "全部"、"智能体"、"AI团队"、"虚拟公司"都获取所有公开的 team_skills
      return teamSkillApi.getMarketplaceTeamSkills(1, 30);
    },
    enabled: selectedCategory !== 'agents'
  });

  // 分类选项
  const categories: { value: Category; label: string; icon?: React.ElementType }[] = [
    { value: 'all', label: '全部' },
    { value: 'agents', label: '智能体' },
    { value: 'aiteams', label: 'AI 团队', icon: Users },
    { value: 'virtual-company', label: '虚拟公司' },
  ];

  const isLoading = loadingAgents || loadingAiteams || loadingTeamSkills;

  // 当搜索无结果时，加载推荐
  const isSearchEmpty = useCallback(() => {
    if (selectedCategory === 'all') {
      return !agentsData?.data?.length && !aiteamsData?.data?.aiteams?.length && !teamSkillsData?.data?.data?.length;
    }
    if (selectedCategory === 'agents') {
      return !agentsData?.data?.length;
    }
    if (selectedCategory === 'aiteams') {
      return !aiteamsData?.data?.aiteams?.length;
    }
    return !teamSkillsData?.data?.data?.length;
  }, [agentsData, aiteamsData, teamSkillsData, selectedCategory]);

  // 搜索无结果时触发推荐
  useEffect(() => {
    if (!isLoading && debouncedSearch && isSearchEmpty()) {
      loadRecommendations();
    } else if (!debouncedSearch) {
      setRecommendedAiteams([]);
      setRecommendedSkills([]);
    }
  }, [isLoading, debouncedSearch, isSearchEmpty]);

  const loadRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      
      // 并行请求推荐
      const [aiteamRes, skillRes] = await Promise.allSettled([
        fetch(`${API_URL}/aiteams/recommend?q=${encodeURIComponent(debouncedSearch)}&limit=3`),
        searchApi.recommendSkills(debouncedSearch, 5)
      ]);

      if (aiteamRes.status === 'fulfilled') {
        const data = await aiteamRes.value.json();
        if (data.success && data.data?.aiteams) {
          setRecommendedAiteams(data.data.aiteams);
        }
      }

      if (skillRes.status === 'fulfilled') {
        const data = skillRes.value;
        if (data.recommendations) {
          setRecommendedSkills(data.recommendations);
        }
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAutoGenerate = async () => {
    setGeneratingAiTeam(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/aiteams/generate-from-query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: debouncedSearch })
      });

      const data = await response.json();
      if (data.success && data.data) {
        setGeneratedAiTeamPreview(data.data);
      } else {
        console.error('Auto-generate failed:', data.error);
      }
    } catch (error) {
      console.error('Error auto-generating AiTeam:', error);
    } finally {
      setGeneratingAiTeam(false);
    }
  };

  return (
    <Container size="lg" className="py-6">
      {/* 页面标题和搜索 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agent 广场</h1>
            <p className="text-gray-600 dark:text-gray-400">发现和探索优秀的 AI Agent 和虚拟公司</p>
          </div>
          
          {/* 搜索框和 AI 搜索按钮 */}
          <div className="flex items-center gap-2">
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
              className="w-full md:w-80"
            />
            <Button
              variant="primary"
              icon={<Sparkles size={16} />}
              onClick={() => {
                openAiSearch(debouncedSearch, (q: string) => {
                  setDebouncedSearch(q);
                  setShowCreateModal(true);
                });
              }}
              className="shrink-0 hidden md:inline-flex"
            >
              AI 搜索
            </Button>
            <button
              onClick={() => {
                openAiSearch(debouncedSearch, (q: string) => {
                  setDebouncedSearch(q);
                  setShowCreateModal(true);
                });
              }}
              className="md:hidden w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <Sparkles size={20} />
            </button>
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
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors font-medium"
            >
              <Plus size={14} />
              未找到合适的？立即创建
            </button>
          </div>
        )}
      </div>

      {/* 热门 Agent - 迁移自首页 */}
      {selectedCategory === 'all' && agentsData?.data && (
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-orange-500" size={20} />
              热门 Agent
            </h2>
            <Link href="/search?q=ai%20agent">
              <Button variant="ghost" size="sm">
                查看全部
              </Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {agentsData.data.slice(0, 6).map((agent: Agent) => (
              <Link
                key={agent.id}
                href={`/search?q=${encodeURIComponent(agent.name)}`}
                className="block"
              >
                <Card padding="md" variant="clickable" className="h-full hover:border-blue-500 transition-colors">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 mb-2">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {agent.description || '暂无描述'}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="default" size="sm">
                      {agent.source || 'Unknown'}
                    </Badge>
                    {agent.stars && (
                      <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                        <Star size={12} fill="currentColor" />
                        <span>{agent.stars.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </Card>
      )}

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
      {(selectedCategory === 'all' || selectedCategory === 'agents') && (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            智能体
            {agentsData?.data && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({agentsData.data.length} 个)</span>
            )}
          </h2>
          {loadingAgents ? (
            <div className="flex items-center justify-center py-8 mb-8 gap-3 text-gray-400 dark:text-gray-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">搜索中...</span>
            </div>
          ) : agentsData?.data ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {agentsData.data.map((agent: Agent) => (
              <Card key={agent.id} className="hover:-translate-y-1 hover:shadow-xl transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{agent.name}</h3>
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
          ) : null}
        </>
      )}

      {/* Team Skills Grid - 只显示虚拟公司 */}
      {(selectedCategory === 'all' || selectedCategory === 'virtual-company') && (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl"></span>
            虚拟公司
            {teamSkillsData?.data?.data && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({teamSkillsData.data.data?.length || 0} 个)
              </span>
            )}
          </h2>
          {loadingTeamSkills ? (
            <div className="flex items-center justify-center py-8 mb-8 gap-3 text-gray-400 dark:text-gray-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">搜索中...</span>
            </div>
          ) : teamSkillsData?.data?.data ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamSkillsData.data.data?.map((skill: TeamSkill) => (
              <Link
                key={skill.id}
                href={`/marketplace/team-skills/${skill.id}`}
                className="block"
              >
                <Card className="hover:-translate-y-1 hover:shadow-xl transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
          ) : null}
        </>
      )}

      {/* AiTeam Grid - AI 团队 */}
      {(selectedCategory === 'all' || selectedCategory === 'aiteams') && (
        <>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users size={22} className="text-blue-500" />
            AI 团队
            {aiteamsData?.data?.aiteams && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({aiteamsData.data.aiteams.length} 个)
              </span>
            )}
          </h2>
          {loadingAiteams ? (
            <div className="flex items-center justify-center py-8 mb-8 gap-3 text-gray-400 dark:text-gray-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">搜索中...</span>
            </div>
          ) : aiteamsData?.data?.aiteams && aiteamsData.data.aiteams.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {aiteamsData.data.aiteams.map((aiteam: AiTeam) => (
                <Card key={aiteam.id} className="hover:-translate-y-1 hover:shadow-xl transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {aiteam.name}
                    </h3>
                    <Badge variant="info">AI 团队</Badge>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {aiteam.description || '暂无描述'}
                  </p>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Users size={16} />
                      <span>{aiteam.members?.length || 0} 个成员</span>
                    </div>
                    {aiteam.rating > 0 && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Star size={16} className="text-yellow-500" fill="currentColor" />
                        <span>{aiteam.rating.toFixed(1)}</span>
                      </div>
                    )}
                    {aiteam.downloadCount > 0 && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Download size={16} />
                        <span>{aiteam.downloadCount}</span>
                      </div>
                    )}
                  </div>

                  {aiteam.tags && aiteam.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {aiteam.tags.slice(0, 3).map((tag, idx) => (
                        <Tag key={idx} variant="primary" size="sm">
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  )}

                  <Link
                    href={aiteam.publishStatus === 'published' ? `/marketplace/aiteams/${aiteam.id}` : '#'}
                    className="block"
                  >
                    <Button variant="primary" fullWidth>
                      查看详情
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          ) : null}
        </>
      )}

      {/* 空状态 - 搜索无结果时弹出创建建议 */}
      {!isLoading && (() => {
        if (selectedCategory === 'all') {
          return !agentsData?.data?.length && !aiteamsData?.data?.aiteams?.length && !teamSkillsData?.data?.data?.length;
        }
        if (selectedCategory === 'agents') {
          return !agentsData?.data?.length;
        }
        if (selectedCategory === 'aiteams') {
          return !aiteamsData?.data?.aiteams?.length;
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
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {debouncedSearch ? `没有找到与"${debouncedSearch}"相关的内容` : 'Agent 广场数据正在加载中'}
            </p>

            {/* 推荐展示区域 */}
            {loadingRecommendations && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>正在为您推荐相关内容...</span>
              </div>
            )}

            {!loadingRecommendations && recommendedAiteams.length > 0 && (
              <div className="mb-6 text-left">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
                  推荐相似的 AI 团队
                </h4>
                <div className="grid md:grid-cols-3 gap-3">
                  {recommendedAiteams.map((aiteam) => (
                    <Card key={aiteam.id} padding="sm" variant="clickable" className="text-left">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{aiteam.name}</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{aiteam.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <Users size={12} />
                        <span>{aiteam.members?.length || 0} 成员</span>
                        {aiteam.rating > 0 && (
                          <>
                            <Star size={12} className="text-yellow-500" fill="currentColor" />
                            <span>{aiteam.rating.toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {!loadingRecommendations && recommendedSkills.length > 0 && (
              <div className="mb-6 text-left">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
                  推荐可用的 Skill
                </h4>
                <div className="flex flex-wrap justify-center gap-2">
                  {recommendedSkills.map((skill, idx) => (
                    <Tag key={idx} variant="primary" size="sm">{skill.name}</Tag>
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  可使用这些 Skill 来构建您需要的 Agent 或团队
                </p>
              </div>
            )}

            {debouncedSearch && (
              <Button
                variant="primary"
                icon={<Plus size={18} />}
                onClick={() => setShowCreateModal(true)}
              >
                创建一个"{debouncedSearch}"
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* 创建建议弹窗 */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={`创建 "${debouncedSearch}"`}
        subtitle="未在 Agent 广场找到匹配结果，请选择创建方式"
        size="md"
      >
        <div className="space-y-3">
          {/* AI 自动生成（新增-首位展示） */}
          <button
            onClick={() => {
              setShowCreateModal(false);
              setShowPreviewModal(true);
              handleAutoGenerate();
            }}
            className="w-full p-4 rounded-lg bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 hover:shadow-md transition-all text-left group"
          >
            <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              AI 自动生成 "{debouncedSearch}" AiTeam
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              输入需求描述，AI 自动编排角色和工作流，预览后一键保存
            </p>
          </button>

          {/* 创建 AiTeam（新增） */}
          <Link href="/projects" onClick={() => setShowCreateModal(false)} className="block">
            <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 hover:shadow-md transition-all group">
              <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-1 flex items-center gap-2">
                <Users size={18} /> 创建 AiTeam
              </h4>
              <p className="text-sm text-indigo-700 dark:text-indigo-400">
                创建可发布到市场的 AI 团队，包含成员和工作流配置
              </p>
            </div>
          </Link>

          {/* 创建智能体 */}
          <Link href="/nvwa" onClick={() => setShowCreateModal(false)} className="block">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all group">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-2">
                <span className="text-lg">🤖</span> 创建智能体
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                使用 AI 辅助快速构建单个智能体，可配置技能、数据源和输出格式
              </p>
            </div>
          </Link>

          {/* 创建虚拟公司 */}
          <Link href="/nvwa" onClick={() => setShowCreateModal(false)} className="block">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all group">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1 flex items-center gap-2">
                <span className="text-lg">👥</span> 创建虚拟公司
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                构建由多个 AI 角色组成的虚拟公司团队，支持角色协作和任务分配
              </p>
            </div>
          </Link>
        </div>
      </Modal>

      {/* AI 自动生成预览弹窗 */}
      <Modal
        open={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setGeneratedAiTeamPreview(null);
        }}
        title={`AI 正在生成 "${debouncedSearch}"...`}
        size="lg"
      >
        {generatingAiTeam ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4">
              <svg className="animate-spin h-16 w-16 text-blue-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              正在编排 AiTeam...
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI 正在分析需求并生成团队角色、工作流和配置
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        ) : generatedAiTeamPreview ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-1 flex items-center gap-2">
                <span className="text-lg">✅</span> 生成成功
              </h4>
              <p className="text-sm text-green-700 dark:text-green-400">
                AI 已为您自动编排好 AiTeam，请预览并确认
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{generatedAiTeamPreview.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{generatedAiTeamPreview.description}</p>
              
              {generatedAiTeamPreview.members && generatedAiTeamPreview.members.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">角色列表 ({generatedAiTeamPreview.members.length} 个)</h5>
                  <div className="space-y-2">
                    {generatedAiTeamPreview.members.map((member: {role: string; responsibilities?: string}, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Users size={14} className="text-blue-500 shrink-0" />
                        <span className="font-medium text-gray-800 dark:text-gray-200">{member.role}</span>
                        {member.responsibilities && (
                          <span className="text-gray-500 dark:text-gray-400">- {member.responsibilities}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedAiTeamPreview.tags && generatedAiTeamPreview.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs text-gray-500">标签:</span>
                  {generatedAiTeamPreview.tags.map((tag: string, idx: number) => (
                    <Tag key={idx} variant="primary" size="sm">{tag}</Tag>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                {generatedAiTeamPreview.category && <span>分类: {generatedAiTeamPreview.category}</span>}
                {generatedAiTeamPreview.workflow?.steps && <span>工作流步骤: {generatedAiTeamPreview.workflow.steps.length} 个</span>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => {
                setShowPreviewModal(false);
                setGeneratedAiTeamPreview(null);
              }}>
                取消
              </Button>
              <Link href="/projects" onClick={() => setShowPreviewModal(false)}>
                <Button icon={<Plus size={16} />}>
                  保存到项目
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>

    </Container>
  );
}
