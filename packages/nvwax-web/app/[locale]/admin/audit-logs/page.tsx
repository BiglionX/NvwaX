'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Search, Eye, Calendar, User as UserIcon, Shield, Loader2 } from 'lucide-react';

interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  level: string;
  ipAddress: string;
  details: string;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const limit = 20;

  // 获取日志列表
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['admin-logs', page, actionFilter],
    queryFn: () => adminApi.getSystemLogs(page, limit),
    placeholderData: (previousData) => previousData
  });

  const totalPages = logsData ? Math.ceil(logsData.total / limit) : 0;

  if (isLoading) {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">安全审计日志</h1>
        <p className="text-gray-600 dark:text-gray-300">追踪管理员操作记录与系统安全事件</p>
      </div>

      {/* 筛选栏 */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜索操作类型 (如: LOGIN, CREATE_ADMIN)..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* 日志表格 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">操作类型</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">管理员</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">IP 地址</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">时间</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logsData?.data && logsData.data.length > 0 ? (
              logsData.data.map((log: AuditLog) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      log.level === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
                      log.level === 'error' ? 'bg-red-100 text-red-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <UserIcon size={16} />
                      {log.adminId}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {log.ipAddress}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar size={16} />
                      {new Date(log.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <Shield className="mx-auto mb-2 opacity-50" size={48} />
                  <p>暂无日志记录</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {`第 ${page} / ${totalPages} 页`}，{`共 ${logsData?.total || 0} 条记录`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-all"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-all"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">日志详情</h2>
              <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-700">关闭</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">操作 ID:</span>
                  <p className="font-mono mt-1">{selectedLog.id}</p>
                </div>
                <div>
                  <span className="text-gray-500">管理员 ID:</span>
                  <p className="font-mono mt-1">{selectedLog.adminId}</p>
                </div>
                <div>
                  <span className="text-gray-500">IP 地址:</span>
                  <p className="font-mono mt-1">{selectedLog.ipAddress}</p>
                </div>
                <div>
                  <span className="text-gray-500">操作时间:</span>
                  <p className="mt-1">{new Date(selectedLog.createdAt).toLocaleString('zh-CN')}</p>
                </div>
              </div>
              <div>
                <span className="text-gray-500 text-sm">详细描述:</span>
                <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {selectedLog.details}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
