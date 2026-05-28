'use client';

import { useState } from 'react';
import { X, Send, Sparkles, Users, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AiTeamCreateModalProps {
  onClose: () => void;
  onSuccess: (teamSkillId: string) => void;
}

interface CreateRequest {
  description: string;
  dataSources?: string[];
  outputs?: string[];
  implementation?: string;
  skills?: string[];
  isPublic?: boolean;
}

export default function AiTeamCreateModal({ onClose, onSuccess }: AiTeamCreateModalProps) {
  const t = useTranslations('vcCreate');
  const [step, setStep] = useState<'input' | 'generating' | 'success'>('input');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    teamSkillId: string;
    teamName: string;
  } | null>(null);

  const examples = [
    t('example1'),
    t('example2'),
    t('example3'),
  ];

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError(t('inputError'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStep('generating');

    try {
      const requestData: CreateRequest = {
        description: description.trim(),
        dataSources: [],
        outputs: [],
        implementation: '',
        skills: [],
        isPublic: true
      };

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/nvwa/create-aiteam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('createError'));
      }

      setResult({
        teamSkillId: data.data.teamSkillId,
        teamName: data.data.teamName
      });
      setStep('success');
    } catch (err) {
      console.error('Error creating AiTeam:', err);
      setError(err instanceof Error ? err.message : t('createError'));
      setStep('input');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewResult = () => {
    if (result) {
      onSuccess(result.teamSkillId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-r from-blue-600 to-blue-700 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('title')}</h2>
              <p className="text-sm text-gray-500">{t('subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <div className="space-y-6">
              {/* Description Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('descriptionLabel')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-30"
                  disabled={isSubmitting}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>

              {/* Examples */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('examplesTitle')}
                </label>
                <div className="space-y-2">
                  {examples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setDescription(example)}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-700"
                      disabled={isSubmitting}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">{t('tipTitle')}</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>{t('tip1')}</li>
                  <li>{t('tip2')}</li>
                  <li>{t('tip3')}</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('generatingTitle')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('generatingDesc')}
                </p>
              </div>
            </div>
          )}

          {step === 'success' && result && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="p-4 bg-green-100 rounded-full">
                <Sparkles className="w-12 h-12 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t('successTitle')}
                </h3>
                <p className="text-gray-600 mb-4">
                  <span className="font-semibold">{result.teamName}</span> {t('successDesc')}
                </p>
                <p className="text-sm text-gray-500">
                  {t('successHint')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          {step === 'input' && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                disabled={isSubmitting}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!description.trim() || isSubmitting}
                className="flex-1 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {t('createButton')}
              </button>
            </div>
          )}

          {step === 'generating' && (
            <button
              disabled
              className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
            >
              {t('generatingButton')}
            </button>
          )}

          {step === 'success' && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {t('close')}
              </button>
              <button
                onClick={handleViewResult}
                className="flex-1 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                {t('viewDetail')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
