'use client';

import { ActivatePanel } from '@/components/ActivatePanel';
import { useLocale, translate } from '@/lib/i18n';

type Props = { params: { token: string } };

export default function ActivatePage({ params }: Props) {
  const locale = useLocale();
  return (
    <>
      <h1 className="pc-card__title">{translate(locale, 'activate.title')}</h1>
      <p className="pc-card__subtitle">…</p>
      <ActivatePanel token={params.token} />
    </>
  );
}
