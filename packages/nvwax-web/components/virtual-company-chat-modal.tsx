'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Building2, Loader2, Bot, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useVirtualCompanyProgress } from '@/hooks/use-virtual-company-progress';
import VirtualCompanyProgress from './virtual-company-progress';

interface VirtualCompanyChatModalProps {
  onClose: () => void;
  onSuccess: (teamSkillId: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'ceo_agent';
  content: string;
  timestamp: Date;
  phase?: string;
  extractedRequirements?: Record<string, unknown>;
  recommendedRoles?: Array<{
    roleName: string;
    description: string;
    responsibilities?: string[];
    requiredSkills?: string[];
  }>;
  needsClarification?: boolean;
  clarificationQuestions?: string[];
}

export default function VirtualCompanyChatModal({ onClose }: VirtualCompanyChatModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 使用 SSE Hook 追踪进度
  const { progress, status, isConnected } = useVirtualCompanyProgress(sessionId, {
    autoReconnect: true,
    maxRetries: 3,
    retryDelay: 2000
  });

  // 初始化会话
  useEffect(() => {
    createSession();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createSession = async () => {
    try {
      // 检查用户是否登录
      const token = localStorage.getItem('user_token');
      const userInfo = localStorage.getItem('user_info');
      
      if (!token || !userInfo) {
        addSystemMessage('请先登录以创建虚拟公司会话。');
        console.warn('User not logged in');
        return;
      }
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
      
      const response = await fetch(`${API_URL}/virtual-company/sessions`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '创建会话失败');
      }

      setSessionId(data.data.id);
      // session 数据现在通过 SSE hook 自动更新

      // 添加 CEO Agent 的欢迎消息
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'ceo_agent',
        content: `您好！👋 我是您的 AI 团队架构师。

我将帮助您创建一个专属的 AI 团队来协助您的工作。

**请告诉我：您想创建什么样的团队？**

例如：
- 📝 营销内容创作团队（文案、设计、社交媒体）
- 💬 客户服务团队（客服、技术支持、用户反馈）
- 📊 数据分析团队（数据处理、可视化、报告生成）
- 💻 软件开发团队（前端、后端、测试）
- 🎨 创意设计团队（UI/UX、平面设计、视频制作）
- 或其他任何您需要的团队类型

请简单描述一下您的需求，我会为您提供专业的建议！`,
        timestamp: new Date(),
        phase: 'requirements_gathering'
      };

      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error creating session:', error);
      addSystemMessage('创建会话失败，请刷新页面重试');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isSending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/virtual-company/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: userMessage.content }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '发送消息失败');
      }

      // 添加 CEO Agent 回复
      const ceoMessage: Message = {
        id: `ceo-${Date.now()}`,
        role: 'ceo_agent',
        content: data.data.message,
        timestamp: new Date(),
        phase: data.data.phase,
        extractedRequirements: data.data.extractedRequirements,
        recommendedRoles: data.data.recommendedRoles,
        needsClarification: data.data.needsClarification,
        clarificationQuestions: data.data.clarificationQuestions
      };

      setMessages(prev => [...prev, ceoMessage]);

      // 更新会话状态
      fetchSessionStatus();
    } catch (error) {
      console.error('Error sending message:', error);
      addSystemMessage('发送消息失败，请重试');
    } finally {
      setIsSending(false);
    }
  };

  const fetchSessionStatus = async () => {
    // Session 数据现在通过 SSE hook 自动更新，此函数保留用于兼容性
    if (!sessionId) return;
    // TODO: 可以移除此函数或用于其他目的
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      role: 'ceo_agent',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderRecommendedRoles = (roles: Array<{roleName: string; description: string; responsibilities?: string[]}>) => {
    if (!roles || roles.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">🎯 推荐角色配置：</p>
        {roles.map((role, index) => (
          <div key={index} className="bg-linear-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-purple-900">{role.roleName}</h4>
                <p className="text-sm text-gray-700 mt-1">{role.description}</p>
                {role.responsibilities && (
                  <ul className="text-xs text-gray-600 mt-2 list-disc list-inside">
                    {role.responsibilities.map((resp: string, i: number) => (
                      <li key={i}>{resp}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProgress = () => {
    if (!progress) return null;

    return (
      <div className="border-b bg-gray-50 p-4">
        <VirtualCompanyProgress 
          progress={progress}
          status={status}
          isConnected={isConnected}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-linear-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-r from-purple-500 to-pink-500 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">创建虚拟公司</h2>
              <p className="text-sm text-gray-600">与 CEO Agent 对话，构建您的 AI 团队</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        {renderProgress()}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'ceo_agent' && (
                <div className="w-8 h-8 bg-linear-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[75%] rounded-2xl p-4 ${
                  message.role === 'user'
                    ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                
                {/* 显示推荐角色 */}
                {message.role === 'ceo_agent' && message.recommendedRoles && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {renderRecommendedRoles(message.recommendedRoles)}
                  </div>
                )}

                {/* 显示澄清问题 */}
                {message.role === 'ceo_agent' && message.clarificationQuestions && message.clarificationQuestions.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-blue-600">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">需要更多信息：</p>
                      <ul className="list-disc list-inside mt-1">
                        {message.clarificationQuestions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                <div
                  className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-purple-100' : 'text-gray-400'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          
          {isSending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-linear-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息... (按 Enter 发送)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-15 max-h-30"
              disabled={isSending || !sessionId}
              rows={2}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isSending || !sessionId}
              className="px-6 py-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">发送</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            💡 提示：详细描述您的需求，CEO Agent 会为您推荐合适的角色配置
          </p>
        </div>
      </div>
    </div>
  );
}
