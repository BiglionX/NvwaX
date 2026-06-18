'use client';

import { Suspense } from 'react';
import { ActivatePanelClient } from '@/components/ActivatePanelClient';
import { useSearchParams } from 'next/navigation';
import { useLocale, translate } from '@/lib/i18n';

function ActivatePageInner() {
  const locale = useLocale();
  const params = useSearchParams();
  const token = params.get('token');
  if (!token)
    return (
      <div className="pc-error" role="alert" data-testid="activate-missing-token">
        {translate(locale, 'activate.error.missingToken')}
      </div>
    );
  return <ActivatePanelClient token={token} />;
}

export default function ActivatePage() {
  const locale = useLocale();
  return (
    <Suspense fallback={<div>{translate(locale, 'common.loading')}</div>}>
      <ActivatePageInner />
    </Suspense>
  );
}
