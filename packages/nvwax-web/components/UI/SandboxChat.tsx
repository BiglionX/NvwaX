'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';

/**
 * 消息角色
 */
export type SandboxMessageRole = 'user' | 'assistant' | 'system';

/**
 * 单条对话消息
 */
export interface SandboxMessage {
  id: string;
  role: SandboxMessageRole;
  content: string;
  timestamp: string;
  /** 是否正在流式输出 */
  streaming?: boolean;
  /** 错误信息 */
  error?: string;
  /** Token 消耗 */
  tokens?: number;
  /** 执行耗时（毫秒） */
  durationMs?: number;
}

/**
 * 沙箱执行回调
 */
export type SandboxExecutor = (
  input: string,
  history: SandboxMessage[]
) => Promise<{
  content: string;
  tokens?: number;
  durationMs?: number;
}>;

export interface SandboxChatProps {
  /** 沙箱标题 */
  title?: string;
  /** 占位提示 */
  placeholder?: string;
  /** 自定义执行器（默认使用 mock echo） */
  executor?: SandboxExecutor;
  /** 初始消息 */
  initialMessages?: SandboxMessage[];
  /** 系统提示（用于显示在顶部） */
  systemHint?: string;
  /** 最大消息数（防止内存爆炸） */
  maxMessages?: number;
  /** 是否显示清空按钮 */
  showClearButton?: boolean;
  /** 是否显示重置按钮 */
  showResetButton?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 高度（Tailwind 类） */
  height?: string;
  /** 输入框占位符 */
  inputPlaceholder?: string;
  /** Agent 名称（用于显示） */
  agentName?: string;
}

/**
 * SandboxChat - 沙箱对话测试组件
 *
 * 用于 Agent 创建向导的 Step 3，测试 Agent 的实际效果。
 * 集成 v2.2.0 的 SandboxChatExecutor 服务（mock 实现可替换）。
 *
 * @example
 * ```tsx
 * <SandboxChat
 *   title="测试 Agent 效果"
 *   agentName="小红书内容策划师"
 *   systemHint="这是一个营销类 Agent 的测试沙箱"
 *   onExecute={async (input) => {
 *     const res = await fetch('/api/sandbox/execute', {
 *       method: 'POST',
 *       body: JSON.stringify({ input })
 *     });
 *     return await res.json();
 *   }}
 * />
 * ```
 */
export default function SandboxChat({
  title = '沙箱测试',
  placeholder = '输入测试消息...',
  executor,
  initialMessages = [],
  systemHint,
  maxMessages = 50,
  showClearButton = true,
  showResetButton = true,
  className = '',
  height = 'h-96',
  inputPlaceholder = '向 Agent 发送测试消息...',
  agentName = 'Agent',
}: SandboxChatProps) {
  const [messages, setMessages] = useState<SandboxMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * 默认 mock executor（回显模式）
   */
  const defaultExecutor: SandboxExecutor = async (input) => {
    // 模拟网络延迟
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

    return {
      content: `[${agentName} Mock 响应]\n\n收到输入：「${input}」\n\n这是一个测试响应。在生产环境中，这里会调用真实的 Agent 推理接口（Workflow API）。`,
      tokens: input.length * 2,
      durationMs: 600 + Math.random() * 800,
    };
  };

  /**
   * 发送消息
   */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: SandboxMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const assistantId = `msg_${Date.now()}_assistant`;
    const assistantMessage: SandboxMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage].slice(-maxMessages));
    setInput('');
    setLoading(true);

    try {
      const fn = executor || defaultExecutor;
      const result = await fn(text, [...messages, userMessage]);

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: result.content, streaming: false, tokens: result.tokens, durationMs: result.durationMs }
            : m
        )
      );
    } catch (error: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: '', streaming: false, error: error.message || '执行失败' }
            : m
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  /**
   * 按 Enter 发送，Shift+Enter 换行
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * 清空对话
   */
  const { confirm, ConfirmDialog } = useConfirm();

  const handleClear = () => {
    confirm({
      title: '清空对话',
      message: '确定清空所有对话吗？',
      variant: 'warning',
      confirmText: '清空',
      onConfirm: () => setMessages([]),
    });
  };

  /**
   * 重置到初始状态
   */
  const handleReset = () => {
    setMessages(initialMessages);
  };

  /**
   * 渲染单条消息
   */
  const renderMessage = (msg: SandboxMessage) => {
    const isUser = msg.role === 'user';
    const isError = !!msg.error;

    return (
      <div
        key={msg.id}
        className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        role="listitem"
      >
        {/* 头像 */}
        <div
          className={`
            shrink-0 w-8 h-8 rounded-full flex items-center justify-center
            ${isUser
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : isError
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
            }
          `}
        >
          {isUser ? <User size={16} /> : isError ? <AlertCircle size={16} /> : <Bot size={16} />}
        </div>

        {/* 消息体 */}
        <div
          className={`
            flex-1 max-w-[80%]
            ${isUser
              ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5'
              : isError
                ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl rounded-tl-sm px-4 py-2.5'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5'
            }
          `}
        >
          {/* 内容 */}
          {msg.streaming && !msg.content ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              <span>正在思考...</span>
            </div>
          ) : msg.error ? (
            <div className="text-sm">
              <div className="font-semibold mb-1">执行出错</div>
              <div className="opacity-80">{msg.error}</div>
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
          )}

          {/* 元数据 */}
          {!msg.streaming && (msg.tokens || msg.durationMs) && (
            <div className={`mt-1.5 text-xs ${isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
              {msg.tokens && <span>{msg.tokens} tokens</span>}
              {msg.tokens && msg.durationMs && <span> · </span>}
              {msg.durationMs && <span>{(msg.durationMs / 1000).toFixed(2)}s</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden ${className}`}
      role="region"
      aria-label="沙箱对话测试"
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            {title}
            {agentName && <span className="text-gray-500 dark:text-gray-400 ml-1">· {agentName}</span>}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {showResetButton && messages.length > 0 && (
            <button
              onClick={handleReset}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="重置对话"
              aria-label="重置对话"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {showClearButton && messages.length > 0 && (
            <button
              onClick={handleClear}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
              title="清空对话"
              aria-label="清空对话"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 系统提示 */}
      {systemHint && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300">
          ℹ️ {systemHint}
        </div>
      )}

      {/* 消息列表 */}
      <div className={`${height} overflow-y-auto p-4 space-y-4`} role="list">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-500">
            <Bot size={32} className="mb-2 opacity-50" />
            <p className="text-sm">暂无对话</p>
            <p className="text-xs mt-1">发送消息开始测试 {agentName}</p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入栏 */}
      <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          disabled={loading}
          rows={1}
          className="
            flex-1 resize-none
            px-3 py-2
            bg-white dark:bg-gray-900
            border border-gray-300 dark:border-gray-600
            rounded-lg
            text-sm
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            max-h-24
          "
          aria-label="输入测试消息"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="
            shrink-0 px-3 py-2
            bg-blue-600 hover:bg-blue-700
            text-white
            rounded-lg
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-1.5 text-sm font-medium
          "
          aria-label="发送消息"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          <span className="hidden sm:inline">发送</span>
        </button>
      </div>
      <ConfirmDialog />
    </div>
  );
}
