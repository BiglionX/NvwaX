'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  teamId: string;
  teamDescription?: string;
  roles?: Array<{ role: string; specialty?: string }>;
  category?: string;
}

function generateShareText(
  teamName: string,
  teamDescription?: string,
  roles?: Array<{ role: string; specialty?: string }>,
  category?: string,
): string {
  const lines: string[] = [];

  const categoryLabel = category === 'virtual-company' ? 'AI虚拟公司' : 'AI团队技能';
  lines.push(`🔥 发现了一个超强的${categoryLabel}！`);
  lines.push('');
  lines.push(`【${teamName}】${teamDescription ? ` - ${teamDescription.slice(0, 100)}${teamDescription.length > 100 ? '…' : ''}` : ''}`);
  lines.push('');

  if (roles && roles.length > 0) {
    lines.push(`包含 ${roles.length} 个专业角色：`);
    roles.slice(0, 5).forEach((r) => {
      const emoji = getRoleEmoji(r.role);
      const desc = r.specialty ? ` - ${r.specialty}` : '';
      lines.push(`${emoji} ${r.role}${desc}`);
    });
    lines.push('');
  }

  lines.push('由 NvwaX AI 自动生成，一键拥有专业AI团队，提升协作效率！');
  lines.push('');
  lines.push(`👉 立即体验：https://nvwax.proclaw.cc/marketplace/team-skills/${teamName.replace(/\s+/g, '-').toLowerCase()}`);
  lines.push('');
  lines.push('#AI团队 #NvwaX #效率工具 #AI虚拟公司');

  return lines.join('\n');
}

function getRoleEmoji(role: string): string {
  const map: Record<string, string> = {
    '内容策划师': '🎯',
    '内容策划': '🎯',
    '文案创作者': '✍️',
    '文案写手': '✍️',
    '视觉设计师': '🎨',
    '设计师': '🎨',
    '数据分析师': '📊',
    '数据分析': '📊',
    '社群运营经理': '💬',
    '社区运营': '💬',
    '运营': '💬',
    '产品经理': '📋',
    '开发工程师': '💻',
    '前端开发': '🖥️',
    '后端开发': '⚙️',
    '测试工程师': '🧪',
    'DevOps': '🚀',
  };
  return map[role] || '👤';
}

export default function ShareModal({
  isOpen,
  onClose,
  teamName,
  teamId,
  teamDescription,
  roles,
  category,
}: ShareModalProps) {
  const pageUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/marketplace/team-skills/${teamId}`
    : '';
  const [shareText, setShareText] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 当弹窗打开时生成分享文案
  useEffect(() => {
    if (isOpen) {
      setShareText(generateShareText(teamName, teamDescription, roles, category));
      setCopied(false);
    }
  }, [isOpen, teamName, teamDescription, roles, category]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级方案：选中文本
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  // 确保弹窗打开时有内容
  const displayText = shareText || generateShareText(teamName, teamDescription, roles, category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full mx-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">分享团队</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">复制文案分享给好友或社群</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* 可编辑文本框 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              分享文案（可编辑）
            </label>
            <textarea
              ref={textareaRef}
              value={displayText}
              onChange={(e) => setShareText(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
              placeholder="生成分享文案中..."
            />
          </div>

          {/* 链接展示和复制 */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">🔗 链接：</span>
            <code className="flex-1 text-xs text-blue-600 dark:text-blue-400 truncate">{pageUrl}</code>
            <button
              onClick={handleCopyLink}
              className="shrink-0 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-md transition-colors"
            >
              复制链接
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
          >
            关闭
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            {copied ? (
              <>
                <Check size={18} />
                已复制
              </>
            ) : (
              <>
                <Copy size={18} />
                复制全部文案
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
