'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Loader2, Bot, User, Star, ExternalLink, Users } from 'lucide-react';
import type { Agent, SearchAiTeam } from '@/lib/api/search';
import { Button, Card, Badge, Tag } from '@/components/UI';
import { useTranslations } from 'next-intl';

/**
 * AI 搜索对话消息
 */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  results?: Agent[];
  /** AiTeam 搜索结果 */
  aiteamResults?: SearchAiTeam[];
  suggestions?: string[];
  canGenerate?: boolean;
}

/**
 * AI 搜索面板属性
 */
interface AiSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
  onAutoGenerate?: (query: string) => void;
}

/**
 * AI Search Agent 对话搜索面板
 * 侧滑式面板，支持多轮对话搜索 Agent
 */
export default function AiSearchPanel({ isOpen, onClose, initialMessage, onAutoGenerate }: AiSearchPanelProps) {
  const t = useTranslations('marketplace');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, messages, scrollToBottom]);

  // 打开时自动创建会话
  useEffect(() => {
    if (isOpen && !sessionId) {
      initSession();
    }
  }, [isOpen]);

  // 初始化会话
  const initSession = async () => {
    setIsCreatingSession(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/ai-search/sessions`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success && data.data?.sessionId) {
        setSessionId(data.data.sessionId);
        
        // 添加欢迎消息
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: t('welcomeMessage'),
            suggestions: [
              t('suggestion1'),
              t('suggestion2'),
              t('suggestion3')
            ]
          }
        ]);

        // 如果有初始消息，自动发送
        if (initialMessage) {
          setInputValue(initialMessage);
          setTimeout(() => sendMessage(initialMessage), 500);
        }
      }
    } catch (error) {
      console.error('Failed to create AI search session:', error);
      setMessages([
        {
          id: 'error',
          role: 'assistant',
          content: t('serviceUnavailable')
        }
      ]);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // 发送消息
  const sendMessage = async (content?: string) => {
    const messageText = content || inputValue;
    if (!messageText.trim() || !sessionId || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/ai-search/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: messageText.trim()
        })
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.data.reply || t('noResults'),
          results: data.data.results,
          aiteamResults: data.data.aiteamResults,
          suggestions: data.data.suggestions,
          canGenerate: data.data.canGenerate
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error?.message || t('apiError'));
      }
    } catch (error) {
      console.error('AI Search chat error:', error);
      setMessages(prev => [...prev, {
        id: `ai-error-${Date.now()}`,
        role: 'assistant',
        content: t('searchError')
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 键盘发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 点击建议
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    sendMessage(suggestion);
  };

  // 关闭面板
  const handleClose = () => {
    setMessages([]);
    setSessionId(null);
    setInputValue('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 面板 */}
      <div className="relative ml-auto w-full max-w-2xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in-right">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-blue-700 to-indigo-600 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles size={20} className="text-yellow-300" />
            </div>
            <div>
              <h2 className="font-semibold text-base">{t('welcomeTitle')}</h2>
              <p className="text-xs text-white/70">{t('welcomeSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {isCreatingSession && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {/* AI 头像 */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={16} className="text-white" />
                </div>
              )}

              {/* 消息气泡 */}
              <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                {/* 文本内容 */}
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {renderMessageContent(msg.content)}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {/* Agent 搜索结果卡片 */}
                {msg.results && msg.results.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      {t('searchResults', { count: msg.results.length })}
                    </p>
                    <div className="grid gap-2">
                      {msg.results.map((agent) => (
                        <Card key={agent.id} padding="sm" variant="clickable" className="hover:border-blue-400 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {agent.name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                                {agent.description || t('noDescription')}
                              </p>
                            </div>
                            <Badge variant={agent.source === 'github' ? 'default' : 'warning'} size="sm" className="shrink-0">
                              {agent.source}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            {agent.stars !== undefined && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Star size={12} className="text-yellow-500" fill="currentColor" />
                                <span>{agent.stars.toLocaleString()}</span>
                              </div>
                            )}
                            {agent.tags && agent.tags.length > 0 && (
                              <div className="flex gap-1 flex-1 overflow-hidden">
                                {agent.tags.slice(0, 3).map((tag, i) => (
                                  <Tag key={i} variant="primary" size="sm">{tag}</Tag>
                                ))}
                              </div>
                            )}
                          </div>
                          {agent.url && (
                            <a
                              href={agent.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-2"
                            >
                              <ExternalLink size={12} />
                              {t('viewDetails')}
                            </a>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* AiTeam 搜索结果卡片 */}
                {msg.aiteamResults && msg.aiteamResults.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      {t('virtualCompanyRecommend', { count: msg.aiteamResults.length })}
                    </p>
                    <div className="grid gap-2">
                      {msg.aiteamResults.map((aiteam) => (
                        <Card key={aiteam.id} padding="sm" variant="clickable" className="hover:border-purple-400 transition-colors border-l-4 border-l-purple-400">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Users size={14} className="text-purple-500 shrink-0" />
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {aiteam.name}
                                </h4>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                                {aiteam.description || t('noDescription')}
                              </p>
                            </div>
                            <Badge variant="info" size="sm" className="shrink-0">{t('virtualCompanyLabel')}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Users size={12} />
                              <span>{t('memberCount', { count: aiteam.members?.length || 0 })}</span>
                            </div>
                            {aiteam.rating > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Star size={12} className="text-yellow-500" fill="currentColor" />
                                <span>{aiteam.rating.toFixed(1)}</span>
                              </div>
                            )}
                            {aiteam.tags && aiteam.tags.length > 0 && (
                              <div className="flex gap-1 flex-1 overflow-hidden">
                                {aiteam.tags.slice(0, 3).map((tag, i) => (
                                  <Tag key={i} variant="primary" size="sm">{tag}</Tag>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 建议追问按钮 */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1.5 text-xs rounded-full border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        disabled={isLoading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* AI 生成按钮 */}
                {msg.canGenerate && onAutoGenerate && (
                  <div className="mt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Sparkles size={14} />}
                      onClick={() => {
                        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                        onAutoGenerate(lastUserMsg?.content || initialMessage || '');
                        handleClose();
                      }}
                    >
                      {t('autoGenerateBtn')}
                    </Button>
                    <p className="text-xs text-gray-400 mt-1">
                      {t('autoGenerateDesc')}
                    </p>
                  </div>
                )}
              </div>

              {/* 用户头像 */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 mt-1">
                  <User size={16} className="text-white" />
                </div>
              )}
            </div>
          ))}

          {/* 加载指示器 */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-blue-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('searching')}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 底部输入 */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('inputPlaceholder')}
              className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              disabled={isLoading || isCreatingSession}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputValue.trim() || isLoading || isCreatingSession}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white flex items-center justify-center transition-colors shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 动画样式 */}
      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * 渲染消息内容（支持 Markdown 风格的加粗）
 */
function renderMessageContent(content: string): React.ReactNode {
  // 简单的 Markdown 渲染：加粗、换行
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        // 处理换行
        return part.split('\n').map((line, j) => (
          <span key={`${i}-${j}`}>
            {j > 0 && <br />}
            {line}
          </span>
        ));
      })}
    </>
  );
}
