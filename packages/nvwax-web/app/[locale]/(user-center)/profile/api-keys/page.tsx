'use client';

import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api/client';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  rate_limit: number;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface UsageStats {
  period: string;
  usage: Array<{ date: string; requests: number; tokens_used: number; errors: number }>;
  quota: { limit: number; used: number; remaining: number } | null;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/user/api-keys');
      setApiKeys(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    }
  }, []);

  const fetchUsageStats = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/user/api-keys/usage', { params: { period: 'month' } });
      setUsageStats(res.data.data || null);
    } catch (err) {
      console.error('Failed to fetch usage stats:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchApiKeys(),
      fetchUsageStats()
    ]).finally(() => setLoading(false));
  }, [fetchApiKeys, fetchUsageStats]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await apiClient.post('/api/user/api-keys', {
        name: newKeyName.trim()
      });
      setNewKeySecret(res.data.data.secret_key);
      setNewKeyName('');
      await fetchApiKeys();
    } catch (err) {
      console.error('Failed to create API key:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await apiClient.delete(`/api/user/api-keys/${id}`);
      setApiKeys(prev => prev.filter(k => k.id !== id));
    } catch (err) {
      console.error('Failed to delete API key:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getPermissionLabel = (perms: string[]) => {
    if (!perms || perms.includes('*')) return '全部权限（按 Token 计费）';
    const labels: string[] = [];
    if (perms.includes('marketplace:read')) labels.push('市场浏览');
    if (perms.includes('search:read')) labels.push('搜索');
    if (perms.includes('agent:*') || perms.includes('agent:create')) labels.push('Agent 管理');
    if (perms.includes('aiteam:*') || perms.includes('aiteam:create')) labels.push('AiTeam 管理');
    if (perms.includes('export:read')) labels.push('导出下载');
    if (perms.includes('chat:create')) labels.push('Chat API');
    return labels.join(', ') || perms.join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">API Keys</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            管理你的 API 密钥，按实际 Token 消耗计费（每月 100 万免费额度）
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + 创建 Key
        </button>
      </div>

      {/* Create API Key Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { if (!newKeySecret) setShowCreate(false); }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            {newKeySecret ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">密钥已创建</h3>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">请立即保存此密钥！</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">关闭此弹窗后将无法再次查看完整密钥。</p>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded text-sm font-mono break-all">
                    {newKeySecret}
                  </code>
                  <button
                    onClick={() => handleCopy(newKeySecret)}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <button
                  onClick={() => { setShowCreate(false); setNewKeySecret(null); }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  关闭
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">创建 API Key</h3>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="输入密钥名称（例如：生产环境 Key）"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4 text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newKeyName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    创建
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 使用量概览 */}
      {usageStats && usageStats.quota && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">本月 Token 消耗</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{usageStats.quota.used.toLocaleString()}</p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 rounded-full h-2 transition-all"
                style={{ width: `${Math.min((usageStats.quota.used / (usageStats.quota.limit || 1000000)) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">每月 {usageStats.quota.limit.toLocaleString()} 免费额度</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">超额费用</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {usageStats.quota.used > usageStats.quota.limit
                ? `¥${(((usageStats.quota.used - usageStats.quota.limit) / 1000000) * 10).toFixed(2)}`
                : '¥0.00'}
            </p>
            <p className="text-xs text-gray-400 mt-1">超出部分 ¥10/百万 Token</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">API Key 数量</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{apiKeys.length}</p>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400 mb-2">尚未创建 API Key</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">创建一个 Key 来开始使用 NvwaX API</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map(key => (
            <div key={key.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{key.name}</h4>
                  <code className="text-sm text-gray-500 dark:text-gray-400 font-mono">{key.key_prefix}...</code>
                </div>
                <button
                  onClick={() => handleDelete(key.id)}
                  disabled={deleting === key.id}
                  className="px-3 py-1 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  {deleting === key.id ? '删除中...' : '删除'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">权限：</span>
                  <span className="text-gray-700 dark:text-gray-300">{getPermissionLabel(key.permissions)}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">速率限制：</span>
                  <span className="text-gray-700 dark:text-gray-300">{key.rate_limit}/小时</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">创建时间：</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatDate(key.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">最近使用：</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatDate(key.last_used_at)}</span>
                </div>
                {key.expires_at && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">过期时间：</span>
                    <span className="text-gray-700 dark:text-gray-300">{formatDate(key.expires_at)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
