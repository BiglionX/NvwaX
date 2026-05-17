'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { 
  RefreshCw, 
  Play, 
  Settings, 
  Trash2, 
  Database, 
  Globe, 
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function AdminCrawlerPage() {
  const queryClient = useQueryClient();
  const [intervalHours, setIntervalHours] = useState(24);
  const [cleanDays, setCleanDays] = useState(90);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showCleanForm, setShowCleanForm] = useState(false);

  // 获取爬虫状态
  const { data: crawlerStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ['crawler-status'],
    queryFn: () => adminApi.getCrawlerStatus(),
    refetchInterval: 10000 // 每10秒刷新一次
  });

  // 获取爬取历史
  const { data: crawlerHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['crawler-history'],
    queryFn: () => adminApi.getCrawlerHistory(20)
  });

  // 手动触发爬虫
  const triggerCrawlerMutation = useMutation({
    mutationFn: () => adminApi.triggerCrawler(),
    onSuccess: () => {
      alert('爬虫任务已启动！');
      // 5秒后刷新状态
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['crawler-status'] });
        queryClient.invalidateQueries({ queryKey: ['crawler-history'] });
      }, 5000);
    },
    onError: (error: Error) => {
      alert('触发失败: ' + error.message);
    }
  });

  // 更新配置
  const updateConfigMutation = useMutation({
    mutationFn: (hours: number) => adminApi.updateCrawlerConfig(hours),
    onSuccess: () => {
      alert('配置已更新！');
      setShowConfigForm(false);
      queryClient.invalidateQueries({ queryKey: ['crawler-status'] });
    },
    onError: (error: Error) => {
      alert('更新失败: ' + error.message);
    }
  });

  // 清理旧数据
  const cleanDataMutation = useMutation({
    mutationFn: (days: number) => adminApi.cleanOldAgents(days),
    onSuccess: (data) => {
      alert(data.message);
      setShowCleanForm(false);
      queryClient.invalidateQueries({ queryKey: ['crawler-status'] });
      queryClient.invalidateQueries({ queryKey: ['crawler-history'] });
    },
    onError: (error: Error) => {
      alert('清理失败: ' + error.message);
    }
  });

  const handleTriggerCrawl = () => {
    if (confirm('确定要手动触发爬虫任务吗？这可能需要几分钟时间。')) {
      triggerCrawlerMutation.mutate();
    }
  };

  const handleUpdateConfig = () => {
    if (confirm(`确定要将爬虫间隔更新为 ${intervalHours} 小时吗？`)) {
      updateConfigMutation.mutate(intervalHours);
    }
  };

  const handleCleanData = () => {
    if (confirm(`确定要删除 ${cleanDays} 天前的旧数据吗？此操作不可恢复！`)) {
      cleanDataMutation.mutate(cleanDays);
    }
  };

  if (loadingStatus) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Loader2 className="animate-spin mx-auto mb-4" size={48} />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">爬虫管理</h1>
        <p className="text-gray-600 dark:text-gray-300">管理 Agent 元数据的自动爬取和更新</p>
      </div>

      {/* 状态卡片 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 调度器状态 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <RefreshCw className="text-blue-500" size={24} />
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              crawlerStatus?.scheduler?.isRunning 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {crawlerStatus?.scheduler?.isRunning ? '运行中' : '已停止'}
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">调度器状态</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {crawlerStatus?.scheduler?.isRunning ? '✓ 正常' : '✗ 停止'}
          </p>
        </div>

        {/* 总 Agent 数 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Database className="text-purple-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Agent 总数</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {crawlerStatus?.statistics?.totalAgents || 0}
          </p>
        </div>

        {/* GitHub Agents */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">GitHub Agents</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {crawlerStatus?.statistics?.githubAgents || 0}
          </p>
        </div>

        {/* HuggingFace Agents */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <Globe className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">HuggingFace Agents</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {crawlerStatus?.statistics?.huggingfaceAgents || 0}
          </p>
        </div>
      </div>

      {/* 最后爬取时间 */}
      {crawlerStatus?.statistics?.lastCrawlTime && (
        <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Clock size={20} />
            <span className="font-medium">最后爬取时间:</span>
            <span>{new Date(crawlerStatus.statistics.lastCrawlTime).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={handleTriggerCrawl}
          disabled={triggerCrawlerMutation.isPending}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {triggerCrawlerMutation.isPending ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Play size={20} />
          )}
          手动触发爬虫
        </button>

        <button
          onClick={() => setShowConfigForm(!showConfigForm)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium"
        >
          <Settings size={20} />
          更新配置
        </button>

        <button
          onClick={() => setShowCleanForm(!showCleanForm)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
        >
          <Trash2 size={20} />
          清理旧数据
        </button>
      </div>

      {/* 配置表单 */}
      {showConfigForm && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">更新爬虫间隔</h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                间隔时间（小时）
              </label>
              <input
                type="number"
                value={intervalHours}
                onChange={(e) => setIntervalHours(parseInt(e.target.value))}
                min="1"
                max="168"
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                范围: 1-168 小时（1小时-7天）
              </p>
            </div>
            <button
              onClick={handleUpdateConfig}
              disabled={updateConfigMutation.isPending}
              className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {updateConfigMutation.isPending ? '更新中...' : '确认更新'}
            </button>
            <button
              onClick={() => setShowConfigForm(false)}
              className="px-6 py-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 清理数据表单 */}
      {showCleanForm && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-red-200 dark:border-red-800 p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="text-red-500 shrink-0" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">清理旧数据</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                警告：此操作将永久删除指定天数前的所有 Agent 数据，无法恢复！
              </p>
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                删除多少天前的数据
              </label>
              <input
                type="number"
                value={cleanDays}
                onChange={(e) => setCleanDays(parseInt(e.target.value))}
                min="1"
                max="365"
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                范围: 1-365 天
              </p>
            </div>
            <button
              onClick={handleCleanData}
              disabled={cleanDataMutation.isPending}
              className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {cleanDataMutation.isPending ? '清理中...' : '确认删除'}
            </button>
            <button
              onClick={() => setShowCleanForm(false)}
              className="px-6 py-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 爬取历史 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">最近爬取记录</h2>
        </div>
        <div className="p-6">
          {loadingHistory ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : crawlerHistory?.data?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">名称</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">来源</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Stars</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Downloads</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">爬取时间</th>
                  </tr>
                </thead>
                <tbody>
                  {crawlerHistory.data.map((agent: {
                    id: string;
                    name: string;
                    source: string;
                    stars: number;
                    downloads: number;
                    last_crawled_at: string;
                  }) => (
                    <tr key={agent.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{agent.name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          agent.source === 'github' 
                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {agent.source === 'github' ? (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                          ) : (
                            <Globe size={12} className="mr-1" />
                          )}
                          {agent.source}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{agent.stars || 0}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{agent.downloads || 0}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {agent.last_crawled_at ? new Date(agent.last_crawled_at).toLocaleString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Database className="mx-auto mb-2 opacity-50" size={48} />
              <p>暂无爬取记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
