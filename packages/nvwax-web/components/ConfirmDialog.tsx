'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger'
}: ConfirmDialogProps) {
  const t = useTranslations('confirmDialog');
  const [isConfirming, setIsConfirming] = useState(false);

  const resolvedConfirmText = confirmText || t('confirm');
  const resolvedCancelText = cancelText || t('cancel');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const variantConfig = {
    danger: {
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      buttonColor: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const config = variantConfig[variant];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border-2 border-gray-200 dark:border-gray-700">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className={config.iconColor} size={24} />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          <div className={`p-4 ${config.bgColor} rounded-xl mb-6`}>
            <p className="text-gray-700 dark:text-gray-300">{message}</p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
          >
            {cancelText ? cancelText : resolvedCancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className={`flex-1 px-4 py-3 ${config.buttonColor} text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50`}
          >
            {isConfirming ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('processing')}
              </>
            ) : (
              resolvedConfirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
