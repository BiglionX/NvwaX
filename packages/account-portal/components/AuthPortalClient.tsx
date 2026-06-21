'use client';

/**
 * Sprint 2.11 — Unified auth portal entry SPA.
 *
 * Renders the login / register / forgot-password tabs at /portal/.
 * URL is the source of truth for `mode`; we sync state with history.replaceState
 * to avoid polluting the back stack.
 *
 * Constraints honored:
 *  - output: 'export' (no useSearchParams, no SSR — use window.location.search in useEffect)
 *  - zero backend changes (redirectTo is preserved through tab switches)
 *  - OIDC compatibility: when backend 302s to /portal/login/?redirectTo=X, the
 *    /portal/login/ page redirects client-side here and we read redirectTo from URL.
 */

import { useCallback, useEffect, useState } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { SocialButtons } from '@/components/SocialButtons';
import { useLocale, translate } from '@/lib/i18n';

export type AuthMode = 'login' | 'register' | 'forgot';

export type AuthPortalClientProps = {
  /** Optional SSR-injected initial mode; otherwise read from window.location.search. */
  initialMode?: AuthMode;
  /** Optional SSR-injected initial redirectTo. */
  initialRedirectTo?: string;
  /** Optional SSR-injected initial email (rarely used — email is normally URL-driven). */
  initialEmail?: string;
};

const SUPPORT_EMAIL = 'account@proclaw.cc';
const EMAIL_TAKEN_DELAY_MS = 1200;

function readModeFromUrl(): AuthMode {
  if (typeof window === 'undefined') return 'login';
  const m = new URLSearchParams(window.location.search).get('mode');
  if (m === 'register' || m === 'forgot' || m === 'login') return m;
  return 'login';
}

