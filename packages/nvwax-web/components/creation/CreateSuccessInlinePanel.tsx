'use client';

/**
 * CreateSuccessInlinePanel — 创建成功内嵌面板
 * ----------------------------------------------------------------
 * 从 CreateSuccessDialog 抽出，去掉 fixed inset-0 全屏遮罩和 z-60 弹窗容器，
 * 保留所有按钮、配色、交互（包括 5 种落地壳选择的二级菜单）。
 *
 * 用法（Nvwa 工作台 v2.3+）：
 *   <CreateSuccessInlinePanel
 *     successData={successData}
 *     onClose={() => setSuccessData(null)}
 *     onDownload={handleDownload}
 *     onIntegrate={handleIntegrate}
 *     onExportToShell={handleExportToShell}
 *     onShare={handleShare}
 *   />
 *
 * 必须在父容器限定宽高（容器内 flex 布局）；面板本身只占容器空间。
 */

import { useState } from 'react';
import {
  X,
  CheckCircle,
  Download,
  Sparkles,
  Share2,
  AlertCircle,
  Bot,
  Workflow,
  Server,
  ChevronRight,
  FileJson,
  FileType,
  type LucideIcon,
} from 'lucide-react';
import type { ExportFormatType } from '@/components/ExportModal';
import type { SuccessData } from '@/components/creation/CreateSuccessDialog';

interface CreateSuccessInlinePanelProps {
  successData: SuccessData | null;
  onClose: () => void;
  onDownload: (url: string) => void;
  onIntegrate: () => void;
  onExportToShell?: (format: ExportFormatType) => void;
  onShare: () => void;
}

/** 落地壳卡片配色映射（与 CreateSuccessDialog 保持完全一致） */
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
    borderDark: 'dark:hover:border-green-500',
  },
  purple: {
    bg: 'bg-purple-50',
    bgDark: 'dark:bg-purple-900/20',
    text: 'text-purple-600',
    textDark: 'dark:text-purple-400',
    border: 'hover:border-purple-500',
    borderDark: 'dark:hover:border-purple-500',
  },
  orange: {
    bg: 'bg-orange-50',
    bgDark: 'dark:bg-orange-900/20',
    text: 'text-orange-600',
    textDark: 'dark:text-orange-400',
    border: 'hover:border-orange-500',
    borderDark: 'dark:hover:border-orange-500',
  },
  blue: {
    bg: 'bg-blue-50',
    bgDark: 'dark:bg-blue-900/20',
    text: 'text-blue-600',
    textDark: 'dark:text-blue-400',
    border: 'hover:border-blue-500',
    borderDark: 'dark:hover:border-blue-500',
  },
};

/** 落地壳选择器（内嵌版） */
function InlineShellSelector({
  open,
  onClose,
  onSelect,
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
      color: 'green',
    },
    {
      format: 'crewai',
      title: 'CrewAI',
      description: '开源 Python 多 Agent 框架，开箱即用。',
      command: 'pip install crewai && crewai run team.yaml',
      icon: Bot,
      color: 'purple',
    },
    {
      format: 'langgraph',
      title: 'LangGraph',
      description: 'LangChain 官方图状态机框架。',
      command: 'pip install langgraph  # 自行写 driver',
      icon: Workflow,
      color: 'orange',
    },
    {
      format: 'json',
      title: '通用 JSON',
      description: '原始团队配置，开发者自取。',
      command: '下载 .json 文件',
      icon: FileJson,
      color: 'blue',
    },
    {
      format: 'yaml',
      title: '通用 YAML',
      description: '人类可读，适合 Git 版本管理。',
      command: '下载 .yaml 文件',
      icon: FileType,
      color: 'blue',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-70 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200/60 dark:border-gray-700/60">
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
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${c.bg} ${c.bgDark}`}>
                  <Icon className={`w-6 h-6 ${c.text} ${c.textDark}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">{s.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{s.description}</div>
                  <code className="text-xs font-mono px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                    {s.command}
                  </code>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 提示：下载的配置文件可以直接在任何兼容的运行时里消费，无需 NvwaX 在线。
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CreateSuccessInlinePanel({
  successData,
  onClose,
  onDownload,
  onIntegrate,
  onExportToShell,
  onShare,
}: CreateSuccessInlinePanelProps) {
  const [showShellSelector, setShowShellSelector] = useState(false);

  if (!successData) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">尚未创建</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              完成 7 步创建流程后，结果将显示在这里。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* 顶部成功头 */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-gray-200/60 dark:border-gray-800 bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/10 dark:to-emerald-900/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-500/25 shrink-0">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">🎉 创建成功！</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">选择您的下一步操作</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors shrink-0"
          aria-label="关闭结果面板"
        >
          <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 团队信息预览 */}
        {successData.documentPackage && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5 truncate">
              {successData.documentPackage.packageInfo.teamName}
            </h3>
            <div className="space-y-1 text-[11px] text-gray-600 dark:text-gray-400">
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
        <div className="space-y-2">
          <button
            onClick={() => {
              onDownload(successData.downloadUrl);
              onClose();
            }}
            className="w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下载文档包</span>
          </button>

          <button
            onClick={() => {
              setShowShellSelector(true);
              try {
                onIntegrate();
              } catch {
                /* 父组件可能未实现 onIntegrate */
              }
            }}
            className="w-full px-3 py-2 bg-gradient-to-r from-indigo-500 to-blue-700 hover:from-indigo-600 hover:to-blue-800 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>选择落地方式</span>
          </button>

          <a
            href="https://proclaw.cc"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Server className="w-3.5 h-3.5" />
            <span>下载 ProClaw 桌面端</span>
          </a>

          <button
            onClick={() => {
              onShare();
              onClose();
            }}
            className="w-full px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>分享给朋友</span>
          </button>
        </div>

        {/* 提示 */}
        <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-blue-700 leading-relaxed">
            ✅ AI 公司已保存到「我的 AI 公司」，可随时查看、管理或导出到任意支持的运行时。
          </p>
        </div>
      </div>

      {/* 子弹窗：落地壳选择器（仍然 fixed，但只在用户点击时出现） */}
      <InlineShellSelector
        open={showShellSelector}
        onClose={() => setShowShellSelector(false)}
        onSelect={(format) => {
          setShowShellSelector(false);
          if (onExportToShell) {
            onExportToShell(format);
          } else if (format !== 'proclaw') {
            console.warn(
              '[CreateSuccessInlinePanel] Parent did not provide onExportToShell.'
            );
          }
        }}
      />
    </div>
  );
}
