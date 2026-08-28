'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Lock, Mail, Bell, Trash2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, Button, Badge, Space, Switch, Modal } from '@/components/UI';

const NOTIFY_EMAIL_KEY = 'nvwax_settings_notify_email';
const NOTIFY_SYSTEM_KEY = 'nvwax_settings_notify_system';

export default function SettingsPage() {
  const router = useRouter();
  const t = useTranslations('userCenter.settings');
  const { userInfo, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // 通知偏好：本地持久化，避免「假开关」
  const [emailNotify, setEmailNotify] = useState(true);
  const [systemNotify, setSystemNotify] = useState(true);
  const [notifyLoaded, setNotifyLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(NOTIFY_EMAIL_KEY);
      const savedSystem = localStorage.getItem(NOTIFY_SYSTEM_KEY);
      if (savedEmail !== null) setEmailNotify(savedEmail === '1');
      if (savedSystem !== null) setSystemNotify(savedSystem === '1');
    } catch {
      // localStorage 不可用时保持默认
    }
    setNotifyLoaded(true);
  }, []);

  const toggleEmail = (v: boolean) => {
    setEmailNotify(v);
    try {
      localStorage.setItem(NOTIFY_EMAIL_KEY, v ? '1' : '0');
    } catch { /* ignore */ }
  };

  const toggleSystem = (v: boolean) => {
    setSystemNotify(v);
    try {
      localStorage.setItem(NOTIFY_SYSTEM_KEY, v ? '1' : '0');
    } catch { /* ignore */ }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc';

  return (
    <Space direction="vertical" size="middle" className="w-full">
      {/* 安全设置 */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-blue-600" size={20} />
            {t('securityTitle')}
          </h2>
        </div>
        <div className="p-6">
          <Space direction="vertical" size="small" className="w-full">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="flex items-center gap-3">
                <Lock className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t('changePassword')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('changePasswordDesc')}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
                {t('change')}
              </Button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Mail className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t('emailVerification')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userInfo?.email || t('emailUnset')}</p>
                </div>
              </div>
              <Badge variant="success">{t('verified')}</Badge>
            </div>
          </Space>
        </div>
      </Card>

      {/* 通知设置 */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="text-blue-600" size={20} />
            {t('noticeTitle')}
          </h2>
        </div>
        <div className="p-6">
          <Space direction="vertical" size="small" className="w-full">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t('emailNotice')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('emailNoticeDesc')}</p>
              </div>
              <Switch checked={notifyLoaded ? emailNotify : true} onChange={toggleEmail} />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t('systemNotice')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('systemNoticeDesc')}</p>
              </div>
              <Switch checked={notifyLoaded ? systemNotify : true} onChange={toggleSystem} />
            </div>
          </Space>
        </div>
      </Card>

      {/* 危险操作 */}
      <Card className="border-red-200 dark:border-red-900/50">
        <div className="p-6 border-b border-red-200 dark:border-red-900/50">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle size={20} />
            {t('dangerTitle')}
          </h2>
        </div>
        <div className="p-6">
          <Space direction="vertical" size="small" className="w-full">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t('logoutTitle')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('logoutDesc')}</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                {t('logoutBtn')}
              </Button>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{t('deleteAccount')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('deleteAccountManaged')}</p>
              </div>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                {t('deleteAccountBtn')}
              </Button>
            </div>
          </Space>
        </div>
      </Card>

      {/* 修改密码引导弹窗 */}
      <Modal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={t('passwordModalTitle')}
        footer={
          <Space size="small" className="w-full justify-end">
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              {t('cancel')}
            </Button>
            <a href={`${issuer}/portal/`} target="_blank" rel="noreferrer noopener">
              <Button variant="primary" icon={<ExternalLink size={16} />}>
                {t('change')}
              </Button>
            </a>
          </Space>
        }
      >
        <div className="flex items-start gap-3">
          <Lock className="text-blue-600 shrink-0 mt-1" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('passwordModalDesc')}
          </p>
        </div>
      </Modal>

      {/* 注销账号确认弹窗（诚实引导，不再假装执行删除） */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('deleteConfirmTitle')}
        footer={
          <Space size="small" className="w-full justify-end">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {t('cancel')}
            </Button>
            <a href={`${issuer}/portal/`} target="_blank" rel="noreferrer noopener">
              <Button variant="danger" icon={<ExternalLink size={16} />}>
                {t('goAccountCenterHandle')}
              </Button>
            </a>
          </Space>
        }
      >
        <div className="flex items-start gap-3">
          <Trash2 className="text-red-600 shrink-0 mt-1" size={24} />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('deleteConfirmDesc')}
          </p>
        </div>
      </Modal>
    </Space>
  );
}