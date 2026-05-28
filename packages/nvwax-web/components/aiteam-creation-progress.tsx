'use client';

import { CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { ProgressStep, SessionStatus } from '@/hooks/use-aiteam-creation-progress';
import { useTranslations, useLocale } from 'next-intl';

interface AiTeamCreationProgressProps {
  progress: {
    currentStep: number;
    totalSteps: number;
    percentage: number;
    steps: ProgressStep[];
  } | null;
  status: SessionStatus | null;
  isConnected: boolean;
}

export default function AiTeamCreationProgress({ 
  progress, 
  status,
  isConnected 
}: AiTeamCreationProgressProps) {
  const t = useTranslations('vcProgress');
  const locale = useLocale();
  if (!progress) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-600">{t('loading')}</span>
      </div>
    );
  }

  const getStatusIcon = (stepStatus: ProgressStep['status']) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (stepStatus: ProgressStep['status']) => {
    switch (stepStatus) {
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-900';
      case 'in_progress':
        return 'bg-blue-100 border-blue-300 text-blue-900';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const getStatusText = (stepStatus: SessionStatus) => {
    const statusMap: Record<SessionStatus, string> = {
      initiated: t('statusInitiated'),
      requirements_gathering: t('statusRequirements'),
      role_selection: t('statusRoleSelection'),
      agent_searching: t('statusAgentSearch'),
      skill_matching: t('statusSkillMatch'),
      confirming: t('statusConfirming'),
      building: t('statusBuilding'),
      completed: t('statusCompleted'),
      failed: t('statusFailed'),
      cancelled: t('statusCancelled')
    };
    return statusMap[stepStatus] || stepStatus;
  };

  return (
    <div className="space-y-4">
      {/* 连接状态 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-600">{t('connected')}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-600">{t('disconnected')}</span>
            </>
          )}
        </div>
        <div className="text-sm text-gray-600">
          {status && getStatusText(status)}
        </div>
      </div>

      {/* 进度条 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{t('overallProgress')}</span>
          <span className="text-sm font-semibold text-blue-600">{progress.percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-linear-to-r from-blue-600 to-blue-700 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* 步骤列表 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">{t('progressTitle')}</h3>
        <div className="space-y-2">
          {progress.steps.map((step) => (
            <div
              key={step.stepNumber}
              className={`flex items-start gap-3 p-3 rounded-lg border ${getStatusColor(step.status)}`}
            >
              <div className="shrink-0 mt-0.5">
                {getStatusIcon(step.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">
                    {step.stepNumber}. {step.name}
                  </p>
                  {step.message && (
                    <span className="text-xs opacity-75 ml-2">{step.message}</span>
                  )}
                </div>
                {step.startedAt && step.status === 'in_progress' && (
                  <p className="text-xs mt-1 opacity-75">
                    {t('startedAt')}{new Date(step.startedAt).toLocaleTimeString(locale)}
                  </p>
                )}
                {step.completedAt && step.status === 'completed' && (
                  <p className="text-xs mt-1 opacity-75">
                    {t('completedAt')}{new Date(step.completedAt).toLocaleTimeString(locale)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {progress.steps.filter(s => s.status === 'completed').length}
          </div>
          <div className="text-xs text-green-700 mt-1">{t('completedCount')}</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {progress.steps.filter(s => s.status === 'in_progress').length}
          </div>
          <div className="text-xs text-blue-700 mt-1">{t('inProgress')}</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">
            {progress.steps.filter(s => s.status === 'pending').length}
          </div>
          <div className="text-xs text-gray-700 mt-1">{t('pendingLabel')}</div>
        </div>
      </div>
    </div>
  );
}
