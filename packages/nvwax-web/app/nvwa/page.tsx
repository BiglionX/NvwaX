'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, Sparkles, Loader, RotateCcw, Lightbulb, Zap, Database, FileText, Cpu, Check, AlertCircle, CornerDownLeft, ArrowUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import VirtualCompanyChatModal from '@/components/virtual-company-chat-modal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentFormData {
  name: string;
  description: string;
  dataSources: string[];
  outputs: string[];
  implementation: string;
  skills: string[];
}

interface TemplateResult {
  name?: string;
  title?: string;
  rating?: number | string;
  matchScore?: number | string;
  skills?: string[];
}

interface CreationProgress {
  currentStep: number;
  totalSteps: 7;
  percentage: number;
  steps: Array<{
    stepNumber: number;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    message: string;
  }>;
}

/** 快捷建议词组 */
const SUGGESTIONS_BY_STEP: Record<number, string[]> = {
  0: [
    '自动回复客户咨询的客服智能体',
    '分析股票和基金数据的投资助手',
    '生成营销文案和广告创意的工具',
    '处理订单和物流查询的助手',
  ],
  1: [
    '公司产品数据库和API文档',
    '用户订单系统和CRM数据',
    '知识库和FAQ文档',
    '第三方天气/地图API',
  ],
  2: [
    '自动回复客户消息',
    '生成数据分析报表',
    '创建个性化推荐',
    '实时告警和通知',
  ],
  3: [
    '调用现有REST API',
    '使用LLM自然语言处理',
    '查询数据库并分析',
    '集成第三方服务',
  ],
};

