'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Lock, Mail, Bell, Trash2, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { userInfo, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 安全设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-blue-600" size={20} />
            安全设置
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div className="flex items-center gap-3">
              <Lock className="text-gray-400" size={20} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">修改密码</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">定期修改密码可以提高账号安全性</p>
              </div>
            </div>
            <button className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors font-medium">
              修改
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div className="flex items-center gap-3">
              <Mail className="text-gray-400" size={20} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">邮箱验证</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{userInfo?.email || '未设置'}</p>
              </div>
            </div>
            <span className="px-3 py-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-medium">
              已验证
            </span>
          </div>
        </div>
      </div>

      {/* 通知设置 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="text-blue-600" size={20} />
            通知设置
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">邮件通知</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">接收项目更新和悬赏通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">系统通知</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">接收系统公告和功能更新</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 危险操作 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-red-200 dark:border-red-900/50">
        <div className="p-6 border-b border-red-200 dark:border-red-900/50">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle size={20} />
            危险操作
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">退出登录</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">退出当前账号</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
              退出
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">注销账号</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">永久删除账号和所有数据，此操作不可恢复</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-lg transition-colors font-medium"
            >
              注销账号
            </button>
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="text-red-600" size={28} />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">确认注销账号？</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              此操作将永久删除您的账号和所有数据，包括项目、悬赏记录等。此操作不可恢复。
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
              >
                取消
              </button>
              <button className="px-6 py-2.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium">
                确认注销
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
