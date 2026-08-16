'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { RefreshCw, Shield, Key, Activity, Database, Trash2, Download, CheckCircle, AlertCircle, Loader2, Server, Cpu, HardDrive } from 'lucide-react';

export default function SettingsPage() {
  const t = useTranslations('admin');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showBackupConfirm, setShowBackupConfirm] = useState(false);
  const [showCacheConfirm, setShowCacheConfirm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => adminApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword),
    onSuccess: () => {
      setShowPasswordModal(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      alert(t('passwordChanged'));
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || t('changeFailed'));
    }
  });

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert(t('passwordNotMatch'));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert(t('passwordTooShort'));
      return;
    }

    changePasswordMutation.mutate();
  };

  // 获取系统健康状态
  const { data: health, isLoading: loadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => adminApi.getSystemHealth(),
    refetchInterval: 30000 // 每30秒刷新一次
  });

  // 清理缓存
  const clearCacheMutation = useMutation({
    mutationFn: () => adminApi.clearCache(),
    onSuccess: () => {
      alert(t('cacheCleared'));
      setShowCacheConfirm(false);
    },
    onError: (error: Error) => {
      alert(t('clearFailed') + error.message);
    }
  });

  // 数据库备份
  const backupMutation = useMutation({
    mutationFn: () => adminApi.backupDatabase(),
    onSuccess: (data) => {
      const result = data as { data?: { backupFile?: string } };
      alert(t('backupStarted') + result.data?.backupFile);
      setShowBackupConfirm(false);
    },
    onError: (error: Error) => {
      alert(t('backupFailed') + error.message);
    }
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return t('uptimeDaysHours', { days, hours });
    if (hours > 0) return t('uptimeHoursMinutes', { hours, minutes });
    return t('uptimeMinutes', { minutes });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('settingsTitle')}</h1>
        <p className="text-gray-600 dark:text-gray-300">{t('settingsDesc')}</p>
      </div>

      <div className="space-y-6">
        {/* Security Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('securitySettings')}</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">{t('changePasswordTitle')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('changePasswordDesc')}</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                <Key size={18} />
                {t('changePasswordBtn')}
              </button>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCw className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('systemInfoTitle')}</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('systemVersion')}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">v1.0.0</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('dbType')}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">SQLite</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('backendFramework')}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Express.js</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('frontendFramework')}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Next.js 16</p>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('aboutNvwax')}</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('aboutDesc')}
          </p>
        </div>

        {/* 系统健康监控 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="text-blue-600 dark:text-blue-400" size={24} />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('systemHealthMonitor')}</h2>
            </div>
            <button
              onClick={() => refetchHealth()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
            >
              <RefreshCw size={18} />
              {t('refreshBtn')}
            </button>
          </div>

          {loadingHealth ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="animate-spin mx-auto mb-2" size={32} />
              <p>{t('loading')}</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 整体状态 */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {health?.status === 'healthy' ? (
                      <CheckCircle className="text-green-500" size={20} />
                    ) : (
                      <AlertCircle className="text-yellow-500" size={20} />
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('systemStatus')}</span>
                  </div>
                  <p className={`text-lg font-bold ${
                    health?.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {health?.status === 'healthy' ? t('healthy') : t('abnormal')}
                  </p>
                </div>

                {/* 运行时间 */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="text-blue-500" size={20} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('runtime')}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {health ? formatUptime(health.uptime) : '-'}
                  </p>
                </div>

                {/* 内存使用 */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="text-orange-500" size={20} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('memoryUsage')}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {health ? formatBytes(health.memory.rss) : '-'}
                  </p>
                </div>

                {/* 数据库状态 */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="text-blue-500" size={20} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('databaseStatus')}</span>
                  </div>
                  <p className={`text-lg font-bold ${
                    health?.database?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {health?.database?.status === 'healthy' ? t('healthy') : t('abnormal')}
                  </p>
                </div>
              </div>

              {/* 详细信息 */}
              {health && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('nodeInfo')}</h3>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>{t('nodeVersion')}: {health.nodeVersion}</p>
                      <p>{t('platformLabel')}: {health.platform}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dbPool')}</h3>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>{t('totalConn')}: {health.database.poolSize}</p>
                      <p>{t('idleConn')}: {health.database.idleCount}</p>
                      <p>{t('waitingQueue')}: {health.database.waitingCount}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 系统维护操作 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <HardDrive className="text-green-600 dark:text-green-400" size={24} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('maintenanceTitle')}</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 清理缓存 */}
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Trash2 className="text-orange-500" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{t('clearCacheTitle')}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('clearCacheDesc')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCacheConfirm(true)}
                disabled={clearCacheMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {clearCacheMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    {t('clearingCache')}
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    {t('clearNow')}
                  </>
                )}
              </button>
            </div>

            {/* 数据库备份 */}
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Download className="text-green-500" size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{t('dbBackupTitle')}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('dbBackupDesc')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowBackupConfirm(true)}
                disabled={backupMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {backupMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    {t('backingUp')}
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    {t('startBackup')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('passwordModalTitle')}</h2>
            
            <form onSubmit={handleSubmitPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('currentPassword')}
                </label>
                <input
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('newPassword')}
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('confirmNewPassword')}
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {changePasswordMutation.isPending ? t('changing') : t('confirmChange')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 确认弹窗 - 清理缓存 */}
      {showCacheConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="text-orange-500 shrink-0" size={24} />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('confirmClearCacheTitle')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('confirmClearCacheDesc')}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCacheConfirm(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => clearCacheMutation.mutate()}
                disabled={clearCacheMutation.isPending}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {clearCacheMutation.isPending ? t('clearingCache') : t('confirmClearBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认弹窗 - 数据库备份 */}
      {showBackupConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <Database className="text-green-500 shrink-0" size={24} />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('confirmDbBackupTitle')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('confirmDbBackupDesc')}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBackupConfirm(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => backupMutation.mutate()}
                disabled={backupMutation.isPending}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {backupMutation.isPending ? t('backingUp') : t('confirmBackupBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
