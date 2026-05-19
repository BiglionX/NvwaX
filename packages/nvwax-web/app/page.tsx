'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Star, ArrowRight, Sparkles, TrendingUp, Layers } from 'lucide-react';
import { searchApi, Agent } from '@/lib/api/search';
import { 
  Container, 
  Card, 
  Button, 
  Input,
  Badge,
  Skeleton,
  Space,
  Tag,
  Divider
} from '@/components/UI';

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
    <Container size="xl" className="py-8 space-y-12">
      {/* Hero Section with Search */}
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
          欢迎使用 NvwaX
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          开源的 AI Agent 搜索、发现和管理平台
        </p>

        {/* Search Box */}
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSearch}>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 AI Agent、技能、框架..."
              prefix={<Search size={20} />}
              suffix={
                <Button variant="primary" type="submit" size="md">
                  搜索
                </Button>
              }
              className="w-full"
            />
          </form>

          {/* Quick Filters */}
          <Space size="small" className="mt-4 justify-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">快速筛选：</span>
            {quickFilters.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <Tag
                  key={filter.id}
                  variant={isActive ? 'primary' : 'default'}
                  selectable
                  selected={isActive}
                  onSelect={() => setActiveFilter(filter.id)}
                  icon={<Icon size={16} />}
                  size="md"
                >
                  {filter.label}
                </Tag>
              );
            })}
          </Space>
        </div>

        {/* Stats */}
        <Space size="large" className="justify-center text-sm text-gray-500 dark:text-gray-400">
          <Space size={8}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>Open Source</span>
          </Space>
          <Space size={8}>
            <Star size={16} />
            <span>240+ Agents</span>
          </Space>
          <Space size={8}>
            <Layers size={16} />
            <span>Multi-platform</span>
          </Space>
        </Space>
      </div>

      {/* Trending Agents Preview */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-orange-500" size={24} />
              热门 Agent
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">按星级排序的热门项目</p>
          </div>
          <Link href="/marketplace">
            <Button variant="ghost" rightIcon={<ArrowRight size={16} />}>
              查看全部
            </Button>
          </Link>
        </div>

        {loadingTrending ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {trendingAgents?.data?.slice(0, 6).map((agent: Agent) => (
              <Link
                key={agent.id}
                href={`/search?q=${encodeURIComponent(agent.name)}`}
                className="block"
              >
                <Card padding="lg" variant="clickable" className="h-full">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {agent.name}
                    </h3>
                    {agent.stars && (
                      <Badge variant="warning">
                        <Star size={14} fill="currentColor" className="inline mr-1" />
                        {agent.stars.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {agent.description || '暂无描述'}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <Tag variant="default" size="sm">
                      {agent.source || 'Unknown'}
                    </Tag>
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
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Start Guide */}
      <Card className="bg-linear-to-r from-violet-500 to-purple-600 text-white" padding="lg">
        <h2 className="text-2xl font-bold mb-6">快速开始</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Space direction="vertical" size="middle">
            <Space size={8} align="start">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold">1</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">搜索 Agent</h3>
                <p className="text-sm text-white/80">搜索全网最优秀的 AI Agent 和技能</p>
              </div>
            </Space>
            <Space size={8} align="start">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold">2</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">发现技能</h3>
                <p className="text-sm text-white/80">浏览 SkillHub 平台的实用技能</p>
              </div>
            </Space>
          </Space>
          <Space direction="vertical" size="middle">
            <Space size={8} align="start">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold">3</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">创建团队</h3>
                <p className="text-sm text-white/80">创建和管理您的 AiTeam</p>
              </div>
            </Space>
            <Space size={8} align="start">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold">4</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">构建系统</h3>
                <p className="text-sm text-white/80">构建强大的 Agent 团队协作系统</p>
              </div>
            </Space>
          </Space>
        </div>
      </Card>

      {/* Data Sources */}
      <Card padding="lg">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          数据源覆盖
        </h2>
        <Divider />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { name: 'GitHub', count: '186+' },
            { name: 'Gitee', count: '15+' },
            { name: '百度', count: '16' },
            { name: '阿里', count: '16' },
            { name: '腾讯', count: '9' }
          ].map((source) => (
            <Card key={source.name} className="text-center" padding="md">
              <div className="text-2xl font-bold text-violet-600 dark:text-violet-400 mb-1">
                {source.count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {source.name}
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </Container>
  );
}

// Skeleton Card Component for Loading State
function SkeletonCard() {
  return (
    <Card padding="lg">
      <Skeleton variant="text" width="60%" height="24px" className="mb-3" />
      <Skeleton variant="text" width="100%" height="16px" className="mb-2" />
      <Skeleton variant="text" width="66%" height="16px" />
    </Card>
  );
}
