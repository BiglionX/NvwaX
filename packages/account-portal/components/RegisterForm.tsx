'use client';

import { useState, useTransition, FormEvent } from 'react';
import { portalApi, PortalApiError } from '@/lib/api-client';
import { useLocale, translate } from '@/lib/i18n';

const ERROR_KEYS: Record<string, string> = {
  email_taken: 'register.error.emailTaken',
  weak_password: 'register.error.weakPassword',
  invalid_email: 'register.error.invalidEmail',
};

export function RegisterForm() {
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await portalApi.register({ email, password, locale });
        setSuccess(true);
      } catch (err) {
        if (err instanceof PortalApiError) {
          setError(translate(locale, ERROR_KEYS[err.code] ?? 'register.error.invalidEmail'));
        } else {
          setError(translate(locale, 'login.error.network'));
        }
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error ? (
        <div className="pc-error" role="alert" data-testid="register-error">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="pc-success" role="status" data-testid="register-success">
          {translate(locale, 'register.success')}
        </div>
      ) : null}

      <div className="pc-field">
        <label className="pc-field__label" htmlFor="pc-register-email">
          {translate(locale, 'register.email')}
        </label>
        <input
          id="pc-register-email"
          className="pc-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          data-testid="register-email"
        />
      </div>

      <div className="pc-field">
        <label className="pc-field__label" htmlFor="pc-register-password">
          {translate(locale, 'register.password')}
        </label>
        <input
          id="pc-register-password"
          className="pc-input"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-testid="register-password"
        />
        <span className="pc-hint">{translate(locale, 'register.passwordHint')}</span>
      </div>

      <button
        type="submit"
        className="pc-button pc-button--primary"
        disabled={isPending || success}
        data-testid="register-submit"
      >
        {isPending ? (
          <>
            <span className="pc-spinner" aria-hidden="true" />
            <span style={{ marginLeft: 8 }}>{translate(locale, 'register.submitPending')}</span>
          </>
        ) : (
          translate(locale, 'register.submit')
        )}
      </button>

      <p style={{ marginTop: 18, fontSize: 13, color: 'var(--pc-color-text-muted)' }}>
        {translate(locale, 'register.haveAccount')}{' '}
        <a className="pc-link" href="/portal/login/">
          {translate(locale, 'register.signIn')}
        </a>
      </p>
    </form>
  );
}

export default RegisterForm;
