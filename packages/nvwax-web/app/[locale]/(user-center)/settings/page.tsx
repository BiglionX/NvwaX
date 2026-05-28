'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Lock, Mail, Bell, Trash2, AlertTriangle } from 'lucide-react';
import { Card, Button, Badge, Space, Switch, Modal } from '@/components/UI';

export default function SettingsPage() {
  const router = useRouter();
  const { userInfo, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <Space direction="vertical" size="middle" className="w-full">
      {/* 安全设置 */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-blue-600" size={20} />
            安全设置
          </h2>
        </div>
        <div className="p-6">
          <Space direction="vertical" size="small" className="w-full">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="flex items-center gap-3">
                <Lock className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">修改密码</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">定期修改密码可以提高账号安全性</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                修改
              </Button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Mail className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">邮箱验证</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userInfo?.email || '未设置'}</p>
                </div>
              </div>
              <Badge variant="success">已验证</Badge>
            </div>
          </Space>
        </div>
      </Card>

      {/* 通知设置 */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="text-blue-600" size={20} />
            通知设置
          </h2>
        </div>
        <div className="p-6">
          <Space direction="vertical" size="small" className="w-full">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">邮件通知</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">接收项目更新和悬赏通知</p>
              </div>
              <Switch checked={true} onChange={() => {}} />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">系统通知</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">接收系统公告和功能更新</p>
              </div>
              <Switch checked={true} onChange={() => {}} />
            </div>
          </Space>
        </div>
      </Card>

      {/* 危险操作 */}
      <Card className="border-red-200 dark:border-red-900/50">
        <div className="p-6 border-b border-red-200 dark:border-red-900/50">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle size={20} />
            危险操作
          </h2>
        </div>
        <div className="p-6">
          <Space direction="vertical" size="small" className="w-full">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">退出登录</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">退出当前账号</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                退出
              </Button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">注销账号</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">永久删除账号和所有数据，此操作不可恢复</p>
              </div>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                注销账号
              </Button>
            </div>
          </Space>
        </div>
      </Card>

      {/* 删除确认弹窗 */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="确认注销账号？"
        footer={
          <Space size="small" className="w-full justify-end">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={() => console.log('确认注销')}>
              确认注销
            </Button>
          </Space>
        }
      >
        <div className="flex items-start gap-3">
          <Trash2 className="text-red-600 shrink-0 mt-1" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            此操作将永久删除您的账号和所有数据，包括项目、悬赏记录等。此操作不可恢复。
          </p>
        </div>
      </Modal>
    </Space>
  );
}
