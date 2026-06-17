'use client';

import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { useLocale, translate } from '@/lib/i18n';

export default function LoginPage() {
  const locale = useLocale();
  const [redirectTo, setRedirectTo] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Sprint 2.10: 从 URL 读 redirectTo 避免 searchParams 触发 dynamic 渲染
    const params = new URLSearchParams(window.location.search);
    setRedirectTo(params.get('redirectTo') ?? undefined);
  }, []);

  return (
    <>
      <h1 className="pc-card__title">{translate(locale, 'login.title')}</h1>
      <p className="pc-card__subtitle">{translate(locale, 'login.subtitle')}</p>
      <LoginForm redirectTo={redirectTo} />
    </>
  );
}
