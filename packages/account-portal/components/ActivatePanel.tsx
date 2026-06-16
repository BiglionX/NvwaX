'use client';

import { useEffect, useState } from 'react';
import { portalApi, PortalApiError } from '@/lib/api-client';
import { useLocale, translate } from '@/lib/i18n';

type Props = { token: string };

export function ActivatePanel({ token }: Props) {
  const locale = useLocale();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await portalApi.activate(token);
        if (cancelled) return;
        setStatus('success');
        setMessage(translate(locale, 'activate.success'));
        // Backend should have set pc_session; navigate to login portal home
        // (or to the originally-requested RP after redirect).
        const target = res.redirectTo || '/portal/';
        // Use a short delay so the success message is visible
        setTimeout(() => {
          if (!cancelled) window.location.assign(target);
        }, 1200);
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        if (err instanceof PortalApiError) {
          if (err.code === 'already_activated') {
            setMessage(translate(locale, 'activate.error.alreadyUsed'));
          } else {
            setMessage(translate(locale, 'activate.error.invalidToken'));
          }
        } else {
          setMessage(translate(locale, 'login.error.network'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  if (status === 'pending') {
    return (
      <div data-testid="activate-pending">
        <span className="pc-spinner" aria-hidden="true" /> {translate(locale, 'activate.title')}…
      </div>
    );
  }
  if (status === 'success') {
    return (
      <div className="pc-success" role="status" data-testid="activate-success">
        {message}
      </div>
    );
  }
  return (
    <div>
      <div className="pc-error" role="alert" data-testid="activate-error">
        {message}
      </div>
      <a className="pc-button pc-button--ghost" href="/portal/login/">
        {translate(locale, 'activate.retry')}
      </a>
    </div>
  );
}

export default ActivatePanel;
