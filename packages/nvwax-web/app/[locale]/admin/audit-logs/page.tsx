'use client';

/**
 * Admin 审计日志页面（v2.3+）
 * ----------------------------------------------------------------
 * - 列：Level / Action / 来源 / 用户(管理员/普通用户) / 资源 ID / 详情 / IP / 时间
 * - 过滤：action 模糊匹配 + source 下拉 + resourceId 精确匹配
 * - source='nvwa-workbench' 的事件来自 Nvwa 工作台前端（user 级），
 *   通过 POST /api/admin/system/logs 主动推送持久化
 * - v2.3+ resourceId 字段：关联资源全链路追踪（agentId / blueprintId / sessionId / aiteamId）
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { adminApi, type AuditLog } from '@/lib/api/admin';
import {
  Search,
  Calendar,
  Shield,
  User as UserIcon,
  Code2,
  Loader2,
  Globe2,
  Hash,
  X,
} from 'lucide-react';

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: 'admin', label: 'Admin 操作' },
  { value: 'nvwa-workbench', label: 'Nvwa 工作台（前端）' },
] as const;

export default function AdminAuditLogsPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [resourceIdFilter, setResourceIdFilter] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const limit = 20;

  const hasFilters = !!actionFilter || !!sourceFilter || !!resourceIdFilter;

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['admin-logs', page, actionFilter, sourceFilter, resourceIdFilter],
    queryFn: () =>
      adminApi.getSystemLogs({
        page,
        limit,
        action: actionFilter || undefined,
        source: sourceFilter || undefined,
        resourceId: resourceIdFilter || undefined,
      }),
    placeholderData: (previousData) => previousData,
  });

  const totalPages = logsData ? Math.ceil(logsData.total / limit) : 0;

  if (isLoading) {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('auditTitle')}</h1>
        <p className="text-gray-600 dark:text-gray-300">{t('auditDesc')}</p>
      </div>

      {/* 筛选栏 */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('auditSearchPlaceholder')}
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
          />
        </div>
        <div className="sm:w-56">
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm text-gray-900 dark:text-white"
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:w-72 relative">
          <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="资源 ID（精确匹配，如 agent-xxx）"
            value={resourceIdFilter}
            onChange={(e) => {
              setResourceIdFilter(e.target.value.trim());
              setPage(1);
            }}
            className="w-full pl-9 pr-9 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-mono text-gray-900 dark:text-white"
          />
          {resourceIdFilter && (
            <button
              onClick={() => setResourceIdFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              aria-label="清除资源 ID 过滤"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>
        {hasFilters && (
          <button
            onClick={() => {
              setActionFilter('');
              setSourceFilter('');
              setResourceIdFilter('');
              setPage(1);
            }}
            className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            清除全部
          </button>
        )}
      </div>

      {/* 日志表格 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Level</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Action</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">来源</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">用户</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">资源 ID</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">详情</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">IP</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">时间</th>
              <th className="px-4 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logsData?.data && logsData.data.length > 0 ? (
              logsData.data.map((log) => {
                const isNvwa = log.source === 'nvwa-workbench';
                const levelClass =
                  log.level === 'error'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    : log.level === 'warning'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
                return (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${levelClass}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">{log.action}</td>
                    <td className="px-4 py-3">
                      {isNvwa ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <Code2 size={11} />
                          Nvwa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          <Shield size={11} />
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {log.userId && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                            <UserIcon size={11} />
                            <span className="font-mono">{log.userId.slice(0, 12)}…</span>
                          </span>
                        )}
                        {log.adminId && (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300">
                            <Shield size={11} />
                            <span className="font-mono">{log.adminId.slice(0, 12)}…</span>
                          </span>
                        )}
                        {!log.userId && !log.adminId && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.resourceId ? (
                        <button
                          onClick={() => {
                            setResourceIdFilter(log.resourceId!);
                            setPage(1);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors max-w-[12rem] truncate"
                          title={`点击过滤：${log.resourceId}`}
                        >
                          <Hash size={10} />
                          {log.resourceId.slice(0, 16)}
                          {log.resourceId.length > 16 ? '…' : ''}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="text-xs text-gray-700 dark:text-gray-300 truncate" title={log.details}>
                        {log.details || <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                      {log.ipAddress || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(log.createdAt).toLocaleString(locale)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                      >
                        详情
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  <Globe2 className="mx-auto mb-2 opacity-50" size={32} />
                  <p>暂无审计日志{hasFilters && '（尝试清除过滤条件）'}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
            {page} / {totalPages} · 共 {logsData?.total ?? 0} 条
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      {/* 详情 Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4">审计日志详情</h3>
            <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <dt className="font-medium text-gray-600 dark:text-gray-400">Action</dt>
              <dd className="col-span-2 font-mono">{selectedLog.action}</dd>
              <dt className="font-medium text-gray-600 dark:text-gray-400">Level</dt>
              <dd className="col-span-2">{selectedLog.level}</dd>
              <dt className="font-medium text-gray-600 dark:text-gray-400">Source</dt>
              <dd className="col-span-2 font-mono">{selectedLog.source || '—'}</dd>
              <dt className="font-medium text-gray-600 dark:text-gray-400">User ID</dt>
              <dd className="col-span-2 font-mono">{selectedLog.userId || '—'}</dd>
              <dt className="font-medium text-gray-600 dark:text-gray-400">Admin ID</dt>
              <dd className="col-span-2 font-mono">{selectedLog.adminId || '—'}</dd>
              <dt className="font-medium text-gray-600 dark:text-gray-400">Resource ID</dt>
              <dd className="col-span-2 font-mono">{selectedLog.resourceId || '—'}</dd>
              <dt className="font-medium text-gray-600 dark:text-gray-400">IP</dt>
              <dd className="col-span-2 font-mono">{selectedLog.ipAddress || '—'}</dd>
              <dt className="font-medium text-gray-600 dark:text-gray-400">Time</dt>
              <dd className="col-span-2">{new Date(selectedLog.createdAt).toLocaleString(locale)}</dd>
              <dt className="font-medium text-gray-600 dark:text-gray-400">Details</dt>
              <dd className="col-span-2 whitespace-pre-wrap text-xs">{selectedLog.details || '—'}</dd>
            </dl>
            <button
              onClick={() => setSelectedLog(null)}
              className="mt-6 w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}