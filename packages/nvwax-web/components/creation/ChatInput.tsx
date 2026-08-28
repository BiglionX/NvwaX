'use client';

import { useRef, useState, useEffect } from 'react';
import { Send, RotateCcw, CornerDownLeft, Lightbulb } from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';

/**
 * 统一聊天输入区组件
 *
 * 供 Agent（对话式向导）与 AiTeam（会话式向导）共用：
 * - 自动高度 textarea
 * - 快捷建议词组（可选）
 * - 发送按钮 + 键盘提示 + 重启按钮（可选）
 */

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onRestart?: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** 快捷建议（点击后填入输入框） */
  suggestions?: string[];
  onSuggestionClick?: (s: string) => void;
  /** 是否显示键盘提示 */
  showKeyboardHint?: boolean;
  sendLabel?: string;
  restartLabel?: string;
  restartConfirm?: string;
  restartChatLabel?: string;
  /** 底部键盘提示文案（Enter 发送 / Shift+Enter 换行） */
  enterHint?: string;
  shiftEnterHint?: string;
  /** 是否显示底部提示栏 */
  showFooterHint?: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onRestart,
  placeholder = '输入消息...',
  disabled = false,
  suggestions = [],
  onSuggestionClick,
  showKeyboardHint = true,
  sendLabel = '发送',
  restartLabel = '重新开始',
  restartConfirm = '确定要重新开始吗？',
  restartChatLabel = '重新开始',
  enterHint = '发送',
  shiftEnterHint = '换行',
  showFooterHint = true,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const { confirm, ConfirmDialog } = useConfirm();

  // textarea 自动调整高度
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleRestart = () => {
    if (!onRestart) return;
    confirm({
      title: restartChatLabel,
      message: restartConfirm,
      variant: 'warning',
      confirmText: restartLabel,
      onConfirm: () => onRestart(),
    });
  };

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        {/* 快捷建议 */}
        {suggestions.length > 0 && showSuggestions && (
          <div className="flex flex-wrap gap-2 mb-3 opacity-0 animate-[fadeIn_0.4s_ease-out_0.2s_forwards]">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm active:scale-95"
              >
                <Lightbulb size={12} className="shrink-0 text-amber-400" />
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* 输入框 */}
        <div className="flex gap-2 sm:gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-label={placeholder}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-0 focus:border-blue-400 dark:focus:border-blue-600 outline-none resize-none text-sm leading-relaxed transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:shadow-lg focus:shadow-blue-500/10 disabled:opacity-60"
              rows={1}
              disabled={disabled}
              style={{ minHeight: '44px' }}
            />
            {/* 键盘提示 */}
            {showKeyboardHint && (
              <div className="absolute right-3 bottom-3 hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  <CornerDownLeft size={10} className="inline" />
                </kbd>
                <span className="text-[10px] text-gray-400">{sendLabel}</span>
              </div>
            )}
          </div>

          <button
            onClick={onSend}
            disabled={!value.trim() || disabled}
            aria-label={sendLabel}
            className="shrink-0 p-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
            style={{ width: '44px', height: '44px' }}
          >
            <Send size={18} />
          </button>
        </div>

        {/* 底部提示 */}
        {showFooterHint && (
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            <span className="hidden sm:inline">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">Enter</kbd>
              <span className="mx-1 text-gray-400 dark:text-gray-500">{enterHint} ·</span>
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">Shift + Enter</kbd>
              <span className="ml-1">{shiftEnterHint}</span>
            </span>
          </p>
          {onRestart && (
            <button
              onClick={handleRestart}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              aria-label={restartChatLabel}
            >
              <RotateCcw size={11} />
              <span className="hidden sm:inline">{restartLabel}</span>
            </button>
          )}
        </div>
        )}
      </div>
      <ConfirmDialog />
    </div>
  );
}
