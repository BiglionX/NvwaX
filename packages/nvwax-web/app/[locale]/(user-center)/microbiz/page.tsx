'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { microbizApi, MicroBizTeam } from '@/lib/api/microbiz';
import { Button, Card } from '@/components/UI';
import { Store, Users, Check, X, Play, Pause, Trash2, Settings, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import LoadingState from '@/components/Layout/LoadingState';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

// 团队颜色映射
const teamColors: Record<string, string> = {
  social_media: '#7C3AED',
  local_deals: '#059669',
  mini_program: '#2563EB'
};

// 团队名称映射
const teamCategoryNames: Record<string, string> = {
  social_media: '新媒体运营',
  local_deals: '本地团购',
  mini_program: '小程序商城'
};

// 平台名称映射
const platformLabels: Record<string, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  weixin_video: '微信视频号',
  meituan: '美团',
  shanguo: '闪购',
  weixin_mini: '微信小程序'
};

export default function MicroBizManagementPage() {
  const { userInfo } = useAuth();
  const queryClient = useQueryClient();
  const token = typeof window !== 'undefined' ? localStorage.getItem('user_token') || undefined : undefined;
  const userId = userInfo?.id;

  // 获取安装记录
  const { data: installData, isLoading: loadingInstall, error: installError } = useQuery({
    queryKey: ['microbiz-installation', userId],
    queryFn: () => microbizApi.getInstallation(token),
    enabled: !!token
  });

  // 获取所有团队定义
  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ['microbiz-teams'],
    queryFn: () => microbizApi.getTeams()
  });

  const installation = installData?.data;
  const isInstalled = installation && installation.status !== 'uninstalled';
  const teams = teamsData?.data || [];
  const selectedTeams = (installation?.selectedTeams || []) as string[];

  // 更新状态（暂停/恢复/卸载）
  const statusMutation = useMutation({
    mutationFn: (newStatus: 'active' | 'paused' | 'uninstalled') =>
      microbizApi.updateStatus(newStatus, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['microbiz-installation', userId] });
    }
  });

  const handlePause = () => statusMutation.mutate('paused');
  const handleResume = () => statusMutation.mutate('active');
  const handleUninstall = () => {
    if (window.confirm('确定要卸载 MicroBiz AI Team Suite 吗？所有配置数据将被清除。')) {
      statusMutation.mutate('uninstalled');
    }
  };

  if (loadingInstall || loadingTeams) {
    return <LoadingState />;
  }

  if (installError) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
        <p className="text-gray-500 dark:text-gray-400">加载数据失败，请稍后重试</p>
        <Button variant="outline" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['microbiz-installation', userId] })}>
          <RefreshCw size={16} className="mr-2" />
          重新加载
        </Button>
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <Store size={24} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">MicroBiz AI Team Suite</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">小商家经营 AI 团队套件</p>
          </div>
        </div>

        <Card padding="lg">
          <div className="text-center py-8">
            <Store size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">尚未安装 MicroBiz 套件</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              前往 MarketPlace 安装 MicroBiz AI Team Suite，一键启用新媒体运营、本地团购、小程序商城三大 AI 团队。
            </p>
            <Link
              href="/marketplace?category=microbiz"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              <ExternalLink size={18} />
              前往 MarketPlace
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <Store size={24} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">MicroBiz AI Team Suite</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {installation.status === 'active' ? '运行中' : '已暂停'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {installation.status === 'active' ? (
            <Button variant="outline" onClick={handlePause} loading={statusMutation.isPending}>
              <Pause size={16} className="mr-1.5" />
              暂停
            </Button>
          ) : (
            <Button variant="primary" onClick={handleResume} loading={statusMutation.isPending}>
              <Play size={16} className="mr-1.5" />
              恢复运行
            </Button>
          )}
          <Button variant="outline" onClick={handleUninstall} loading={statusMutation.isPending} className="text-red-500 hover:text-red-600 hover:border-red-300">
            <Trash2 size={16} className="mr-1.5" />
            卸载
          </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${installation.status === 'active' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
              {installation.status === 'active' ? (
                <Check size={20} className="text-green-600 dark:text-green-400" />
              ) : (
                <Pause size={20} className="text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">运行状态</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {installation.status === 'active' ? '正常运行' : '已暂停'}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">已启用团队</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {selectedTeams.length} / {teams.length}
              </p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Settings size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">账号绑定</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {Object.keys(installation.accountBindings || {}).length} 个平台
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 已启用的团队列表 */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Users size={20} className="text-purple-500" />
        已启用的运营团队
      </h2>

      <div className="space-y-4 mb-6">
        {selectedTeams.map((teamId) => {
          const team = teams.find((t: MicroBizTeam) => t.id === teamId);
          if (!team) return null;

          const teamColor = team.color || teamColors[team.category] || '#7C3AED';
          const agentStatuses = (installation?.agentStatus || {}) as Record<string, JsonValue>;

          return (
            <div key={teamId} className="border-l-4 rounded-xl" style={{ borderLeftColor: teamColor }}>
            <Card padding="md">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">{team.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{team.description}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${teamColor}20`, color: teamColor }}>
                  {teamCategoryNames[team.category] || team.category}
                </span>
              </div>

              {/* Agent 状态列表 */}
              {team.agents && team.agents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Agent 运行状态</p>
                  <div className="grid gap-2">
                    {team.agents.map((agent) => {
                      const agentStatus = agentStatuses[agent.id] as JsonValue;
                      const status = typeof agentStatus === 'object' && agentStatus !== null
                        ? String((agentStatus as Record<string, JsonValue>).status || 'stopped')
                        : 'stopped';

                      return (
                        <div key={agent.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              status === 'running' ? 'bg-green-500' :
                              status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                            }`} />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{agent.name}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">({agent.role})</span>
                          </div>
                          <span className={`text-xs ${
                            status === 'running' ? 'text-green-600 dark:text-green-400' :
                            status === 'error' ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            {status === 'running' ? '运行中' : status === 'error' ? '异常' : '已停止'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 账号绑定状态 */}
              {team.accountBindingsTemplate && (team.accountBindingsTemplate as JsonValue[]).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">账号绑定</p>
                  <div className="flex flex-wrap gap-2">
                    {(team.accountBindingsTemplate as JsonValue[]).map((tmpl, idx) => {
                      const template = tmpl as Record<string, JsonValue>;
                      const platform = String(template.platform || '');
                      const bindings = (installation?.accountBindings || {}) as Record<string, JsonValue>;
                      const isBound = !!bindings[platform];

                      return (
                        <div key={idx} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                          isBound
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}>
                          {isBound ? <Check size={12} /> : <X size={12} />}
                          {platformLabels[platform] || platform}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
            </div>
          );
        })}
      </div>

      {/* 运营偏好 */}
      {installation.preferences && Object.keys(installation.preferences as Record<string, JsonValue>).length > 0 && (
        <Card padding="md">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Settings size={18} className="text-purple-500" />
            运营偏好设置
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">自动回复</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {(installation.preferences as Record<string, JsonValue>).auto_reply_enabled ? '已开启' : '已关闭'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">人工审核</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {(installation.preferences as Record<string, JsonValue>).manual_review_required ? '需要审核' : '自动通过'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">库存告警阈值</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {(installation.preferences as Record<string, JsonValue>).inventory_alert_threshold || '-'} 件
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">分析周期</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {(installation.preferences as Record<string, JsonValue>).analysis_period_days || '-'} 天
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