export function AuthPortalClient(props: AuthPortalClientProps) {
  const locale = useLocale();
  const [mode, setMode] = useState<AuthMode>(props.initialMode ?? 'login');
  const [redirectTo, setRedirectTo] = useState<string | undefined>(props.initialRedirectTo);
  const [prefilledEmail, setPrefilledEmail] = useState<string | undefined>(props.initialEmail);
  /** Incremented on every tab switch to force LoginForm/RegisterForm to remount,
   *  which discards any stale internal state (success/error/pending). */
  const [formKey, setFormKey] = useState(0);
  /** Transient notice shown on the login tab after email_taken auto-switch. */
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  /** Transient notice shown on social success/error (from URL ?social_success=... or ?social_error=...) */
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  // Hydrate state from URL on first mount (covers static-export no-SSR case).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    if (!props.initialMode) {
      const m = p.get('mode');
      if (m === 'register' || m === 'forgot' || m === 'login') setMode(m);
    }
    if (!props.initialRedirectTo) {
      const r = p.get('redirectTo');
      if (r) setRedirectTo(r);
    }
    if (!props.initialEmail) {
      const e = p.get('email');
      if (e) setPrefilledEmail(e);
    }
    // social success / error 回跳提示
    const ss = p.get('social_success');
    const se = p.get('social_error');
    if (ss === 'github_new') {
      setSocialNotice(translate(locale, 'social.success.new'));
    } else if (ss === 'github_existing') {
      setSocialNotice(translate(locale, 'social.success.existing'));
    } else if (se === 'github_denied') {
      setSocialNotice(translate(locale, 'social.error.githubDenied'));
    } else if (se === 'github_failed') {
      const msg = p.get('message');
      setSocialNotice(msg ? decodeURIComponent(msg) : translate(locale, 'social.error.githubFailed'));
    }
    // 清理掉一次性 query 参数
    if (ss || se) {
      const url = new URL(window.location.href);
      url.searchParams.delete('social_success');
      url.searchParams.delete('social_error');
      url.searchParams.delete('message');
      window.history.replaceState(null, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Switch tab; optional email prefills the destination input. */
  const switchMode = useCallback((next: AuthMode, opts?: { email?: string }) => {
    setMode(next);
    if (opts && opts.email !== undefined) {
      setPrefilledEmail(opts.email);
    }
    setFormKey((k) => k + 1);
    setLoginNotice(null);

    // Sync URL (replaceState — don't pollute back history).
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', next);
      if (opts && opts.email) {
        url.searchParams.set('email', opts.email);
      } else {
        url.searchParams.delete('email');
      }
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  /** Called by RegisterForm when backend reports email_taken. We show the error for
   *  ~1.2s on the register tab, then auto-switch to login with the email prefilled. */
  const handleEmailTaken = useCallback(
    (email: string) => {
      window.setTimeout(() => {
        setLoginNotice(translate(locale, 'login.error.prefilledNotice'));
        switchMode('login', { email });
      }, EMAIL_TAKEN_DELAY_MS);
    },
    [switchMode, locale],
  );

  // Render helpers ------------------------------------------------------------

  const tabBar = (
    <div className="pc-tabs" role="tablist" aria-label="Authentication">
      {(['signin', 'register', 'forgot'] as const).map((key) => {
        const target: AuthMode = key === 'signin' ? 'login' : key;
        const active = mode === target;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            aria-current={active ? 'page' : undefined}
            className={active ? 'pc-tab pc-tab--active' : 'pc-tab'}
            onClick={() => switchMode(target)}
            data-testid={`portal-tab-${key}`}
          >
            {translate(locale, `portal.tab.${key}`)}
          </button>
        );
      })}
    </div>
  );

  const heading = (() => {
    if (mode === 'login') {
      return (
        <>
          <h1 className="pc-card__title">{translate(locale, 'login.title')}</h1>
          <p className="pc-card__subtitle">{translate(locale, 'login.subtitle')}</p>
        </>
      );
    }
    if (mode === 'register') {
      return (
        <>
          <h1 className="pc-card__title">{translate(locale, 'register.title')}</h1>
          <p className="pc-card__subtitle">{translate(locale, 'register.subtitle')}</p>
        </>
      );
    }
    return (
      <>
        <h1 className="pc-card__title">{translate(locale, 'forgot.title')}</h1>
        <p className="pc-card__subtitle">{translate(locale, 'forgot.subtitle')}</p>
      </>
    );
  })();

  const socialNoticeEl = socialNotice ? (
    <div className="pc-notice" role="status" data-testid="social-notice">
      {socialNotice}
    </div>
  ) : null;

  const socialButtons = (
    <SocialButtons
      redirectTo={redirectTo}
      onError={(msg) => setSocialNotice(msg)}
      onSuccess={(info) => {
        setSocialNotice(
          translate(locale, info.isNewUser ? 'social.success.new' : 'social.success.existing'),
        );
        window.location.assign(info.redirectTo);
      }}
    />
  );

  const panel = (() => {
    if (mode === 'login') {
      return (
        <>
          {socialNoticeEl}
          {socialButtons}
          <LoginForm
            key={`login-${formKey}`}
            redirectTo={redirectTo}
            defaultEmail={prefilledEmail}
            notice={loginNotice}
            onSwitchMode={(m) => switchMode(m)}
          />
        </>
      );
    }
    if (mode === 'register') {
      return (
        <>
          {socialNoticeEl}
          {socialButtons}
          <RegisterForm
            key={`register-${formKey}`}
            defaultEmail={prefilledEmail}
            onEmailTaken={handleEmailTaken}
            onSwitchMode={(m) => switchMode(m)}
          />
        </>
      );
    }
    // forgot
    return (
      <div className="pc-forgot-panel" data-testid="forgot-panel">
        {socialNoticeEl}
        <p className="pc-forgot-panel__body">
          {translate(locale, 'forgot.body', { email: SUPPORT_EMAIL })}
        </p>
        <p style={{ marginTop: 12 }}>
          <a className="pc-link" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
        <button
          type="button"
          className="pc-button pc-button--ghost"
          style={{ marginTop: 18 }}
          onClick={() => switchMode('login')}
          data-testid="forgot-back"
        >
          {translate(locale, 'forgot.back')}
        </button>
      </div>
    );
  })();

  return (
    <>
      {tabBar}
      {heading}
      {panel}
    </>
  );
}

export default AuthPortalClient;