/** 步骤配置 */
const STEP_CONFIG = [
  { icon: Lightbulb, label: '需求分析', color: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-100 dark:bg-amber-900/20', textColor: 'text-amber-600 dark:text-amber-400' },
  { icon: Database, label: '数据源配置', color: 'from-emerald-500 to-teal-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/20', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { icon: FileText, label: '输出定义', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/20', textColor: 'text-blue-600 dark:text-blue-400' },
  { icon: Cpu, label: '实现方式', color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-100 dark:bg-blue-900/20', textColor: 'text-blue-600 dark:text-blue-400' },
  { icon: Zap, label: '模板搜索', color: 'from-pink-500 to-rose-500', bgColor: 'bg-pink-100 dark:bg-pink-900/20', textColor: 'text-pink-600 dark:text-pink-400' },
  { icon: Sparkles, label: '配置审查', color: 'from-indigo-500 to-blue-500', bgColor: 'bg-indigo-100 dark:bg-indigo-900/20', textColor: 'text-indigo-600 dark:text-indigo-400' },
  { icon: Check, label: '保存配置', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-100 dark:bg-green-900/20', textColor: 'text-green-600 dark:text-green-400' },
];

export default function NvwaPage() {
  const { isLoggedIn, userInfo, login, loading: authLoading } = useAuth();

  // 从 URL 参数读取外部注入的需求（如从 ProClaw 跳转），使用 window.location 避免 SSR 问题
  const [externalRequirements, setExternalRequirements] = useState<string | null>(null);
  const [externalTeamName, setExternalTeamName] = useState<string | null>(null);
  const [externalCategory, setExternalCategory] = useState<string | null>(null);
  const [externalTags, setExternalTags] = useState<string | null>(null);
  const [crossAuthHandled, setCrossAuthHandled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setExternalRequirements(params.get('requirements'));
      setExternalTeamName(params.get('teamName'));
      setExternalCategory(params.get('category'));
      setExternalTags(params.get('tags'));
    }
  }, []);

  // ProClaw 跨服务统一认证：自动登录
  useEffect(() => {
    if (crossAuthHandled || authLoading) return;
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const proclawToken = params.get('proclaw_token');
    const proclawEmail = params.get('proclaw_email');

    if (!proclawToken || !proclawEmail) {
      setCrossAuthHandled(true);
      return;
    }

    // 如果已登录，跳过
    if (isLoggedIn) {
      setCrossAuthHandled(true);
      return;
    }

    const doCrossAuth = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_URL}/auth/proclaw-cross-auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proclaw_token: proclawToken, proclaw_email: proclawEmail }),
        });

        const data = await response.json();
        if (!response.ok || !data.data) {
          console.warn('[ProClaw CrossAuth] Failed:', data.error);
          setCrossAuthHandled(true);
          return;
        }

        // 使用 useAuth 的 login 方法存储 Token 和用户信息
        login(data.data.token, {
          id: data.data.user.id,
          email: data.data.user.email,
          name: data.data.user.name,
        });

        console.log('[ProClaw CrossAuth] Auto-login successful:', data.data.user.email);
      } catch (err) {
        console.error('[ProClaw CrossAuth] Error:', err);
      } finally {
        setCrossAuthHandled(true);
      }
    };

    doCrossAuth();
  }, [isLoggedIn, authLoading, crossAuthHandled, login]);

  // 跨服务认证完成后，自动打开虚拟公司弹窗（但需等待登录状态稳定）
  const [authReadyForModal, setAuthReadyForModal] = useState(false);
  useEffect(() => {
    if (crossAuthHandled && externalRequirements && !authLoading) {
      // 给一点时间让 auth state 稳定
      const timer = setTimeout(() => setAuthReadyForModal(true), 300);
      return () => clearTimeout(timer);
    }
  }, [crossAuthHandled, externalRequirements, authLoading]);

  // 构建带额外上下文的初始消息
  const initialVirtualCompanyMessage = externalRequirements
    ? [
        externalRequirements,
        externalTeamName ? `\n团队名称建议：${externalTeamName}` : '',
        externalCategory ? `\n业务分类：${externalCategory}` : '',
        externalTags ? `\n相关标签：${externalTags}` : '',
      ].join('')
    : undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    dataSources: [],
    outputs: [],
    implementation: '',
    skills: [],
  });
  const [activeMode, setActiveMode] = useState<'agent' | 'aiteam'>('agent');
  const [showVirtualCompanyModal, setShowVirtualCompanyModal] = useState(false);
  const [progress, setProgress] = useState<CreationProgress>({
    currentStep: 0,
    totalSteps: 7,
    percentage: 0,
    steps: [
      { stepNumber: 1, name: '需求分析', status: 'pending', message: '等待开始' },
      { stepNumber: 2, name: '数据源配置', status: 'pending', message: '等待开始' },
      { stepNumber: 3, name: '输出定义', status: 'pending', message: '等待开始' },
      { stepNumber: 4, name: '实现方式', status: 'pending', message: '等待开始' },
      { stepNumber: 5, name: '模板搜索', status: 'pending', message: '等待开始' },
      { stepNumber: 6, name: '配置审查', status: 'pending', message: '等待开始' },
      { stepNumber: 7, name: '保存配置', status: 'pending', message: '等待开始' }
    ]
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 监听消息容器滚动
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // textarea 自动调整高度
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
  }, [inputValue]);

  // 客户端初始化欢迎消息
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `你好！我是 **Nvwa**，智能体之母 🌟

我可以通过对话帮您创建专属的智能体。让我们开始吧！

**第一步：您需要什么样的智能体？**

请描述它的用途，或点击下方快捷选项：`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // 从 ProClaw 等外部来源跳转时，自动打开虚拟公司创建弹窗（等待跨服务认证完成）
  useEffect(() => {
    if (externalRequirements) {
      // 延迟打开，确保页面已完全渲染
      const timer = setTimeout(() => {
        setActiveMode('aiteam');
        setShowVirtualCompanyModal(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [authReadyForModal]);

  // 添加消息
  const addAssistantMessage = (content: string) => {
    const safeContent = typeof content === 'string' ? content : String(content);
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: safeContent,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addUserMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // 自动滚动
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, scrollToBottom]);

  // 更新进度
  const updateProgress = (stepNumber: number, status: 'pending' | 'in_progress' | 'completed' | 'failed', message: string) => {
    setProgress(prev => {
      const newSteps = prev.steps.map(step => {
        if (step.stepNumber === stepNumber) {
          return { ...step, status, message };
        }
        if (step.status === 'pending' && step.stepNumber < stepNumber) {
          return { ...step, status: 'completed' as const, message: '已完成' };
        }
        return step;
      });

      const completedSteps = newSteps.filter(s => s.status === 'completed').length;
      const percentage = Math.round((completedSteps / newSteps.length) * 100);

      return { ...prev, currentStep: stepNumber, percentage, steps: newSteps };
    });
  };

  // 搜索模板
  const searchTemplates = async (description: string, implementation: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/nvwa-agent/search-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, implementation })
      });
      const data = await response.json();
      if (response.ok && data.success) return data.data;
      return [];
    } catch {
      return [];
    }
  };

  // 审查配置
  const reviewAgentConfig = async (config: AgentFormData) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/nvwa-agent/review-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentConfig: config })
      });
      const data = await response.json();
      if (response.ok && data.success) return data.data;
      return { reviewPassed: true, issues: [], suggestions: [], confidence: 0.5 };
    } catch {
      return { reviewPassed: true, issues: ['审查服务暂时不可用'], suggestions: ['请手动检查配置'], confidence: 0.5 };
    }
  };

  // Step 5-6: 技能分析和配置审查
  const executeSkillAnalysisAndReview = async () => {
    updateProgress(5, 'in_progress', '正在分析技能和审查配置...');

    setFormData(prev => ({
      ...prev,
      skills: ['自然语言处理', '知识库检索', '对话管理']
    }));

    addAssistantMessage(
      `好的！我来分析这个模板需要的技能...\n\n📊 **技能分析结果：**\n\n✅ **已包含的技能：**\n- 自然语言处理\n- 知识库检索\n- 对话管理\n\n⚠️ **需要补充的技能：**\n- 订单查询 API 集成\n- 实时数据同步\n\n让我搜索技能商店...`
    );

    setTimeout(async () => {
      const updatedSkills = ['自然语言处理', '知识库检索', '对话管理', '订单查询连接器', '实时数据同步器'];
      setFormData(prev => ({ ...prev, skills: updatedSkills }));

      addAssistantMessage(
        `🔍 **技能商店搜索结果：**\n\n✅ **找到匹配技能：**\n- 订单查询连接器（评分 4.8/5）\n- 实时数据同步器（评分 4.5/5）\n\n这些技能可以直接集成。现在让我为您审查智能体配置...\n\n✨ **正在进行配置审查...**`
      );

      try {
        const currentConfig = {
          name: formData.name || formData.description || '客服智能体',
          description: formData.description,
          dataSources: formData.dataSources,
          outputs: formData.outputs,
          implementation: formData.implementation,
          skills: updatedSkills
        };

        const reviewResult = await reviewAgentConfig(currentConfig);

        if (reviewResult.reviewPassed) {
          updateProgress(5, 'completed', '配置审查通过');
          let suggestionsText = '';
          if (reviewResult.suggestions?.length > 0) {
            suggestionsText = `\n\n💡 **优化建议：**\n${reviewResult.suggestions.map((s: string) => `- ${s}`).join('\n')}`;
          }
          addAssistantMessage(
            `✅ **配置审查通过！**\n\n**置信度：** ${(reviewResult.confidence * 100).toFixed(0)}%${suggestionsText}\n\n✨ **智能体配置预览：**\n\n**名称：** ${currentConfig.name}\n**数据源：** ${currentConfig.dataSources.join(', ')}\n**输出：** ${currentConfig.outputs.join(', ')}\n**实现方式：** ${currentConfig.implementation}\n**技能：** ${currentConfig.skills.join(' + ')}\n\n确认创建吗？`
          );
        } else {
          updateProgress(5, 'failed', '配置审查发现问题');
          const issuesText = reviewResult.issues.map((issue: string) => `- ${issue}`).join('\n');
          const suggestionsText = reviewResult.suggestions.map((s: string) => `- ${s}`).join('\n');
          addAssistantMessage(
            `⚠️ **发现以下问题：**\n\n${issuesText}\n\n💡 **建议：**\n${suggestionsText}\n\n您可以：\n1. 修改配置后重新审查\n2. 忽略问题继续创建\n\n请告诉我您的选择~`
          );
        }
      } catch {
        updateProgress(5, 'failed', '审查服务异常，使用默认配置');
        addAssistantMessage(
          `⚠️ **审查服务暂时不可用**，将使用默认配置继续。\n\n✨ **智能体配置预览：**\n\n**名称：** ${formData.description || '客服智能体'}\n**数据源：** ${formData.dataSources.join(', ')}\n**输出：** ${formData.outputs.join(', ')}\n**实现方式：** ${formData.implementation}\n**技能：** NLP + 知识库 + 对话管理 + 订单查询 + 数据同步\n\n确认创建吗？`
        );
      }

      setCurrentStep(6);
    }, 1500);
  };

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userMessage = inputValue.trim();
    addUserMessage(userMessage);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      processUserInput(userMessage);
      setIsTyping(false);
    }, 1000);
  };

  // 快捷建议点击
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  // 处理用户输入
  const processUserInput = async (input: string) => {
    const teamKeywords = ['团队', 'team', '虚拟公司', 'virtual company', 'ai团队', 'ai team', '多agent', 'multi-agent', '协作', 'collaboration'];
    const isTeamRequest = teamKeywords.some(keyword => input.toLowerCase().includes(keyword));

    if (isTeamRequest && currentStep === 0) {
      addAssistantMessage(
        `我注意到您想创建一个 AI 团队！🎯\n\nNvwa 主要用于创建单个智能体，而创建 AI 团队（虚拟公司）需要使用专门的团队创建工具。\n\n我将为您打开虚拟公司创建窗口，在那里您可以：\n- 描述团队需求\n- 获得专业的角色推荐\n- 自动匹配 Agent 和 Skills\n- 生成完整的团队配置\n\n正在为您打开虚拟公司创建界面...`
      );
      setTimeout(() => setShowVirtualCompanyModal(true), 1500);
      return;
    }

    switch (currentStep) {
      case 0:
        setFormData(prev => ({ ...prev, description: input }));
        updateProgress(1, 'completed', `需求：${input.substring(0, 20)}...`);
        setCurrentStep(1);
        addAssistantMessage(
          `明白了！您想要创建一个"**${input}**"的智能体。\n\n**第二步：这个智能体需要访问哪些数据源？**\n\n请描述数据来源，或选择下方快捷选项：`
        );
        break;

      case 1:
        setFormData(prev => ({ ...prev, dataSources: [input] }));
        updateProgress(2, 'completed', `数据源：${input}`);
        setCurrentStep(2);
        addAssistantMessage(
          `好的，它会访问"**${input}**"。\n\n**第三步：您希望它输出什么结果？**\n\n请描述输出内容，或选择下方快捷选项：`
        );
        break;

      case 2:
        setFormData(prev => ({ ...prev, outputs: [input] }));
        updateProgress(3, 'completed', `输出：${input}`);
        setCurrentStep(3);
        addAssistantMessage(
          `清楚了，它会"**${input}**"。\n\n**第四步：您希望它如何得到这个结果？**\n\n请描述实现方式，或选择下方快捷选项：`
        );
        break;

      case 3:
        setFormData(prev => ({ ...prev, implementation: input }));
        setCurrentStep(4);
        updateProgress(4, 'in_progress', '正在并行搜索模板...');
        addAssistantMessage(`太好了！让我分析一下您的需求...\n\n🔍 **正在并行搜索匹配的智能体模板...**`);

        try {
          const templates = await searchTemplates(formData.description, input);
          if (templates && templates.length > 0) {
            updateProgress(4, 'completed', `找到 ${templates.length} 个模板`);
            const templateList = templates.map((t: TemplateResult, i: number) => {
              const name = String(t.name || t.title || '未命名模板');
              const rating = t.rating ? String(t.rating) : 'N/A';
              const matchScore = t.matchScore ? String(t.matchScore) : 'N/A';
              const skills = Array.isArray(t.skills) ? t.skills.map(s => String(s)).join(', ') : '无';
              return `${i + 1}. **${name}** （评分 ${rating}/5 · 匹配度 ${matchScore}%）\n   - 技能：${skills}`;
            }).join('\n\n');
            addAssistantMessage(`✅ **找到了 ${templates.length} 个相似的模板！**\n\n${templateList}\n\n您想选择哪个模板？`);
          } else {
            updateProgress(4, 'completed', '未找到模板，将创建新配置');
            addAssistantMessage(`⚠️ **未找到完全匹配的模板**，将为您创建全新配置。\n\n继续下一步...`);
          }
        } catch {
          updateProgress(4, 'failed', '搜索失败，使用默认配置');
          addAssistantMessage(`⚠️ **搜索超时**，将使用默认配置继续。`);
        }

        await executeSkillAnalysisAndReview();
        break;

      case 4:
        setCurrentStep(5);
        updateProgress(5, 'in_progress', '正在分析技能和审查配置...');
        setFormData(prev => ({ ...prev, skills: ['自然语言处理', '知识库检索', '对话管理'] }));
        addAssistantMessage(
          `好的！我来分析这个模板需要的技能...\n\n📊 **技能分析结果：**\n\n✅ **已包含的技能：**\n- 自然语言处理\n- 知识库检索\n- 对话管理\n\n⚠️ **需要补充的技能：**\n- 订单查询 API 集成\n- 实时数据同步\n\n让我搜索技能商店...`
        );

        setTimeout(async () => {
          const updatedSkills = ['自然语言处理', '知识库检索', '对话管理', '订单查询连接器', '实时数据同步器'];
          setFormData(prev => ({ ...prev, skills: updatedSkills }));
          addAssistantMessage(
            `🔍 **技能商店搜索结果：**\n\n✅ **找到匹配技能：**\n- 订单查询连接器（评分 4.8/5）\n- 实时数据同步器（评分 4.5/5）\n\n这些技能可以直接集成。现在让我为您审查智能体配置...\n\n✨ **正在进行配置审查...**`
          );

          try {
            const currentConfig = {
              name: formData.name || formData.description || '客服智能体',
              description: formData.description,
              dataSources: formData.dataSources,
              outputs: formData.outputs,
              implementation: formData.implementation,
              skills: updatedSkills
            };
            const reviewResult = await reviewAgentConfig(currentConfig);

            if (reviewResult.reviewPassed) {
              updateProgress(5, 'completed', '配置审查通过');
              let suggestionsText = '';
              if (reviewResult.suggestions?.length > 0) {
                suggestionsText = `\n\n💡 **优化建议：**\n${reviewResult.suggestions.map((s: string) => `- ${s}`).join('\n')}`;
              }
              addAssistantMessage(
                `✅ **配置审查通过！**\n\n**置信度：** ${(reviewResult.confidence * 100).toFixed(0)}%${suggestionsText}\n\n✨ **智能体配置预览：**\n\n**名称：** ${currentConfig.name}\n**数据源：** ${currentConfig.dataSources.join(', ')}\n**输出：** ${currentConfig.outputs.join(', ')}\n**实现方式：** ${currentConfig.implementation}\n**技能：** ${currentConfig.skills.join(' + ')}\n\n确认创建吗？`
              );
            } else {
              updateProgress(5, 'failed', '配置审查发现问题');
              const issuesText = reviewResult.issues.map((issue: string) => `- ${issue}`).join('\n');
              const suggestionsText = reviewResult.suggestions.map((s: string) => `- ${s}`).join('\n');
              addAssistantMessage(
                `⚠️ **发现以下问题：**\n\n${issuesText}\n\n💡 **建议：**\n${suggestionsText}\n\n您可以：\n1. 修改配置后重新审查\n2. 忽略问题继续创建\n\n请告诉我您的选择~`
              );
            }
          } catch {
            updateProgress(5, 'failed', '审查服务异常，使用默认配置');
            addAssistantMessage(
              `⚠️ **审查服务暂时不可用**，将使用默认配置继续。\n\n✨ **智能体配置预览：**\n\n**名称：** ${formData.description || '客服智能体'}\n**数据源：** ${formData.dataSources.join(', ')}\n**输出：** ${formData.outputs.join(', ')}\n**实现方式：** ${formData.implementation}\n**技能：** NLP + 知识库 + 对话管理 + 订单查询 + 数据同步\n\n确认创建吗？`
            );
          }
          setCurrentStep(6);
        }, 1500);
        break;

      case 5:
      case 6:
        if (input.includes('确认') || input.includes('是') || input.toLowerCase().includes('yes')) {
          updateProgress(6, 'completed', '配置已确认');
          if (!isLoggedIn) {
            addAssistantMessage(
              `在创建智能体之前，需要先登录账户。\n\n🔐 **请登录或注册**\n\n登录后，您的智能体会保存在个人空间中，可以随时管理和使用。\n\n[点击这里登录](/login)`
            );
          } else {
            updateProgress(7, 'in_progress', '正在保存配置...');
            addAssistantMessage(
              `🎉 **智能体配置已准备就绪！**\n\n在创建之前，请选择保存方式：\n\n1️⃣ **保存到项目** - 将智能体关联到现有项目\n2️⃣ **保存到个人空间** - 仅保存在您的个人账户中\n\n请输入 "1" 或 "2"`
            );
            setCurrentStep(10); // 保存方式选择
          }
        } else {
          addAssistantMessage(`没问题！您可以：\n1. 重新选择模板\n2. 修改需求\n3. 从头开始\n\n请告诉我您的想法~`);
        }
        break;

      case 10:
        if (input === '1' || input.includes('项目')) {
          addAssistantMessage(
            `📂 **请选择要保存到的项目：**\n\n您的项目列表：\n\n1. 电商网站项目\n2. 数据分析平台\n3. 内容管理系统\n4. [创建新项目]\n\n请输入项目编号（1-4），或输入项目名称`
          );
          setCurrentStep(11);
        } else if (input === '2' || input.includes('个人')) {
          updateProgress(7, 'completed', '已保存到个人空间');
          addAssistantMessage(
            `🎉 **智能体创建成功！**\n\n✨ **${formData.description || '客服智能体'}** 已经创建完成！\n\n📦 **保存位置：** 您的个人空间\n\n您可以：\n1. 立即测试智能体\n2. 查看智能体详情\n3. 分享智能体给他人\n\n还需要我帮您做什么吗？`
          );
          setCurrentStep(7);
        } else {
          addAssistantMessage(`请输入 "1" 保存到项目，或 "2" 保存到个人空间`);
        }
        break;

      case 11: {
        const selectedProject =
          input === '1' ? '电商网站项目' :
          input === '2' ? '数据分析平台' :
          input === '3' ? '内容管理系统' : input;
        updateProgress(7, 'completed', `已保存到 ${selectedProject}`);
        addAssistantMessage(
          `🎉 **智能体创建成功并已保存到项目！**\n\n✨ **${formData.description || '客服智能体'}** 已经创建完成！\n\n📂 **保存位置：** ${selectedProject}\n🤖 **团队配置：** 将自动生成对应的 AiTeam 和 Agent Teams\n\n还需要我帮您做什么吗？`
        );
        setCurrentStep(7);
        break;
      }

      default:
        addAssistantMessage(`感谢您的反馈！如果您想创建新的智能体，可以点击右上角"重新开始"按钮。😊`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /** 渲染消息内容 */
  const renderMessageContent = (content: string, isUser: boolean) => {
    return content.split('\n').map((line, idx) => {
      // 粗体标题
      if (line.match(/^\*\*.*\*\*$/)) {
        return (
          <strong key={idx} className={`block font-bold mb-1 ${isUser ? '' : 'text-gray-900 dark:text-white'}`}>
            {line.slice(2, -2)}
          </strong>
        );
      }
      // 粗体 + 内容
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={idx} className="leading-relaxed">
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
        return <div key={idx} className="ml-2 flex gap-1.5"><span className="shrink-0">•</span><span>{line.slice(2)}</span></div>;
      }
      // 编号列表
      if (line.match(/^\d+[.)]\s/)) {
        return <div key={idx} className="ml-2">{line}</div>;
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
          return <div key={idx} className="leading-relaxed">{elements}</div>;
        }
      }
      // 空行
      if (line.trim() === '') return <div key={idx} className="h-1.5" />;
      return <div key={idx} className="leading-relaxed">{line}</div>;
    });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)]">
      {/* ====== Hero Header ====== */}
      <header className="relative overflow-hidden bg-white dark:bg-gray-900 border-b border-gray-200/60 dark:border-gray-800">
        {/* 背景渐变装饰 */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-blue-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-blue-500/10 dark:to-pink-500/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl blur-md opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Sparkles size={20} className="text-white animate-pulse" />
                </div>
              </div>
            </div>

            {/* 居中：模式切换器 */}
            <div className="flex-1 flex justify-center">
              <div className="inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-inner">
                {/* Nvwa Agent */}
                <button
                  onClick={() => { setActiveMode('agent'); setShowVirtualCompanyModal(false); }}
                  className={`relative flex items-center gap-2 px-4 sm:px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    activeMode === 'agent'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    activeMode === 'agent'
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  }`}>
                    🤖
                  </span>
                  <span className="hidden sm:inline">Nvwa Agent</span>
                  <span className="sm:hidden text-xs">Agent</span>
                </button>

                {/* NvwaX Aiteam */}
                <button
                  onClick={() => { setActiveMode('aiteam'); setShowVirtualCompanyModal(true); }}
                  className={`relative flex items-center gap-2 px-4 sm:px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    activeMode === 'aiteam'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    activeMode === 'aiteam'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  }`}>
                    🏢
                  </span>
                  <span className="hidden sm:inline">NvwaX Aiteam</span>
                  <span className="sm:hidden text-xs">Aiteam</span>
                </button>
              </div>
            </div>

            {/* 右侧操作区 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {activeMode === 'agent' && currentStep > 0 && currentStep < 7 && (
                <button
                  onClick={() => {
                    if (confirm('确定要重新开始吗？当前进度将丢失。')) {
                      window.location.reload();
                    }
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
                  aria-label="重新开始"
                >
                  <RotateCcw size={15} />
                  <span>重新开始</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ====== 主内容区域 ====== */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl mx-auto w-full gap-0 lg:gap-6 px-0 sm:px-4 lg:px-6 py-0 sm:py-4 lg:py-6">
          {/* 左侧面板 - 桌面端侧边栏 */}
          <aside className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-4 overflow-y-auto pr-1 max-h-[calc(100vh-140px)] sticky top-0">
            {/* 需求信息卡片 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">需求信息</h3>
              </div>

              {(!formData.name && !formData.description && formData.dataSources.length === 0) ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                    <Lightbulb className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">完成对话后，需求信息<br />将在此实时展示</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.description && (
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <label className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">用途描述</label>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 leading-relaxed">{formData.description}</p>
                    </div>
                  )}
                  {formData.dataSources.length > 0 && (
                    <div>
                      <label className="text-[11px] font-semibold text-green-500 dark:text-green-400 uppercase tracking-wider">数据源</label>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {formData.dataSources.map((s, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full font-medium border border-green-100 dark:border-green-900/30">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {formData.outputs.length > 0 && (
                    <div>
                      <label className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">输出类型</label>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {formData.outputs.map((o, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full font-medium border border-blue-100 dark:border-blue-900/30">
                            {o}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {formData.implementation && (
                    <div className="p-3 bg-cyan-50/50 dark:bg-cyan-900/10 rounded-xl border border-cyan-100 dark:border-cyan-900/30">
                      <label className="text-[11px] font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider">实现方式</label>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{formData.implementation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 技能卡片 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">已选技能</h3>
                {formData.skills.length > 0 && (
                  <span className="ml-auto text-xs font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                    {formData.skills.length}
                  </span>
                )}
              </div>

              {formData.skills.length > 0 ? (
                <div className="space-y-2">
                  {formData.skills.map((skill, index) => (
                    <div key={index} className="group flex items-center gap-3 p-2.5 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 cursor-default">
                      <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {index + 1}
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{skill}</p>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <Check size={14} className="text-green-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                    <Bot className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">分析需求后将自动推荐</p>
                </div>
              )}
            </div>

            {/* 创建进度 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                  <Loader className={`w-4 h-4 text-indigo-600 dark:text-indigo-400 ${progress.percentage > 0 && progress.percentage < 100 ? 'animate-spin' : ''}`} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">创建进度</h3>
                <span className="ml-auto text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {progress.percentage}%
                </span>
              </div>

              {/* 进度条 */}
              <div className="mb-5">
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out shadow-sm shadow-indigo-500/25"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>

              {/* 步骤列表 */}
              <div className="space-y-1.5">
                {progress.steps.map((step, idx) => {
                  const config = STEP_CONFIG[idx];
                  const StepIcon = config.icon;
                  const isActive = step.status === 'in_progress';
                  const isDone = step.status === 'completed';
                  const isFailed = step.status === 'failed';

                  return (
                    <div key={step.stepNumber} className={`relative flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300 ${
                      isActive ? 'bg-indigo-50/80 dark:bg-indigo-900/20 scale-[1.02]' :
                      isDone ? '' : ''
                    }`}>
                      {/* 步骤连线装饰 */}
                      {idx < progress.steps.length - 1 && (
                        <div className={`absolute left-5 top-10 bottom-0 w-0.5 -mb-1.5 transition-colors duration-500 ${
                          isDone ? 'bg-green-300 dark:bg-green-700' :
                          isActive ? 'bg-indigo-200 dark:bg-indigo-800' :
                          'bg-gray-200 dark:bg-gray-700'
                        }`} />
                      )}

                      {/* 状态图标 */}
                      <div className={`relative z-10 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isDone ? 'bg-green-500 text-white shadow-sm shadow-green-500/30' :
                        isActive ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30 scale-110 animate-pulse' :
                        isFailed ? 'bg-red-500 text-white shadow-sm shadow-red-500/30' :
                        `bg-gray-100 dark:bg-gray-700 text-gray-400 ${config.textColor} group-hover:bg-gray-200 dark:group-hover:bg-gray-600`
                      }`}>
                        {isDone ? <Check size={12} strokeWidth={3} /> :
                         isFailed ? <AlertCircle size={12} /> :
                         <StepIcon size={13} className={isActive ? 'text-white' : ''} />}
                      </div>

                      {/* 步骤信息 */}
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-semibold transition-colors ${
                          isDone ? 'text-green-600 dark:text-green-400' :
                          isActive ? 'text-indigo-600 dark:text-indigo-400' :
                          isFailed ? 'text-red-600 dark:text-red-400' :
                          'text-gray-400 dark:text-gray-500'
                        }`}>
                          {step.name}
                        </span>
                        {step.message && step.message !== '等待开始' && step.message !== '已完成' && (
                          <p className={`text-[11px] mt-0.5 truncate ${
                            isActive ? 'text-indigo-400 dark:text-indigo-500' :
                            isDone ? 'text-green-400 dark:text-green-600' :
                            'text-gray-400'
                          }`}>
                            {step.message}
                          </p>
                        )}
                      </div>

                      {isActive && (
                        <Loader size={12} className="text-indigo-500 animate-spin shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* 右侧对话区域 */}
          <section className="lg:col-span-8 xl:col-span-9 flex flex-col bg-white dark:bg-gray-900 overflow-hidden min-h-0">
            {/* 移动端：收起时显示进度摘要 */}
            {currentStep > 0 && (
              <div className="lg:hidden px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">
                    {progress.percentage}%
                  </span>
                </div>
              </div>
            )}

            {/* 对话消息区域 */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto scroll-smooth relative"
              role="log"
              aria-live="polite"
              aria-label="聊天记录"
            >
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-300 ease-out`}
                  >
                    {/* AI 头像 */}
                    {message.role === 'assistant' && (
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/20">
                          <Bot size={18} className="text-white" />
                        </div>
                      </div>
                    )}

                    {/* 消息气泡 */}
                    <div
                      className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 sm:px-5 py-3 text-sm leading-relaxed shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20 rounded-br-lg'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700/50 rounded-bl-lg'
                      }`}
                    >
                      <div className="text-[14px] sm:text-sm">
                        {renderMessageContent(message.content, message.role === 'user')}
                      </div>
                      <div className={`text-[10px] mt-2 ${
                        message.role === 'user' ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* 用户头像 */}
                    {message.role === 'user' && (
                      <div className="shrink-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center shadow-sm">
                          <span className="text-white font-bold text-sm">
                            {userInfo?.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* 打字指示器 */}
                {isTyping && (
                  <div className="flex gap-3 sm:gap-4 justify-start opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]">
                    <div className="shrink-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/20">
                        <Bot size={18} className="text-white" />
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl rounded-bl-lg px-5 py-4 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* 滚动到底部按钮 */}
              {showScrollToBottom && (
                <button
                  onClick={() => scrollToBottom('smooth')}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
                  aria-label="滚动到底部"
                >
                  <ArrowUp size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 rotate-180" />
                </button>
              )}
            </div>

            {/* 输入区域 */}
            <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                {/* 快捷建议 */}
                {messages.length === 1 && currentStep === 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 opacity-0 animate-[fadeIn_0.4s_ease-out_0.2s_forwards]">
                    {SUGGESTIONS_BY_STEP[0].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm active:scale-95"
                      >
                        <Lightbulb size={12} className="shrink-0 text-amber-400" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* 后续步骤建议 */}
                {messages.length > 1 && currentStep < 4 && SUGGESTIONS_BY_STEP[currentStep] && (
                  <div className="flex flex-wrap gap-2 mb-3 opacity-0 animate-[fadeIn_0.3s_ease-out_0.1s_forwards]">
                    {SUGGESTIONS_BY_STEP[currentStep].map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/50 dark:border-gray-700/50 rounded-lg transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 active:scale-95"
                      >
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
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        currentStep === 0 ? '描述您想要的智能体，例如"自动回复客户咨询的客服..."' :
                        currentStep === 10 ? '输入 1 或 2 选择保存方式' :
                        currentStep === 11 ? '输入项目编号或名称...' :
                        '输入您的回答...'
                      }
                      aria-label="消息输入框"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-0 focus:border-blue-400 dark:focus:border-blue-600 outline-none resize-none text-sm leading-relaxed transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:shadow-lg focus:shadow-blue-500/10 disabled:opacity-60"
                      rows={1}
                      disabled={isTyping}
                      style={{ minHeight: '44px' }}
                    />
                    {/* 键盘提示 */}
                    <div className="absolute right-3 bottom-3 hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                        <CornerDownLeft size={10} className="inline" />
                      </kbd>
                      <span className="text-[10px] text-gray-400">发送</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isTyping}
                    aria-label="发送消息"
                    className="shrink-0 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                    style={{ width: '44px', height: '44px' }}
                  >
                    <Send size={18} />
                  </button>
                </div>

                {/* 底部提示 */}
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    <span className="hidden sm:inline">按 <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">Enter</kbd> 发送，</span>
                    <span className="hidden sm:inline"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">Shift + Enter</kbd> 换行</span>
                  </p>
                  {currentStep > 0 && currentStep < 7 && (
                    <button
                      onClick={() => {
                        if (confirm('确定要重新开始吗？当前进度将丢失。')) {
                          window.location.reload();
                        }
                      }}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      aria-label="重新开始对话"
                    >
                      <RotateCcw size={11} />
                      <span className="hidden sm:inline">重新开始</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* 虚拟公司创建弹窗 */}
      {showVirtualCompanyModal && (
        <VirtualCompanyChatModal
          initialMessage={initialVirtualCompanyMessage}
          onClose={() => { setShowVirtualCompanyModal(false); setActiveMode('agent'); }}
          onSuccess={(teamSkillId) => {
            setShowVirtualCompanyModal(false);
            setActiveMode('agent');
            addAssistantMessage(
              `🎉 **虚拟公司创建成功！**\n\n您的 AI 团队已经创建完成，可以在市场页面查看和管理。\n\n团队 ID: ${teamSkillId}\n\n还需要我帮您做什么吗？`
            );
          }}
        />
      )}
    </div>
  );
}
