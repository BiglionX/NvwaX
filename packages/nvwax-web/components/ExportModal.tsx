'use client';

import { useState } from 'react';
import { Download, FileJson, FileType, CheckCircle, Loader2, X } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'agent' | 'aiteam';
  resourceName: string;
  resourceId: string;
  onExport: (format: 'json' | 'yaml' | 'proclaw') => Promise<void>;
}

export default function ExportModal({
  isOpen,
  onClose,
  resourceType,
  resourceName,
  onExport
}: Omit<ExportModalProps, 'resourceId'>) {
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'yaml' | 'proclaw'>('json');
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

  const formats = [
    {
      id: 'json',
      name: 'JSON',
      description: '通用格式，易于解�?,
      icon: FileJson,
      color: 'blue'
    },
    {
      id: 'yaml',
      name: 'YAML',
      description: '人类可读，适合配置',
      icon: FileType,
      color: 'blue'
    },
    {
      id: 'proclaw',
      name: 'ProClaw',
      description: 'ProClaw 专用格式',
      icon: Download,
      color: 'green'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full shadow-2xl border-2 border-gray-200 dark:border-gray-700">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Download className="text-blue-600" size={24} />
            导出{resourceType === 'agent' ? 'Agent' : 'AiTeam'}
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
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">资源名称</div>
            <div className="font-semibold text-gray-900 dark:text-white">{resourceName}</div>
          </div>

          {/* 格式选择 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              选择导出格式
            </label>
            <div className="space-y-3">
              {formats.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id as 'json' | 'yaml' | 'proclaw')}
                    className={`w-full p-4 border-2 rounded-xl transition-all text-left ${
                      isSelected
                        ? `border-${format.color}-500 bg-${format.color}-50 dark:bg-${format.color}-900/20`
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        isSelected 
                          ? `bg-${format.color}-100 dark:bg-${format.color}-900/40` 
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <Icon 
                          size={20} 
                          className={isSelected ? `text-${format.color}-600` : 'text-gray-600 dark:text-gray-400'} 
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

          {/* 提示信息 */}
          {selectedFormat === 'proclaw' && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="text-sm text-green-800 dark:text-green-300">
                <strong>提示�?/strong>ProClaw 格式包含运行时配置和集成指南，可直接导入 ProClaw 桌面端使用�?
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
          >
            取消
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
                导出�?..
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle size={18} />
                导出成功
              </>
            ) : (
              <>
                <Download size={18} />
                开始导�?
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
