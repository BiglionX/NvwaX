'use client';

/**
 * Login 客户端组件（Sprint 2.4）
 *
 * 入口策略：
 *   - 主入口：点击"使用 ProClaw 账号登录" → OIDC 跳 account.proclaw.cc
 *   - 自动入口：URL 带 ?return= 且未登录 → useEffect 自动触发 startLogin(return)
 *   - 错误展示：?error=&desc= 显示 OIDC 错误码
 *   - 管理员入口：单一链接跳转 /admin/login（admin 鉴权走 OIDC is_admin）
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { startLogin } from '@/lib/oidc/login';
import { Card, Input, Alert } from '@/components/UI';
import { Mail } from 'lucide-react';

const OIDC_ERROR_I18N: Record<string, { zh: string; en: string }> = {
  invalid_request: { zh: '授权请求无效', en: 'Invalid authorization request' },
  invalid_client: { zh: '客户端未被识别', en: 'Unknown client' },
  invalid_grant: { zh: '授权码无效或已过期', en: 'Authorization code invalid or expired' },
  unauthorized_client: { zh: '客户端无权使用此授权方式', en: 'Client not authorized' },
  unsupported_grant_type: { zh: '不支持的授权方式', en: 'Unsupported grant type' },
  server_error: { zh: '服务器内部错误', en: 'Internal server error' },
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tc = useTranslations('common');
  const { isLoggedIn, loading, userInfo, login } = useAuth();

  const [oidcError, setOidcError] = useState<string>('');
  const [oidcErrorDesc, setOidcErrorDesc] = useState<string>('');
  const [autoTriggered, setAutoTriggered] = useState(false);

  const returnTo = searchParams.get('return') || searchParams.get('redirect') || '/dashboard';

  // 解析 OIDC 错误
  useEffect(() => {
    const err = searchParams.get('error');
    const desc = searchParams.get('desc');
    if (err) {
      setOidcError(err);
      setOidcErrorDesc(desc ?? '');
    }
  }, [searchParams]);

  // 已登录则跳走
  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.replace(returnTo);
    }
  }, [isLoggedIn, loading, returnTo, router]);

  // 自动触发：URL 带 return 且未登录 + 未自动触发过
  useEffect(() => {
    if (autoTriggered || loading || isLoggedIn) return;
    if (searchParams.get('auto') === '1' || searchParams.get('return')) {
      setAutoTriggered(true);
      login(returnTo).catch((err) => {
        console.error('[login] auto startLogin failed:', err);
      });
    }
  }, [autoTriggered, loading, isLoggedIn, searchParams, returnTo, login]);

  const handleOidcLogin = async () => {
    // 注意：不能 setLoginLoading(true) —— React 19 transition 会抢占同帧 navigation
    // 导致 window.location.href 被静默吞。startLogin 内部已 await deriveCodeChallenge
    // 然后同步赋值 window.location.href，浏览器这一帧就跳走。
    try {
      await startLogin(returnTo);
    } catch (err) {
      console.error('[oidc] handleOidcLogin error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setOidcErrorDesc(msg);
    }
  };

  const tOidcErr = (code: string): string => {
    const m = OIDC_ERROR_I18N[code];
    if (!m) return code;
    return tc('locale') === 'en' ? m.en : m.zh;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card padding="lg" shadow>
          {/* 顶部品牌 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-4">
              <Mail className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {tc('locale') === 'en' ? 'Sign in to NvwaX' : '登录 NvwaX'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {tc('locale') === 'en'
                ? 'Use your ProClaw account to access NvwaX.'
                : '使用 ProClaw 账户登录 NvwaX。'}
            </p>
          </div>

          {/* OIDC 错误展示 */}
          {oidcError && (
            <Alert
              type="error"
              message={`${tOidcErr(oidcError)}${oidcErrorDesc ? `（${oidcErrorDesc}）` : ''}`}
              closable
              onClose={() => {
                setOidcError('');
                setOidcErrorDesc('');
              }}
              className="mb-6"
            />
          )}

          {/* 已登录用户信息 */}
          {!loading && isLoggedIn && userInfo && (
            <Alert
              type="info"
              message={`${userInfo.name || userInfo.email}，${tc('locale') === 'en' ? 'already signed in, redirecting…' : '已登录，正在跳转…'}`}
              className="mb-6"
            />
          )}

          {/* OIDC 主入口 — 使用原生 <button> 避免 framer-motion + React 19 transition race
              不设 disabled 也不渲染 loading 状态：startLogin 内部 await deriveCodeChallenge 后
              同步调 window.location.assign，浏览器这一帧就跳走，setState 会被 React 调度吞掉。 */}
          <button
            type="button"
            onClick={handleOidcLogin}
            data-testid="proclaw-login-btn"
            className="w-full px-8 py-4 text-lg font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-300/50 dark:hover:shadow-blue-900/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <span>{tc('locale') === 'en' ? 'Continue with ProClaw' : '使用 ProClaw 账户登录'}</span>
          </button>

          {/* 注册引导 */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {tc('locale') === 'en' ? "Don't have a ProClaw account?" : '还没有 ProClaw 账户？'}{' '}
              <a
                href={`${process.env.NEXT_PUBLIC_OIDC_ISSUER || 'https://account.proclaw.cc'}/portal/register/`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {tc('locale') === 'en' ? 'Create one' : '前往注册'}
              </a>
            </p>
          </div>

          {/* Sprint 2.4: 管理员入口简化为单一链接，不再走折叠账号密码登录 */}
          <div className="mt-6 text-center">
            <Link
              href="/admin/login"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              {tc('locale') === 'en' ? 'Admin? Sign in here' : '管理员？前往登录'}
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {tc('back')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function LoginClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
