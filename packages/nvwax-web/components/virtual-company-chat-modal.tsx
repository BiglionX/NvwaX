'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Building2, Loader2, Bot, User, CheckCircle, AlertCircle, Share2 } from 'lucide-react';
import { useVirtualCompanyProgress } from '@/hooks/use-virtual-company-progress';
import CEOConfigPreview from './CEOConfigPreview';
import DocumentPackagePreview from './DocumentPackagePreview';

interface VirtualCompanyChatModalProps {
  onClose: () => void;
  onSuccess: (teamSkillId: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'nvwax_agent'; // 改为 nvwax_agent
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
  nextStep?: string; // 添加下一步提示
  showConfirmButton?: boolean; // 显示确认按钮
  showActionButtons?: boolean; // 显示操作按钮（下载 + 集成）
  downloadUrl?: string; // 下载 URL
  ceoConfig?: {
    teamType: string;
    templateId: string;
    templateName: string;
    skills: string[];
    systemPrompt: string;
    managementStyle: string;
    decisionRules: string[];
  };
  documentPackage?: {
    documents: Array<{
      title: string;
      type: string;
      content: string;
      metadata: {
        generatedAt: string;
        version: string;
        teamType: string;
        [key: string]: unknown;
      };
    }>;
    packageInfo: {
      teamName: string;
      teamType: string;
      generatedAt: string;
      totalDocuments: number;
    };
  };
}

export default function VirtualCompanyChatModal({ onClose }: VirtualCompanyChatModalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareContent, setShareContent] = useState({ title: '', content: '', url: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 使用 SSE Hook 追踪进度
  const { progress } = useVirtualCompanyProgress(sessionId, {
    autoReconnect: true,
    maxRetries: 3,
    retryDelay: 2000
  });

  // 进度步骤定义
  const progressSteps = progress?.steps || [
    { stepNumber: 1, name: '需求分析', status: 'pending' as const, message: '等待开始' },
    { stepNumber: 2, name: '团队设计', status: 'pending' as const, message: '等待开始' },
    { stepNumber: 3, name: 'Agent 搜索', status: 'pending' as const, message: '等待开始' },
    { stepNumber: 4, name: 'Skill 匹配', status: 'pending' as const, message: '等待开始' },
    { stepNumber: 5, name: '需求确认', status: 'pending' as const, message: '等待开始' },
    { stepNumber: 6, name: '团队构建', status: 'pending' as const, message: '等待开始' },
    { stepNumber: 7, name: '保存配置', status: 'pending' as const, message: '等待开始' }
  ];

  const currentProgress = progress || { percentage: 0 };

  // 初始化会话
  useEffect(() => {
    // 先检查登录状态
    const token = localStorage.getItem('user_token');
    const userInfo = localStorage.getItem('user_info');
    
    if (!token || !userInfo) {
      addSystemMessage('请先登录以使用虚拟公司功能。\n\n💡 提示：点击右上角的"登录"按钮进行登录。');
      console.warn('User not logged in, skipping session creation');
      return;
    }
    
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

      if (!response.ok) {
        if (response.status === 401) {
          // Token 过期或无效，提示重新登录
          addSystemMessage('登录已过期，请重新登录后再试。\n\n💡 提示：请刷新页面并重新登录。');
          console.warn('Token expired or invalid');
          // 清除过期 token
          localStorage.removeItem('user_token');
          localStorage.removeItem('user_info');
          return;
        }
        throw new Error(data.error?.message || data.error || '创建会话失败');
      }
      
      if (!data.success) {
        throw new Error(data.error?.message || data.error || '创建会话失败');
      }

      setSessionId(data.data.id);
      // session 数据现在通过 SSE hook 自动更新

      // 添加 NvwaX Agent 的欢迎消息
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'nvwax_agent',
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
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/virtual-company/sessions/${sessionId}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: userMessage.content }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '发送消息失败');
      }

      // 添加 NvwaX Agent 回复
      const nvwaxMessage: Message = {
        id: `nvwax-${Date.now()}`,
        role: 'nvwax_agent',
        content: data.data.message,
        timestamp: new Date(),
        phase: data.data.phase,
        extractedRequirements: data.data.extractedRequirements,
        recommendedRoles: data.data.recommendedRoles,
        needsClarification: data.data.needsClarification,
        clarificationQuestions: data.data.clarificationQuestions,
        nextStep: data.data.nextStep
      };

      setMessages(prev => [...prev, nvwaxMessage]);

      // 如果进入 team_design 或 ceo_generation 阶段，自动触发 Agent/Skill 匹配
      if ((data.data.phase === 'team_design' || data.data.phase === 'ceo_generation') && !data.data.needsClarification) {
        console.log('🚀 Auto-triggering NvwaX match...');
        setTimeout(() => triggerNvwaXMatch(), 1000);
      }

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

  /**
   * 触发 NvwaX 完整匹配流程
   */
  const triggerNvwaXMatch = async () => {
    if (!sessionId) return;

    try {
      console.log('🚀 Triggering NvwaX match...');
      
      // 添加系统消息
      const systemMessage: Message = {
        id: `system-match-${Date.now()}`,
        role: 'nvwax_agent',
        content: '🔍 正在搜索匹配的 Agent 和 Skills...\n\n请稍候，这可能需要几分钟时间...',
        timestamp: new Date(),
        phase: 'agent_matching'
      };
      setMessages(prev => [...prev, systemMessage]);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/virtual-company/sessions/${sessionId}/nvwax-match`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '触发匹配失败');
      }

      console.log('✅ NvwaX match completed:', data.data);

      // 添加完成消息
      const agentMatches = data.data.agentMatches || {};
      const skillMatches = data.data.skillMatches || {};
      const ceoConfig = data.data.ceoConfig;
      const agentCount = Object.values(agentMatches).flat().length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const skillCount = Object.values(skillMatches).filter((s: any) => s.status === 'found').length;
      
      let content = `✅ 匹配完成！\n\n找到 ${agentCount} 个 Agent 候选\n找到 ${skillCount} 个 Skills`;
      
      if (ceoConfig) {
        content += `\n\n🎯 NvwaX Aiteam架构师 配置已生成：\n- 类型：${ceoConfig.templateName}\n- 管理风格：${ceoConfig.managementStyle}\n- Skills：${ceoConfig.skills.length} 个`;
      }
      
      content += '\n\n📦 团队配置已准备就绪，点击“确认并保存”将团队保存到用户中心并下载文档包。';
      
      const completeMessage: Message = {
        id: `system-match-complete-${Date.now()}`,
        role: 'nvwax_agent',
        content,
        timestamp: new Date(),
        phase: 'confirming',
        ceoConfig: ceoConfig || undefined,
        showConfirmButton: true // 显示确认按钮
      };
      setMessages(prev => [...prev, completeMessage]);

    } catch (error) {
      console.error('Error triggering NvwaX match:', error);
      const errorMessage: Message = {
        id: `system-match-error-${Date.now()}`,
        role: 'nvwax_agent',
        content: '⚠️ 匹配过程出现错误，但您可以继续手动配置。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      role: 'nvwax_agent',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  /**
   * 确认并保存团队到用户中心
   */
  const handleConfirmAndSave = async () => {
    if (!sessionId) return;

    setIsConfirming(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/virtual-company/sessions/${sessionId}/confirm`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '保存失败');
      }

      console.log('✅ Team confirmed and saved:', data.data);

      // 添加成功消息
      const successMessage: Message = {
        id: `system-confirm-success-${Date.now()}`,
        role: 'nvwax_agent',
        content: `✅ 太棒了！团队已成功保存到我的Agent仓库！\n\n📦 文档包已生成，现在可以下载或集成到 ProClaw 工作流中。`,
        timestamp: new Date(),
        documentPackage: data.data.documentPackage,
        showActionButtons: true,
        downloadUrl: data.data.downloadUrl
      };
      setMessages(prev => [...prev, successMessage]);

      // 更新进度
      fetchSessionStatus();
    } catch (error) {
      console.error('Error confirming and saving team:', error);
      const errorMessage: Message = {
        id: `system-confirm-error-${Date.now()}`,
        role: 'nvwax_agent',
        content: '⚠️ 保存失败，请重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsConfirming(false);
    }
  };

