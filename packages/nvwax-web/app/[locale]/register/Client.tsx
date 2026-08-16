'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { UserPlus, MailCheck } from 'lucide-react';
import { Card } from '@/components/UI';

/**
 * 注册页（Sprint 2.12 — 统一注册入口）
 *
 * 账号体系已统一到 ProClaw 共享账号中心（account.proclaw.cc / 本地 dev 为
 * nvwax-server /portal/*）：所有项目的注册都指向 account-portal 的注册流程
 * （邮箱 + 强密码 + 激活邮件），不再在站内用旧 /api/auth/register 直建用户
 * （旧入口密码策略弱、无激活，会造成共享账号表里语义混乱的"幽灵账号"）。
 *
 * 本页职责：引导用户前往共享注册中心，并说明激活流程。
 */

const PORTAL_REGISTER_PATH = '/portal/register/';

export default function RegisterClient() {
  const t = useTranslations('register');
  const tc = useTranslations('common');
  const locale = tc('locale') === 'en' ? 'en' : 'zh';

  const portalRegisterUrl =
    `${process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc'}${PORTAL_REGISTER_PATH}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card padding="lg" shadow>
          {/* 顶部品牌 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-4">
              <UserPlus className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('createAccount')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('subtitle')}
            </p>
          </div>

          {/* 统一账号说明 */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <MailCheck className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={20} />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">
                  {locale === 'en' ? 'One ProClaw account, all products' : '一个 ProClaw 账号，通用全部产品'}
                </p>
                <p>
                  {locale === 'en'
                    ? 'Register once with the ProClaw account center — the same account signs you into NvwaX, SkillHub and other ProClaw products. After registering, please activate your account via the email we send you.'
                    : '在 ProClaw 共享账号中心注册一次，即可登录 NvwaX、SkillHub 等全部 ProClaw 产品。注册后请查收邮件完成激活。'}
                </p>
              </div>
            </div>
          </div>

          {/* 前往共享注册中心 */}
          <a
            href={portalRegisterUrl}
            target="_blank"
            rel="noreferrer noopener"
            data-testid="portal-register-link"
            className="w-full px-8 py-4 text-lg font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-300/50 dark:hover:shadow-blue-900/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <UserPlus size={20} />
            <span>{locale === 'en' ? 'Create ProClaw account' : '前往 ProClaw 注册'}</span>
          </a>

          {/* 登录链接 */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {t('hasAccount')}{' '}
              <Link
                href="/login"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {t('loginNow')}
              </Link>
            </p>
          </div>

          {/* 返回首页 */}
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {t('backHome')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
