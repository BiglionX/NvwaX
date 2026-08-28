'use client';

import { useState } from 'react';
import { Download, FileJson, FileType, CheckCircle, Loader2, X, Bot, Workflow } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type ExportFormatType = 'json' | 'yaml' | 'proclaw' | 'crewai' | 'langgraph';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'agent' | 'aiteam';
  resourceName: string;
  resourceId: string;
  onExport: (format: ExportFormatType) => Promise<void>;
}

/**
 * Tailwind JIT 不会识别动态拼接的 `border-${color}-500` 字符串，
 * 故用静态映射确保 5 种 color 对应的 class 全部出现在源文件里。
 */
const COLOR_CLASS: Record<string, {
  border: string;
  bg50: string;
  bg100: string;
  text: string;
  tipBg: string;
  tipBorder: string;
  tipText: string;
}> = {
  blue: {
    border: 'border-blue-500',
    bg50: 'bg-blue-50',
    bg100: 'bg-blue-100',
    text: 'text-blue-600',
    tipBg: 'bg-blue-50 dark:bg-blue-900/20',
    tipBorder: 'border-blue-200 dark:border-blue-800',
    tipText: 'text-blue-800 dark:text-blue-300'
  },
  green: {
    border: 'border-green-500',
    bg50: 'bg-green-50',
    bg100: 'bg-green-100',
    text: 'text-green-600',
    tipBg: 'bg-green-50 dark:bg-green-900/20',
    tipBorder: 'border-green-200 dark:border-green-800',
    tipText: 'text-green-800 dark:text-green-300'
  },
  purple: {
    border: 'border-purple-500',
    bg50: 'bg-purple-50',
    bg100: 'bg-purple-100',
    text: 'text-purple-600',
    tipBg: 'bg-purple-50 dark:bg-purple-900/20',
    tipBorder: 'border-purple-200 dark:border-purple-800',
    tipText: 'text-purple-800 dark:text-purple-300'
  },
  orange: {
    border: 'border-orange-500',
    bg50: 'bg-orange-50',
    bg100: 'bg-orange-100',
    text: 'text-orange-600',
    tipBg: 'bg-orange-50 dark:bg-orange-900/20',
    tipBorder: 'border-orange-200 dark:border-orange-800',
    tipText: 'text-orange-800 dark:text-orange-300'
  }
};

export default function ExportModal({
  isOpen,
  onClose,
  resourceType,
  resourceName,
  onExport
}: Omit<ExportModalProps, 'resourceId'>) {
  const t = useTranslations('exportModal');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormatType>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(selectedFormat);
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // 5 种导出格式（Sprint 多壳落地改造）
  const formats: Array<{
    id: ExportFormatType;
    name: string;
    description: string;
    icon: any;
    color: keyof typeof COLOR_CLASS;
    tipKey: string;
  }> = [
    {
      id: 'json',
      name: 'JSON',
      description: t('descJson'),
      icon: FileJson,
      color: 'blue',
      tipKey: 'tipJson'
    },
    {
      id: 'yaml',
      name: 'YAML',
      description: t('descYaml'),
      icon: FileType,
      color: 'blue',
      tipKey: 'tipYaml'
    },
    {
      id: 'proclaw',
      name: 'ProClaw',
      description: t('descProclaw'),
      icon: Download,
      color: 'green',
      tipKey: 'tipProclaw'
    },
    {
      id: 'crewai',
      name: 'CrewAI',
      description: t('descCrewai'),
      icon: Bot,
      color: 'purple',
      tipKey: 'tipCrewai'
    },
    {
      id: 'langgraph',
      name: 'LangGraph',
      description: t('descLanggraph'),
      icon: Workflow,
      color: 'orange',
      tipKey: 'tipLanggraph'
    }
  ];

  const selectedFmt = formats.find((f) => f.id === selectedFormat)!;
  const c = COLOR_CLASS[selectedFmt.color];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl border-2 border-gray-200 dark:border-gray-700">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Download className="text-blue-600" size={24} />
            {t('title', { type: resourceType === 'agent' ? 'Agent' : 'AiTeam' })}
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
          {/* 资源信息 */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('resourceName')}</div>
            <div className="font-semibold text-gray-900 dark:text-white">{resourceName}</div>
          </div>

          {/* 格式选择 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('selectFormat')}
            </label>
            <div className="space-y-3">
              {formats.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;
                const cc = COLOR_CLASS[format.color];
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`w-full p-4 border-2 rounded-xl transition-all text-left ${
                      isSelected
                        ? `${cc.border} ${cc.bg50} dark:bg-${format.color}-900/20`
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        isSelected
                          ? `${cc.bg100} dark:bg-${format.color}-900/40`
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Icon
                          size={20}
                          className={isSelected ? cc.text : 'text-gray-600 dark:text-gray-400'}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white mb-1">
                          {format.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {format.description}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="text-green-600" size={20} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 提示信息（按所选格式） */}
          <div className={`mb-6 p-4 border rounded-xl ${c.tipBg} ${c.tipBorder}`}>
            <div className={`text-sm ${c.tipText}`}>
              {t(selectedFmt.tipKey)}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || exportSuccess}
            className={`flex-1 px-4 py-3 rounded-xl transition-all shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-2 ${
              exportSuccess
                ? 'bg-green-600 text-white'
                : 'bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
            } disabled:opacity-50`}
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('exporting')}
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle size={18} />
                {t('exportSuccess')}
              </>
            ) : (
              <>
                <Download size={18} />
                {t('startExport')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}