'use client';

import { LoginForm } from '@/components/LoginForm';
import { useLocale, translate } from '@/lib/i18n';

type Props = {
  searchParams?: { redirectTo?: string };
};

export default function LoginPage({ searchParams }: Props) {
  const locale = useLocale();
  const redirectTo = searchParams?.redirectTo;
  return (
    <>
      <h1 className="pc-card__title">{translate(locale, 'login.title')}</h1>
      <p className="pc-card__subtitle">{translate(locale, 'login.subtitle')}</p>
      <LoginForm redirectTo={redirectTo} />
    </>
  );
}
