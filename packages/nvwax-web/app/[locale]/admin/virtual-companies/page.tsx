'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { adminApi } from '@/lib/api/admin';
import { Package, Clock, CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react';

interface BuildJob {
  id: string;
  teamSkillId: string;
  platform: 'windows' | 'macos' | 'linux';
  status: 'queued' | 'building' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export default function AdminVirtualCompaniesPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  // 获取 AiTeam 打包任务列表
  const { data: buildsData, isLoading: loadingBuilds } = useQuery({
    queryKey: ['admin-virtual-companies-builds'],
    queryFn: () => adminApi.getAiTeamBuilds(),
    refetchInterval: 5000 // 每5秒刷新一次以监控进度
  });

  const getStatusBadge = (status: BuildJob['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            <CheckCircle size={14} />
            {t('completed')}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <XCircle size={14} />
            {t('failed')}
          </span>
        );
      case 'building':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
            <Loader2 className="animate-spin" size={14} />
            {t('building')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
            <Clock size={14} />
            {t('queued')}
          </span>
        );
    }
  };

  if (loadingBuilds) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Loader2 className="animate-spin mx-auto mb-4" size={48} />
        <p>{t('loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('buildsTitle')}</h1>
        <p className="text-gray-600 dark:text-gray-300">{t('buildsDesc')}</p>
      </div>

      {/* 打包任务列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('taskId')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('targetPlatform')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('progressCol')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('status')}</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">{t('createTime')}</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {buildsData?.data && buildsData.data.length > 0 ? (
              buildsData.data.map((job: BuildJob) => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-mono text-gray-600 dark:text-gray-400">
                      <Package size={16} />
                      <span className="truncate max-w-50">{job.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                      {job.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full max-w-37.5">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{job.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            job.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(job.status)}
                    {job.error && (
                      <p className="text-xs text-red-500 mt-1 truncate max-w-50" title={job.error}>
                        {job.error}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar size={16} />
                      {new Date(job.createdAt).toLocaleString(locale)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {job.downloadUrl && (
                        <a
                          href={job.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors text-sm flex items-center gap-2"
                        >
                          <Package size={16} />
                          {t('download')}
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <Package className="mx-auto mb-2 opacity-50" size={48} />
                  <p>{t('noBuildRecords')}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
