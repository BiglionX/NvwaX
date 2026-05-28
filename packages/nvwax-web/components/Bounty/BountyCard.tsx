'use client';

import Link from 'next/link';
import { Clock, Award, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Bounty } from '@/lib/api/bounty';
import HighlightText from './HighlightText';
import { useTranslations, useLocale } from 'next-intl';

interface BountyCardProps {
  bounty: Bounty;
  searchQuery?: string;
}

export default function BountyCard({ bounty, searchQuery = '' }: BountyCardProps) {
  const t = useTranslations('bountyCard');
  const locale = useLocale();
  const statusConfig = {
    open: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, label: t('statusOpen') },
    claimed: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle, label: t('statusClaimed') },
    submitted: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock, label: t('statusSubmitted') },
    verified: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle, label: t('statusVerified') },
    completed: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400', icon: CheckCircle, label: t('statusCompleted') },
    cancelled: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, label: t('statusCancelled') },
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const status = statusConfig[bounty.status];
  const StatusIcon = status.icon;

  return (
    <Link href={`/bounties/${bounty.id}`} className="block">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all group">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
            <HighlightText text={bounty.title} query={searchQuery} />
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
            <StatusIcon size={12} />
            {status.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          <HighlightText text={bounty.description} query={searchQuery} />
        </p>

        {/* Skills */}
        {bounty.requiredSkills && bounty.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {bounty.requiredSkills.slice(0, 3).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs"
              >
                {skill}
              </span>
            ))}
            {bounty.requiredSkills.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                +{bounty.requiredSkills.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <Award size={16} />
              <span className="font-semibold">{bounty.rewardAmount}</span>
              <span className="text-xs">{bounty.currency === 'points' ? t('points') : bounty.currency}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
              <Clock size={14} />
              {formatDate(bounty.createdAt)}
            </div>
          </div>
          
          {bounty.deadline && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('deadline', { date: formatDate(bounty.deadline) })}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
