'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { adminApi } from '@/lib/api/admin';
import { Bell, Send, Loader2, AlertCircle } from 'lucide-react';

export default function AdminNotificationsPage() {
  const t = useTranslations('admin');
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'high'
  });

  const sendMutation = useMutation({
    mutationFn: (data: typeof formData) => adminApi.sendAnnouncement(data),
    onSuccess: (result) => {
      const r = result as { sentCount?: number };
      alert(t('sendSuccess', { count: r.sentCount ?? 0 }));
      setFormData({ title: '', message: '', priority: 'high' });
    },
    onError: (error: Error) => {
      alert(t('sendFailed') + error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return;
    sendMutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('notificationTitle')}</h1>
        <p className="text-gray-600 dark:text-gray-300">{t('notificationDesc')}</p>
      </div>

      {/* 发布公告表单 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Bell className="text-blue-500" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('publishNotification')}</h2>
            <p className="text-sm text-gray-500">{t('publishNotificationDesc')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('notificationTitleLabel')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('notificationTitlePlaceholder')}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('notificationContentLabel')}
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={t('notificationContentPlaceholder')}
              rows={6}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('priorityLabel')}
            </label>
            <div className="grid grid-cols-4 gap-4">
              {['low', 'normal', 'high', 'urgent'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: p })}
                  className={`px-4 py-3 rounded-xl border-2 transition-all capitalize ${
                    formData.priority === p
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {p === 'urgent' ? t('priorityUrgent') : p === 'high' ? t('priorityHigh') : p === 'normal' ? t('priorityNormal') : t('priorityLow')}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">{t('noteTitle')}</p>
                <p>{t('noteDesc', { priority: formData.priority === 'urgent' ? t('priorityUrgent') : '' })}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={sendMutation.isPending || !formData.title || !formData.message}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t('sending')}                </>
              ) : (
                <>
                  <Send size={20} />
                  {t('sendNotification')}                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
