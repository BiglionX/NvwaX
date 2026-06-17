'use client';

import { Suspense } from 'react';
import { ActivatePanelClient } from '@/components/ActivatePanelClient';
import { useSearchParams } from 'next/navigation';

function ActivatePageInner() {
  const params = useSearchParams();
  const token = params.get('token');
  if (!token) return <div className="pc-error">Missing activation token.</div>;
  return <ActivatePanelClient token={token} />;
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <ActivatePageInner />
    </Suspense>
  );
}
