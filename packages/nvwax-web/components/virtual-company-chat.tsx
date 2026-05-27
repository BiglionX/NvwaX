'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, Loader } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ceo_agent';
  content: string;
  timestamp: Date;
}

interface VirtualCompanyChatProps {
  sessionId: string;
  onComplete?: (data: Record<string, unknown>) => void;
}

export default function VirtualCompanyChat({ sessionId, onComplete }: VirtualCompanyChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 加载会话历史
  useEffect(() => {
    loadSessionHistory();
  }, [sessionId]);

  const loadSessionHistory = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/virtual-company/sessions/${sessionId}`, {
        headers,
      });
      const data = await response.json();
      
      if (data.success) {
        const history = data.data.conversationHistory || [];
        setMessages(history.map((msg: { role: 'user' | 'ceo_agent'; content: string; timestamp: string }) => ({
          id: Math.random().toString(36).substr(2, 9),
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Failed to load session history:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // 添加用户消息到列表
    const newUserMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/virtual-company/sessions/${sessionId}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: userMessage })
      });

      const data = await response.json();

      if (data.success) {
        // 添加 CEO Agent 回复
        const ceoMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          role: 'ceo_agent',
          content: data.data.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, ceoMessage]);

        // 保存提取的数据
        if (data.data.extractedRequirements) {
          setExtractedData(data.data.extractedRequirements);
        }

        // 如果完成，调用回调
        if (data.data.status === 'completed' && onComplete) {
          onComplete(data.data);
        }
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'ceo_agent',
        content: '抱歉，我遇到了问题，请稍后再试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-150 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            <Bot className="w-16 h-16 mx-auto mb-4 text-blue-500 opacity-80" />
            <p className="text-lg font-medium">NvwaX Aiteam架构师 正在等待您的消息</p>
            <p className="text-sm mt-2">描述您想要创建的团队类型或业务目标</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'ceo_agent' && (
                <div className="w-8 h-8 bg-linear-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* 加载指示器 */}
        {isLoading && (
          <div className="flex justify-start gap-3">
            <div className="w-8 h-8 bg-linear-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex space-x-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 提取的数据展示 */}
      {extractedData && (
        <div className="border-t bg-white dark:bg-gray-800 p-4 transition-all">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Sparkles size={14} className="text-yellow-500" />
            已提取的需求：
          </h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
            {Object.entries(extractedData).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="font-medium capitalize text-gray-500">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                <span>{Array.isArray(value) ? value.join(', ') : String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <div className="border-t bg-white dark:bg-gray-800 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="描述您想要创建的团队..."
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-shadow"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-md hover:shadow-lg"
          >
            {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <span className="hidden sm:inline">按 Enter 发送，</span> Shift + Enter 换行
        </div>
      </div>
    </div>
  );
}
