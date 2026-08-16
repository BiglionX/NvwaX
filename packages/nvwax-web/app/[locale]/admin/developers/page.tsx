'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { adminApi } from '@/lib/api/admin';
import {
  Code,
  Key,
  Search,
  Loader2,
  Mail,
  Calendar,
  Zap,
  Ban,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  Shield,
  Activity
} from 'lucide-react';

interface DeveloperApiKey {
  id: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  rate_limit: number;
}

interface DeveloperInfo {
  user_id: string;
  user_name: string;
  user_email: string;
  api_key_count: number;
  api_keys: DeveloperApiKey[];
  monthly_limit: number;
  used_this_month: number;
  remaining: number;
  usage_percent: number;
  overage_tokens: number;
  overage_cost: number;
  total_used: number;
  is_internal_team: boolean;
}

export default function AdminDevelopersPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const limit = 20;

  const toggleInternalMutation = useMutation({
    mutationFn: (userId: string) => adminApi.toggleInternalTeam(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-developers'] });
    }
  });

  const { data, isLoading } = useQuery<{
    data: DeveloperInfo[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ['admin-developers', page, debouncedSearch],
    queryFn: () => adminApi.getDeveloperList(page, limit, debouncedSearch || undefined),
    placeholderData: (previousData) => previousData
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const developers = data?.data || [];
  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Loader2 className="animate-spin mx-auto mb-4" size={48} />
        <p>{t('devLoading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <Code className="text-blue-500" size={28} />
          {t('devTitle')}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {t('devDesc')}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Code className="text-blue-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('devTotal')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.total || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Key className="text-green-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('devTotalKeys')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {developers.reduce((sum, d) => sum + d.api_key_count, 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Shield className="text-purple-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('devInternalTeam')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {developers.filter(d => d.is_internal_team).length}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Zap className="text-orange-500" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('devMonthlyUsed')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatTokens(developers.reduce((sum, d) => sum + d.used_this_month, 0))}
          </p>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('devSearchPlaceholder')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* 开发者列表 */}
      <div className="space-y-4">
        {developers.length > 0 ? (
          developers.map((dev) => (
            <div
              key={dev.user_id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* 开发者头部信息 */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-purple-700 rounded-full flex items-center justify-center shrink-0">
                      <Code className="text-white" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {dev.user_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail size={14} />
                        <span>{dev.user_email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* 内部团队开关 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{t('devInternalTeam')}</span>
                      <button
                        onClick={() => toggleInternalMutation.mutate(dev.user_id)}
                        disabled={toggleInternalMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          dev.is_internal_team ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            dev.is_internal_team ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <button
                      onClick={() => setExpandedUser(expandedUser === dev.user_id ? null : dev.user_id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      {expandedUser === dev.user_id ? (
                        <><ChevronUp size={16} /> {t('devCollapse')}</>
                      ) : (
                        <><ChevronDown size={16} /> {t('devExpand')}</>
                      )}
                    </button>
                  </div>
                </div>

                {/* 概览信息 */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">API Key</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Key size={14} className="text-blue-500" />
                      <span className="font-bold text-gray-900 dark:text-white">{dev.api_key_count}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('devQuota')}</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">{formatTokens(dev.monthly_limit)}</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('devUsedThisMonth')}</p>
                    <p className="font-bold text-blue-600 dark:text-blue-400 mt-1">{formatTokens(dev.used_this_month)}</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('devUsageRate')}</p>
                    <p className={`font-bold mt-1 ${
                      dev.usage_percent > 100 ? 'text-red-500' : dev.usage_percent > 80 ? 'text-orange-500' : 'text-green-500'
                    }`}>{dev.usage_percent}%</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('status')}</p>
                    {dev.is_internal_team ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 mt-1">
                        <Shield size={12} /> {t('devInternalTeam')}
                      </span>
                    ) : dev.usage_percent > 100 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 mt-1">
                        <Zap size={12} /> {t('devOverage')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 mt-1">
                        <Activity size={12} /> {t('normal')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 展开详情：API Key 列表 */}
              {expandedUser === dev.user_id && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  <div className="p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Key size={18} className="text-blue-500" />
                      {t('devListTitle', { count: dev.api_key_count })}
                    </h4>

                    {dev.api_keys.length > 0 ? (
                      <div className="space-y-3">
                        {dev.api_keys.map((apiKey) => (
                          <div key={apiKey.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  apiKey.is_active
                                    ? 'bg-green-100 dark:bg-green-900/30'
                                    : 'bg-red-100 dark:bg-red-900/30'
                                }`}>
                                  <Key size={16} className={apiKey.is_active ? 'text-green-600' : 'text-red-500'} />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{apiKey.name}</p>
                                  <code className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                    {apiKey.key_prefix}****
                                  </code>
                                </div>
                              </div>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                apiKey.is_active
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }`}>
                                {apiKey.is_active ? <CheckCircle size={12} /> : <Ban size={12} />}
                                {apiKey.is_active ? t('devEnabled') : t('devDisabled')}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <Calendar size={14} />
                                <span>{t('devCreated', { date: new Date(apiKey.created_at).toLocaleDateString(locale) })}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <Clock size={14} />
                                <span>
                                  {apiKey.last_used_at
                                    ? t('devLastUsed', { date: new Date(apiKey.last_used_at).toLocaleDateString(locale) })
                                    : t('devNeverUsed')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <Cpu size={14} />
                                <span>{t('devRateLimit', { rate: apiKey.rate_limit })}</span>
                              </div>
                            </div>

                            {apiKey.permissions && apiKey.permissions.length > 0 && (
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs text-gray-500">{t('devPermissions')}</span>
                                <div className="flex gap-1.5 flex-wrap">
                                  {apiKey.permissions.map((perm) => (
                                    <span key={perm} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                                      {perm}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <Key className="mx-auto mb-2 opacity-50" size={32} />
                        <p>{t('devNoKeys')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Code className="mx-auto mb-4 opacity-30" size={64} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('devNoDevelopers')}</h3>
            <p className="text-gray-500">{t('devNoDevelopersDesc')}</p>
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('pageSummary', { page, totalPages, total: data?.total || 0 })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-all"
            >
              {t('prevPage')}
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-all"
            >
              {t('nextPage')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
