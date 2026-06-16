'use client';

import { RegisterForm } from '@/components/RegisterForm';
import { useLocale, translate } from '@/lib/i18n';

export default function RegisterPage() {
  const locale = useLocale();
  return (
    <>
      <h1 className="pc-card__title">{translate(locale, 'register.title')}</h1>
      <p className="pc-card__subtitle">{translate(locale, 'register.subtitle')}</p>
      <RegisterForm />
    </>
  );
}
