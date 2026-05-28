'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Card, Input, Button, Alert, Space } from '@/components/UI';
import { useTranslations } from 'next-intl';
import SocialLoginButtons from '@/components/SocialLoginButtons';

export default function RegisterClient() {
  const t = useTranslations('register');
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register(
        formData.email,
        formData.password,
        formData.name || undefined
      );
      localStorage.setItem('user_token', response.data.token);
      localStorage.setItem('user_info', JSON.stringify(response.data.user));
      router.push('/profile');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || t('registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card padding="lg" shadow>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-blue-500 to-blue-700 rounded-2xl mb-4">
              <User className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('createAccount')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('subtitle')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Alert
              type="error"
              message={error}
              closable
              onClose={() => setError('')}
              className="mb-6"
            />
          )}

          {/* Register Form */}
          <form onSubmit={handleRegister}>
            <Space direction="vertical" size="middle" className="w-full">
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                label={t('emailLabel')}
                placeholder="your@email.com"
                prefix={<Mail size={20} />}
                required
              />

              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                label={t('nicknameLabel')}
                placeholder={t('nicknamePlaceholder')}
                prefix={<User size={20} />}
              />

              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                label={t('passwordLabel')}
                placeholder={t('passwordPlaceholder')}
                prefix={<Lock size={20} />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                }
                required
              />

              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                label={t('confirmPasswordLabel')}
                placeholder={t('confirmPasswordPlaceholder')}
                prefix={<Lock size={20} />}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                }
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                rightIcon={!loading ? <ArrowRight size={20} /> : undefined}
              >
                {loading ? t('registering') : t('registerBtn')}
              </Button>
            </Space>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {t('hasAccount')}{' '}
              <Link
                href="/login"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {t('loginNow')}
              </Link>
            </p>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {t('backHome')}
            </Link>
          </div>

          {/* 社交登录按钮 */}
          <SocialLoginButtons />
        </Card>
      </div>
    </div>
  );
}
