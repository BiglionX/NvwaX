'use client';

/**
 * Login 客户端组件（Sprint 2.2）
 *
 * 入口策略：
 *   - 主入口：点击"使用 ProClaw 账号登录" → OIDC 跳 account.proclaw.cc
 *   - 自动入口：URL 带 ?return= 且未登录 → useEffect 自动触发 startLogin(return)
 *   - 错误展示：?error=&desc= 显示 OIDC 错误码
 *   - 管理员入口：折叠区域保留账号密码登录（admin 鉴权独立，不在 Sprint 2.2 范围）
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { startLogin } from '@/lib/oidc/login';
import { adminApi } from '@/lib/api/admin';
import { Card, Input, Alert } from '@/components/UI';
import { Mail, Lock, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPwd, setShowAdminPwd] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

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

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);
    try {
      const response = await adminApi.login(adminEmail, adminPassword);
      localStorage.setItem('admin_token', response.data.token);
      localStorage.setItem('admin_info', JSON.stringify(response.data.admin));
      window.location.replace('/admin/dashboard');
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setAdminError(error.response?.data?.error || error.message || '管理员登录失败');
    } finally {
      setAdminLoading(false);
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

          {/* 管理员登录折叠入口（独立鉴权，不在 Sprint 2.2 OIDC 范围） */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={() => setAdminOpen(!adminOpen)}
              className="w-full flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <span>
                {tc('locale') === 'en' ? 'Admin sign-in (legacy)' : '管理员登录（保留入口）'}
              </span>
              {adminOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {adminOpen && (
              <form onSubmit={handleAdminLogin} className="mt-4">
                <div className="flex flex-col gap-2 w-full">
                  {adminError && (
                    <Alert type="error" message={adminError} closable onClose={() => setAdminError('')} />
                  )}
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder={tc('locale') === 'en' ? 'Admin email' : '管理员邮箱'}
                    prefix={<Mail size={16} />}
                    required
                  />
                  <Input
                    type={showAdminPwd ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    prefix={<Lock size={16} />}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowAdminPwd(!showAdminPwd)}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="toggle"
                      >
                        {showAdminPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                    required
                  />
                  <button
                    type="submit"
                    disabled={adminLoading}
                    className="w-full px-6 py-3 text-base font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-white shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30 hover:shadow-xl bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {adminLoading ? (
                      <span>{tc('locale') === 'en' ? 'Signing in…' : '登录中…'}</span>
                    ) : (
                      <span>{tc('locale') === 'en' ? 'Admin sign-in' : '管理员登录'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}
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
