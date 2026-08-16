'use client';

import { X, CheckCircle, Send, Sparkles, Loader2, Share2, AlertCircle, Download } from 'lucide-react';

/**
 * 统一创建成功弹窗
 *
 * 供 AiTeam（及后续 Agent）创建流程共用：
 * - 团队信息预览
 * - 下一步操作：下载文档包 / 导入 ProClaw / 下载桌面端 / 分享
 */

export interface SuccessData {
  downloadUrl: string;
  documentPackage?: {
    packageInfo: {
      teamName: string;
      teamType: string;
      generatedAt: string;
      totalDocuments: number;
    };
  };
}

interface CreateSuccessDialogProps {
  open: boolean;
  successData: SuccessData | null;
  onClose: () => void;
  onDownload: (url: string) => void;
  onIntegrate: () => void;
  onShare: () => void;
}

export default function CreateSuccessDialog({
  open,
  successData,
  onClose,
  onDownload,
  onIntegrate,
  onShare,
}: CreateSuccessDialogProps) {
  if (!open || !successData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200/60 dark:border-gray-700/60">
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-gray-200/60 dark:border-gray-800 bg-linear-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/10 dark:to-emerald-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-500/25">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">🎉 创建成功！</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">选择您的下一步操作</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* 团队信息预览 */}
          {successData.documentPackage && (
            <div className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                {successData.documentPackage.packageInfo.teamName}
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>📊 团队类型：{successData.documentPackage.packageInfo.teamType}</p>
                <p>📄 文档数量：{successData.documentPackage.packageInfo.totalDocuments} 个</p>
                <p>⏰ 生成时间：{new Date(successData.documentPackage.packageInfo.generatedAt).toLocaleString('zh-CN')}</p>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              onClick={() => {
                onDownload(successData.downloadUrl);
                onClose();
              }}
              className="w-full px-6 py-3.5 bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-2.5 font-semibold text-base"
            >
              <Download className="w-5 h-5" />
              <span>下载文档包</span>
            </button>
            <button
              onClick={() => {
                onIntegrate();
                onClose();
              }}
              className="w-full px-6 py-3.5 bg-linear-to-r from-indigo-500 to-blue-700 hover:from-indigo-600 hover:to-blue-800 text-white rounded-xl shadow-md hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2.5 font-semibold text-base"
            >
              <Sparkles className="w-5 h-5" />
              <span>导入 AiTeam 到 ProClaw</span>
            </button>
            <a
              href="https://proclaw.cc"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-6 py-3.5 bg-linear-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl shadow-md hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200 flex items-center justify-center gap-2.5 font-semibold text-base"
            >
              <Loader2 className="w-5 h-5" />
              <span>下载 ProClaw 桌面端</span>
            </a>
            <button
              onClick={() => {
                onShare();
                onClose();
              }}
              className="w-full px-6 py-3.5 bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-200 dark:hover:shadow-orange-900/30 transition-all duration-200 flex items-center justify-center gap-2.5 font-semibold text-base"
            >
              <Share2 className="w-5 h-5" />
              <span>分享给朋友</span>
            </button>
          </div>

          {/* 提示 */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              💡 您可以稍后在我的 Agent 仓库中查看和管理这个 AiTeam。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
