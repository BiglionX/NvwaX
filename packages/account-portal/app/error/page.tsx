'use client';

import { useSearchParams } from 'next/navigation';
import { useLocale, translate } from '@/lib/i18n';

export default function ErrorPage() {
  const locale = useLocale();
  const params = useSearchParams();
  const reason = params.get('reason') ?? 'unknown';
  return (
    <>
      <h1 className="pc-card__title">{translate(locale, 'error.title')}</h1>
      <div className="pc-error" role="alert" data-testid="error-reason">
        {reason}
      </div>
      <p className="pc-card__subtitle">{translate(locale, 'error.contact')}</p>
      <a className="pc-button pc-button--ghost" href="/portal/login/" style={{ marginTop: 12 }}>
        {translate(locale, 'error.back')}
      </a>
    </>
  );
}