  /**
   * 下载文档包
   */
  const handleDownload = async (url: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}${url}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('下载失败');
      }

      // 创建 Blob 并下载
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'team_config.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      console.log('✅ Document package downloaded');
    } catch (error) {
      console.error('Error downloading document package:', error);
      alert('下载失败，请重试');
    }
  };

  /**
   * 集成到ProClaw
   */
  const handleIntegrateToProClaw = async (teamSessionId: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // 调用后端 API 将团队集成到 ProClaw
      const response = await fetch(`${API_URL}/virtual-company/sessions/${teamSessionId}/integrate-proclaw`, {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '集成失败');
      }

      console.log('✅ Team integrated to ProClaw:', data.data);

      // 添加成功消息
      const successMessage: Message = {
        id: `system-integrate-success-${Date.now()}`,
        role: 'nvwax_agent',
        content: `✅ 团队已成功集成到 ProClaw！\n\n现在您可以在 ProClaw 工作流中使用这个 AI 团队。\n\n ProClaw 团队 ID: ${data.data.proclawTeamId || '已创建'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
    } catch (error) {
      console.error('Error integrating to ProClaw:', error);
      const errorMessage: Message = {
        id: `system-integrate-error-${Date.now()}`,
        role: 'nvwax_agent',
        content: '⚠️ 集成到 ProClaw 失败，请重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  /**
   * 生成分享内容
   */
  const generateShareContent = () => {
    // 从消息中获取团队信息
    const lastMessage = messages[messages.length - 1];
    const teamType = lastMessage?.ceoConfig?.teamType || 'AI团队';
    const teamName = `${teamType}团队`;
    
    // 生成营销文案
    const marketingCopy = `🚀 我刚用 NvwaX 创建了一个超棒的「${teamName}」！

✨ 智能配置 · 即开即用 · 高效协作

这个 AI 团队包含多个专业角色，可以帮我完成各种任务。你也来试试吧！

#NvwaX #AI团队 #智能助手 #效率工具`;

    // 生成详情页链接（假设详情页路由）
    const shareUrl = `${window.location.origin}/marketplace/team-skills/${sessionId}`;

    return {
      title: teamName,
      content: marketingCopy,
      url: shareUrl
    };
  };

  /**
   * 处理分享
   */
  const handleShare = () => {
    const content = generateShareContent();
    setShareContent(content);
    setShowShareModal(true);
  };

  /**
   * 复制分享内容
   */
  const handleCopyShareContent = () => {
    const fullContent = `${shareContent.content}\n\n🔗 查看详情：${shareContent.url}`;
    
    navigator.clipboard.writeText(fullContent).then(() => {
      alert('✅ 已复制到剪贴板！快去分享给朋友吧~');
      setShowShareModal(false);
    }).catch(err => {
      console.error('复制失败:', err);
      alert('❌ 复制失败，请手动复制');
    });
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-linear-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-linear-to-r from-purple-500 to-pink-500 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">创建虚拟公司</h2>
              <p className="text-sm text-gray-600">与 NvwaX Aiteam架构师 对话，构建您的 AI 团队</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Main Content - 左右分栏 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：可视化进度 */}
          <div className="w-72 border-r border-gray-200 bg-gray-50 p-6 overflow-y-auto">
            <h3 className="font-semibold text-sm mb-6 text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              创建进度
            </h3>
            <div className="space-y-4">
              {progressSteps.map((step, index) => (
                <div key={step.stepNumber} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                      ${step.status === 'completed' ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 
                        step.status === 'in_progress' ? 'bg-blue-500 text-white animate-pulse shadow-lg shadow-blue-200' : 
                        'bg-gray-200 text-gray-500'}
                    `}>
                      {step.status === 'completed' ? '✓' : step.stepNumber}
                    </div>
                    {index < progressSteps.length - 1 && (
                      <div className={`w-0.5 h-10 transition-all duration-300 ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`text-sm font-semibold transition-colors duration-300 ${
                      step.status === 'completed' ? 'text-green-700' : 
                      step.status === 'in_progress' ? 'text-blue-700' : 
                      'text-gray-500'
                    }`}>
                      {step.name}
                    </p>
                    {step.message && step.message !== '等待开始' && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{step.message}</p>
                    )}
                    {step.status === 'in_progress' && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>进行中...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* 总体进度条 */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-600 mb-2">
                <span className="font-medium">总进度</span>
                <span className="font-bold text-blue-600">{currentProgress?.percentage || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-linear-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${currentProgress?.percentage || 0}%` }}
                />
              </div>
            </div>
            
            {/* 提示信息 */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700 leading-relaxed">
                💡 <strong>提示</strong>：整个团队创建完成后，会自动保存到我的Agent仓库并生成可下载的文档包。
              </p>
            </div>
          </div>
          
          {/* 右侧：对话区域 */}
          <div className="flex-1 flex flex-col min-h-0">
            {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'nvwax_agent' && (
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
                {message.role === 'nvwax_agent' && message.recommendedRoles && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {renderRecommendedRoles(message.recommendedRoles)}
                  </div>
                )}

                {/* 显示 CEO 配置预览 */}
                {message.role === 'nvwax_agent' && message.ceoConfig && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <CEOConfigPreview config={message.ceoConfig} />
                  </div>
                )}

                {/* 显示确认按钮 */}
                {message.role === 'nvwax_agent' && message.showConfirmButton && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <button
                      onClick={handleConfirmAndSave}
                      disabled={isConfirming}
                      className="w-full px-6 py-3 bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                    >
                      {isConfirming ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>正在保存...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>确认并保存到我的Agent仓库</span>
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      确认后，团队配置将保存到Agent仓库，并生成可下载的文档包
                    </p>
                  </div>
                )}

                {/* 显示文档包预览 */}
                {message.role === 'nvwax_agent' && message.documentPackage && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <DocumentPackagePreview docPackage={message.documentPackage} />
                  </div>
                )}

                {/* 显示操作按钮（下载 + 集成到ProClaw + 分享） */}
                {message.role === 'nvwax_agent' && message.showActionButtons && message.downloadUrl && (
                  <div className="mt-4 pt-3 border-t border-gray-200 space-y-3">
                    <button
                      onClick={() => handleDownload(message.downloadUrl!)}
                      className="w-full px-6 py-3 bg-linear-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-semibold"
                    >
                      <Send className="w-5 h-5" />
                      <span>下载文档包</span>
                    </button>
                    <button
                      onClick={() => handleIntegrateToProClaw(sessionId!)}
                      className="w-full px-6 py-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-semibold"
                    >
                      <Building2 className="w-5 h-5" />
                      <span>集成到ProClaw</span>
                    </button>
                    <button
                      onClick={handleShare}
                      className="w-full px-6 py-3 bg-linear-to-r from-orange-500 to-red-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-semibold"
                    >
                      <Share2 className="w-5 h-5" />
                      <span>分享给朋友</span>
                    </button>
                  </div>
                )}

                {/* 显示澄清问题 */}
                {message.role === 'nvwax_agent' && message.clarificationQuestions && message.clarificationQuestions.length > 0 && (
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
              💡 提示：详细描述您的需求，NvwaX Aiteam架构师 会为您推荐合适的角色配置
            </p>
          </div>
        </div>
      </div>

      {/* 分享弹窗 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-linear-to-r from-orange-50 to-red-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-linear-to-r from-orange-500 to-red-500 rounded-lg">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">分享给朋友</h2>
                  <p className="text-sm text-gray-600">复制以下内容分享到社交媒体</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* 预览卡片 */}
              <div className="bg-linear-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                <h3 className="font-bold text-purple-900 mb-2">{shareContent.title}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{shareContent.content}</p>
                <div className="mt-3 pt-3 border-t border-purple-200">
                  <p className="text-xs text-purple-600 font-mono break-all">{shareContent.url}</p>
                </div>
              </div>

              {/* 完整内容预览 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">📋 即将复制的内容：</p>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {shareContent.content}
                  {'\n'}
                  {'\n'}
                  🔗 查看详情：{shareContent.url}
                </pre>
              </div>

              {/* 提示 */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  💡 点击"复制并关闭"后，内容将自动复制到剪贴板，您可以粘贴到微信、微博、Twitter 等平台分享。
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleCopyShareContent}
                className="flex-1 px-4 py-3 bg-linear-to-r from-orange-500 to-red-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-semibold"
              >
                <CheckCircle className="w-5 h-5" />
                <span>复制并关闭</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
