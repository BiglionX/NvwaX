'use client';

import { useState } from 'react';
import {
  X,
  CheckCircle,
  Sparkles,
  Loader2,
  Share2,
  AlertCircle,
  Download,
  Building2,
  Bot,
  Workflow,
  Server,
  ChevronRight,
  FileJson,
  FileType
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ExportFormatType } from '@/components/ExportModal';

/**
 * 统一创建成功弹窗
 *
 * 供 AiTeam（及后续 Agent）创建流程共用：
 * - 团队信息预览
 * - 下一步操作：下载文档包 / 选择落地方式 / 下载桌面端 / 分享
 *
 * Sprint 多壳落地改造：
 *   原"导入 AiTeam 到 ProClaw"按钮升级为"选择落地方式"——弹窗式二级菜单
 *   支持 ProClaw 桌面端 / CrewAI / LangGraph / 通用 JSON / 通用 YAML 5 种
 */

export interface SuccessData {
  downloadUrl: string;
  /** 团队 id，用于后续导出调用 */
  aiteamId?: string;
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
  /**
   * 已废弃：保留字段以兼容旧调用方。点击"选择落地方式"按钮不再直接调此函数，
   * 而是弹出内嵌 LandingShellSelector 让用户选择具体格式。
   * 留空函数体以维持 props 接口稳定。
   */
  onIntegrate: () => void;
  /**
   * 新增：当用户在 LandingShellSelector 选定某格式后触发。
   * 父组件负责调 API 下载对应格式文件。
   */
  onExportToShell?: (format: ExportFormatType) => void;
  onShare: () => void;
  /**
   * 新增：点击"前往我的 AI 公司"跳转到公司详情。
   * 父组件负责构造带 ?aiteam=<id> 的目标地址；未提供时不渲染该按钮。
   */
  onViewCompany?: () => void;
}

/**
 * 落地壳选择子弹窗
 */
