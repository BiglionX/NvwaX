'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Bot, User, Star, ExternalLink, Search, Users } from 'lucide-react';
import type { Agent, SearchAiTeam } from '@/lib/api/search';
import { Card, Badge, Tag } from '@/components/UI';
import { useTranslations } from 'next-intl';

/**
 * 聊天消息
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
 * /search 页面内联 AI 对话搜索组件
 * 与 AiSearchPanel 共享相同的 AI 搜索 API 逻辑，但以内联方式渲染
 */
export default function SearchInlineChat() {
  const t = useTranslations('searchChat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 自动创建会话
  useEffect(() => {
    initSession();
  }, []);

  useEffect(() => {
    if (!isCreatingSession) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isCreatingSession]);

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
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: t('welcome'),
          suggestions: t.raw('welcomeSuggestions')
        }]);
      }
    } catch {
      setMessages([{
        id: 'error',
        role: 'assistant',
        content: t('serviceError')
      }]);
    } finally {
      setIsCreatingSession(false);
    }
  };

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
        body: JSON.stringify({ sessionId, message: messageText.trim() })
      });

      const data = await response.json();
      if (data.success && data.data) {
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.data.reply || t('noResults'),
          results: data.data.results,
          aiteamResults: data.data.aiteamResults,
          suggestions: data.data.suggestions,
          canGenerate: data.data.canGenerate
        }]);
      } else {
        throw new Error(data.error?.message || t('apiReturnError'));
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `ai-error-${Date.now()}`,
        role: 'assistant',
        content: t('apiError')
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full min-h-150">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isCreatingSession && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-white" />
              </div>
            )}

            <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-md'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {renderMessageContent(msg.content)}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>

              {/* 搜索结果卡片 */}
              {msg.results && msg.results.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Search size={12} />
                    {t('resultCount', { count: msg.results.length })}
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
                            {t('viewDetail')}
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
                    <Users size={12} />
                    {t('aiTeamCount', { count: msg.aiteamResults.length })}
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
                          <Badge variant="info" size="sm" className="shrink-0">{t('virtualCompanyBadge')}</Badge>
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

              {/* 建议追问 */}
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
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 mt-1">
                <User size={16} className="text-white" />
              </div>
            )}
          </div>
        ))}

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
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 bg-gray-50 dark:bg-gray-800/50 shrink-0">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
            disabled={isLoading || isCreatingSession}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!inputValue.trim() || isLoading || isCreatingSession}
            className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 渲染消息内容（简单 Markdown）
 */
function renderMessageContent(content: string): React.ReactNode {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
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
