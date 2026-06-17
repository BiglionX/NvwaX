'use client';

import { useState, useTransition, FormEvent } from 'react';
import { portalApi, PortalApiError } from '@/lib/api-client';
import { useLocale, translate } from '@/lib/i18n';

type Props = {
  /** Optional next URL — preserved in hidden input to forward to the API. */
  redirectTo?: string;
};

const ERROR_KEYS: Record<string, string> = {
  invalid_credentials: 'login.error.invalid',
  rate_limited: 'login.error.rateLimited',
  portal_unavailable: 'login.error.network',
};

export function LoginForm({ redirectTo }: Props) {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    // Sprint 2.10: useTransition 不接受 async callback（React 18 严格类型），
    // 用 .then/.catch 链式写法替代
    startTransition(() => {
      portalApi
        .login({ email, password, redirectTo })
        .then((res) => {
          window.location.assign(res.redirectTo || redirectTo || '/portal/');
        })
        .catch((err) => {
          if (err instanceof PortalApiError) {
            setError(translate(locale, ERROR_KEYS[err.code] ?? 'login.error.invalid'));
          } else {
            setError(translate(locale, 'login.error.network'));
          }
        });
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error ? (
        <div className="pc-error" role="alert" data-testid="login-error">
          {error}
        </div>
      ) : null}

      <div className="pc-field">
        <label className="pc-field__label" htmlFor="pc-login-email">
          {translate(locale, 'login.email')}
        </label>
        <input
          id="pc-login-email"
          className="pc-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          data-testid="login-email"
        />
      </div>

      <div className="pc-field">
        <label className="pc-field__label" htmlFor="pc-login-password">
          {translate(locale, 'login.password')}
        </label>
        <input
          id="pc-login-password"
          className="pc-input"
          type="password"
          autoComplete="current-password"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="login-password"
        />
      </div>

      <input type="hidden" name="redirectTo" value={redirectTo ?? ''} />

      <button
        type="submit"
        className="pc-button pc-button--primary"
        disabled={isPending}
        data-testid="login-submit"
      >
        {isPending ? (
          <>
            <span className="pc-spinner" aria-hidden="true" />
            <span style={{ marginLeft: 8 }}>
              {translate(locale, 'login.submitPending')}
            </span>
          </>
        ) : (
          translate(locale, 'login.submit')
        )}
      </button>

      <p style={{ marginTop: 18, fontSize: 13, color: 'var(--pc-color-text-muted)' }}>
        {translate(locale, 'login.noAccount')}{' '}
        <a className="pc-link" href="/portal/register/">
          {translate(locale, 'login.register')}
        </a>
      </p>
    </form>
  );
}

export default LoginForm;