function LandingShellSelector({
  open,
  onClose,
  onSelect
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (format: ExportFormatType) => void;
}) {
  if (!open) return null;

  const shells: Array<{
    format: ExportFormatType;
    title: string;
    description: string;
    command: string;
    icon: LucideIcon;
    color: string;
  }> = [
    {
      format: 'proclaw',
      title: 'ProClaw 桌面应用',
      description: '本地优先的 AI 经营 OS，导入即用、离线可跑。',
      command: '导入 .proclaw-team.json → ProClaw AI团队',
      icon: Server,
      color: 'green'
    },
    {
      format: 'crewai',
      title: 'CrewAI',
      description: '开源 Python 多 Agent 框架，开箱即用。',
      command: 'pip install crewai && crewai run team.yaml',
      icon: Bot,
      color: 'purple'
    },
    {
      format: 'langgraph',
      title: 'LangGraph',
      description: 'LangChain 官方图状态机框架。',
      command: 'pip install langgraph  # 自行写 driver',
      icon: Workflow,
      color: 'orange'
    },
    {
      format: 'json',
      title: '通用 JSON',
      description: '原始团队配置，开发者自取。',
      command: '下载 .json 文件',
      icon: FileJson,
      color: 'blue'
    },
    {
      format: 'yaml',
      title: '通用 YAML',
      description: '人类可读，适合 Git 版本管理。',
      command: '下载 .yaml 文件',
      icon: FileType,
      color: 'blue'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-70 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200/60 dark:border-gray-700/60">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">选择落地方式</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              把这个 AiTeam 部署到你自己的运行时
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-2 max-h-[60vh] overflow-y-auto">
          {shells.map((s) => {
            const Icon = s.icon;
            const c = SHELL_COLOR_MAP[s.color] || SHELL_COLOR_MAP.blue;
            return (
              <button
                key={s.format}
                onClick={() => onSelect(s.format)}
                className={`w-full flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-700 ${c.border} ${c.borderDark} rounded-xl transition-all text-left group`}
              >
                <div
                  className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${c.bg} ${c.bgDark}`}
                >
                  <Icon className={`w-6 h-6 ${c.text} ${c.textDark}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">
                    {s.title}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {s.description}
                  </div>
                  <code className="text-xs font-mono px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                    {s.command}
                  </code>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 提示：下载的配置文件可以直接在任何兼容的运行时里消费，无需 NvwaX 在线。
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 落地壳卡片配色映射（Tailwind JIT 不能识别动态拼接 bg-${color}-50 字符串）
 */
const SHELL_COLOR_MAP: Record<string, {
  bg: string;
  bgDark: string;
  text: string;
  textDark: string;
  border: string;
  borderDark: string;
}> = {
  green: {
    bg: 'bg-green-50',
    bgDark: 'dark:bg-green-900/20',
    text: 'text-green-600',
    textDark: 'dark:text-green-400',
    border: 'hover:border-green-500',
    borderDark: 'dark:hover:border-green-500'
  },
  purple: {
    bg: 'bg-purple-50',
    bgDark: 'dark:bg-purple-900/20',
    text: 'text-purple-600',
    textDark: 'dark:text-purple-400',
    border: 'hover:border-purple-500',
    borderDark: 'dark:hover:border-purple-500'
  },
  orange: {
    bg: 'bg-orange-50',
    bgDark: 'dark:bg-orange-900/20',
    text: 'text-orange-600',
    textDark: 'dark:text-orange-400',
    border: 'hover:border-orange-500',
    borderDark: 'dark:hover:border-orange-500'
  },
  blue: {
    bg: 'bg-blue-50',
    bgDark: 'dark:bg-blue-900/20',
    text: 'text-blue-600',
    textDark: 'dark:text-blue-400',
    border: 'hover:border-blue-500',
    borderDark: 'dark:hover:border-blue-500'
  }
};

export default function CreateSuccessDialog({
  open,
  successData,
  onClose,
  onDownload,
  onExportToShell,
  onShare,
  onViewCompany
}: CreateSuccessDialogProps) {
  const [showShellSelector, setShowShellSelector] = useState(false);

  if (!open || !successData) return null;

  return (
    <>
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
                  <p>
                    ⏰ 生成时间：
                    {new Date(successData.documentPackage.packageInfo.generatedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="space-y-3">
              {onViewCompany && successData.aiteamId && (
                <button
                  onClick={() => {
                    onViewCompany();
                    onClose();
                  }}
                  className="w-full px-6 py-3.5 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-md hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2.5 font-semibold text-base"
                >
                  <Building2 className="w-5 h-5" />
                  <span>前往「我的 AI 公司」</span>
                </button>
              )}

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

              {/* Sprint 多壳落地改造：原"导入 ProClaw"按钮升级为"选择落地方式"入口 */}
              <button
                onClick={() => setShowShellSelector(true)}
                className="w-full px-6 py-3.5 bg-linear-to-r from-indigo-500 to-blue-700 hover:from-indigo-600 hover:to-blue-800 text-white rounded-xl shadow-md hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2.5 font-semibold text-base"
              >
                <Sparkles className="w-5 h-5" />
                <span>选择落地方式（ProClaw / CrewAI / LangGraph）</span>
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
                ✅ AI 公司已保存到「我的 AI 公司」，可随时查看、管理或导出到任意支持的运行时。
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

      {/* 子弹窗：落地壳选择器 */}
      <LandingShellSelector
        open={showShellSelector}
        onClose={() => setShowShellSelector(false)}
        onSelect={(format) => {
          setShowShellSelector(false);
          onClose();
          // 优先使用新 onExportToShell；父组件未实现时退回旧 onIntegrate 行为
          if (onExportToShell) {
            onExportToShell(format);
          } else if (format !== 'proclaw') {
            // 非 ProClaw 但父组件未实现 onExportToShell —— 静默提示
            console.warn(
              '[CreateSuccessDialog] Parent did not provide onExportToShell. ' +
                `Selected format=${format} cannot be downloaded automatically. ` +
                'Please implement onExportToShell handler.'
            );
          }
        }}
      />
    </>
  );
}