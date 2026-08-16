'use client';

import { Bot } from 'lucide-react';

/**
 * 统一聊天消息气泡组件
 *
 * 供 Agent（对话式向导）与 AiTeam（会话式向导）共用，
 * 消息渲染逻辑取 Agent 版更完整的 markdown 渲染器。
 */

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant' | 'nvwax_agent' | 'ceo_agent';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessageData;
  /** 用户显示名（用于头像首字母） */
  userName?: string;
  /** 附加内容区（如推荐角色卡片、确认按钮等，渲染在气泡下方） */
  extra?: React.ReactNode;
}

/** Markdown 行渲染（粗体 / 列表 / 编号 / 链接） */
export function renderMarkdownLine(line: string, isUser: boolean, keyPrefix: string) {
  // 粗体标题
  if (line.match(/^\*\*.*\*\*$/)) {
    return (
      <strong key={keyPrefix} className={`block font-bold mb-1 ${isUser ? '' : 'text-gray-900 dark:text-white'}`}>
        {line.slice(2, -2)}
      </strong>
    );
  }
  // 粗体 + 内容
  if (line.includes('**')) {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <div key={keyPrefix} className="leading-relaxed">
        {parts.map((part, pi) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={pi} className="font-semibold">{part.slice(2, -2)}</strong>
          ) : (
            <span key={pi}>{part}</span>
          )
        )}
      </div>
    );
  }
  // 列表项
  if (line.match(/^[-•]\s/)) {
    return (
      <div key={keyPrefix} className="ml-2 flex gap-1.5">
        <span className="shrink-0">•</span>
        <span>{line.slice(2)}</span>
      </div>
    );
  }
  // 编号列表
  if (line.match(/^\d+[.)]\s/)) {
    return <div key={keyPrefix} className="ml-2">{line}</div>;
  }
  // 链接渲染
  if (line.includes('[/') && line.includes('](')) {
    const linkMatch = line.match(/\[(.+?)\]\((.+?)\)/g);
    if (linkMatch) {
      let lastIndex = 0;
      const elements: React.ReactNode[] = [];
      linkMatch.forEach((match, mi) => {
        const startIdx = line.indexOf(match, lastIndex);
        if (startIdx > lastIndex) {
          elements.push(<span key={`t-${mi}`}>{line.slice(lastIndex, startIdx)}</span>);
        }
        const m = match.match(/\[(.+?)\]\((.+?)\)/);
        if (m) {
          elements.push(
            <a key={`a-${mi}`} href={m[2]} className="text-blue-500 hover:text-blue-600 dark:text-blue-400 underline underline-offset-2">
              {m[1]}
            </a>
          );
        }
        lastIndex = startIdx + match.length;
      });
      if (lastIndex < line.length) {
        elements.push(<span key="tail">{line.slice(lastIndex)}</span>);
      }
      return <div key={keyPrefix} className="leading-relaxed">{elements}</div>;
    }
  }
  // 空行
  if (line.trim() === '') return <div key={keyPrefix} className="h-1.5" />;
  return <div key={keyPrefix} className="leading-relaxed">{line}</div>;
}

/** 完整消息内容渲染（逐行 markdown） */
export function renderChatContent(content: string, isUser: boolean) {
  return content.split('\n').map((line, idx) => renderMarkdownLine(line, isUser, `${isUser ? 'u' : 'a'}-${idx}`));
}

export default function ChatMessage({ message, userName, extra }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'} transition-all duration-300 ease-out`}>
      {/* AI 头像 */}
      {!isUser && (
        <div className="relative shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-linear-to-br from-blue-500 via-indigo-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Bot size={18} className="text-white" />
          </div>
        </div>
      )}

      {/* 消息气泡 */}
      <div
        className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 sm:px-5 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-linear-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20 rounded-br-lg'
            : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700/50 rounded-bl-lg'
        }`}
      >
        <div className="text-[14px] sm:text-sm">
          {renderChatContent(message.content, isUser)}
        </div>

        {/* 附加内容区（推荐角色 / 确认按钮 / 文档包预览等） */}
        {extra}

        <div className={`text-[10px] mt-2 ${isUser ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
          {message.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* 用户头像 */}
      {isUser && (
        <div className="shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-linear-to-br from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">
              {userName?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
