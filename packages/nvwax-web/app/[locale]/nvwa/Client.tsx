'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, Sparkles, Loader, RotateCcw, Lightbulb, Zap, Database, FileText, Cpu, Check, AlertCircle, CornerDownLeft, ArrowUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AiTeamCreatorModal from '@/components/aiteam-creator-modal';
import { useTranslations } from 'next-intl';

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
const SUGGESTION_KEYS: Record<number, string[]> = {
  0: ['suggestion1', 'suggestion2', 'suggestion3', 'suggestion4'],
  1: ['suggestion5', 'suggestion6', 'suggestion7', 'suggestion8'],
  2: ['suggestion9', 'suggestion10', 'suggestion11', 'suggestion12'],
  3: ['suggestion13', 'suggestion14', 'suggestion15', 'suggestion16'],
};

/** 步骤配置 */
const STEP_CONFIG_META = [
  { icon: Lightbulb, stepKey: 'stepAnalysis', color: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-100 dark:bg-amber-900/20', textColor: 'text-amber-600 dark:text-amber-400' },
  { icon: Database, stepKey: 'stepDataSource', color: 'from-emerald-500 to-teal-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/20', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { icon: FileText, stepKey: 'stepOutput', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/20', textColor: 'text-blue-600 dark:text-blue-400' },
  { icon: Cpu, stepKey: 'stepImpl', color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-100 dark:bg-blue-900/20', textColor: 'text-blue-600 dark:text-blue-400' },
  { icon: Zap, stepKey: 'stepTemplate', color: 'from-pink-500 to-rose-500', bgColor: 'bg-pink-100 dark:bg-pink-900/20', textColor: 'text-pink-600 dark:text-pink-400' },
  { icon: Sparkles, stepKey: 'stepReview', color: 'from-indigo-500 to-blue-500', bgColor: 'bg-indigo-100 dark:bg-indigo-900/20', textColor: 'text-indigo-600 dark:text-indigo-400' },
  { icon: Check, stepKey: 'stepSave', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-100 dark:bg-green-900/20', textColor: 'text-green-600 dark:text-green-400' },
];

export default function NvwaClient() {
  const t = useTranslations('nvwa');
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

  // 跨服务认证完成后，自动打开 AiTeam 创建弹窗（但需等待登录状态稳定）
  const [authReadyForModal, setAuthReadyForModal] = useState(false);
  useEffect(() => {
    if (crossAuthHandled && externalRequirements && !authLoading) {
      // 给一点时间让 auth state 稳定
      const timer = setTimeout(() => setAuthReadyForModal(true), 300);
      return () => clearTimeout(timer);
    }
  }, [crossAuthHandled, externalRequirements, authLoading]);

  // 构建带额外上下文的初始消息
  const initialAiTeamMessage = externalRequirements
    ? [
        externalRequirements,
        externalTeamName ? `\n${t('teamNameLabel')}：${externalTeamName}` : '',
        externalCategory ? `\n${t('categoryLabel')}：${externalCategory}` : '',
        externalTags ? `\n${t('tagsLabel')}：${externalTags}` : '',
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
  const [showAiTeamModal, setShowAiTeamModal] = useState(false);
  const [progress, setProgress] = useState<CreationProgress>({
    currentStep: 0,
    totalSteps: 7,
    percentage: 0,
    steps: [
      { stepNumber: 1, name: t('stepAnalysis'), status: 'pending', message: t('waiting') },
      { stepNumber: 2, name: t('stepDataSource'), status: 'pending', message: t('waiting') },
      { stepNumber: 3, name: t('stepOutput'), status: 'pending', message: t('waiting') },
      { stepNumber: 4, name: t('stepImpl'), status: 'pending', message: t('waiting') },
      { stepNumber: 5, name: t('stepTemplate'), status: 'pending', message: t('waiting') },
      { stepNumber: 6, name: t('stepReview'), status: 'pending', message: t('waiting') },
      { stepNumber: 7, name: t('stepSave'), status: 'pending', message: t('waiting') }
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
      content: t('welcomeMessage'),
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // 从 ProClaw 等外部来源跳转时，自动打开 AiTeam 创建弹窗（等待跨服务认证完成）
  useEffect(() => {
    if (externalRequirements) {
      // 延迟打开，确保页面已完全渲染
      const timer = setTimeout(() => {
        setActiveMode('aiteam');
        setShowAiTeamModal(true);
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
          return { ...step, status: 'completed' as const, message: t('completed') };
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
      return { reviewPassed: true, issues: [t('reviewServiceUnavailable')], suggestions: [t('checkManual')], confidence: 0.5 };
    }
  };

  // Step 5-6: 技能分析和配置审查
  const executeSkillAnalysisAndReview = async () => {
      updateProgress(5, 'in_progress', t('analyzingSkills'));

      setFormData(prev => ({
        ...prev,
        skills: [t('skillNlp'), t('skillKb'), t('skillDialog')]
      }));

      addAssistantMessage(
        t('aiSkillAnalysis')
      );

      setTimeout(async () => {
        const updatedSkills = [t('skillNlp'), t('skillKb'), t('skillDialog'), t('skillOrderConnector'), t('skillRealtimeSync')];
        setFormData(prev => ({ ...prev, skills: updatedSkills }));

        addAssistantMessage(
          t('aiSkillSearchResult')
        );

        try {
          const currentConfig = {
            name: formData.name || formData.description || t('defaultAgentName'),
            description: formData.description,
            dataSources: formData.dataSources,
            outputs: formData.outputs,
            implementation: formData.implementation,
            skills: updatedSkills
          };

          const reviewResult = await reviewAgentConfig(currentConfig);

          if (reviewResult.reviewPassed) {
            updateProgress(5, 'completed', t('reviewPassed'));
            let suggestionsText = '';
            if (reviewResult.suggestions?.length > 0) {
              suggestionsText = `\n\n💡 **${t('optimizationSuggestions')}：**\n${reviewResult.suggestions.map((s: string) => `- ${s}`).join('\n')}`;
            }
            addAssistantMessage(
              t('aiReviewPassed', { confidence: (reviewResult.confidence * 100).toFixed(0), suggestionsText, name: currentConfig.name, dataSources: currentConfig.dataSources.join(', '), outputs: currentConfig.outputs.join(', '), implementation: currentConfig.implementation, skills: currentConfig.skills.join(' + ') })
            );
          } else {
            updateProgress(5, 'failed', t('reviewFailed'));
            const issuesText = reviewResult.issues.map((issue: string) => `- ${issue}`).join('\n');
            const suggestionsText = reviewResult.suggestions.map((s: string) => `- ${s}`).join('\n');
            addAssistantMessage(
              t('aiReviewFailed', { issuesText, suggestionsText })
            );
          }
        } catch {
          updateProgress(5, 'failed', t('reviewError'));
          addAssistantMessage(
            t('aiReviewError')
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
    const teamKeywords = ['团队', 'team', 'AiTeam', 'aiteam', 'ai团队', 'ai team', '多agent', 'multi-agent', '协作', 'collaboration'];   
    const isTeamRequest = teamKeywords.some(keyword => input.toLowerCase().includes(keyword));

    if (isTeamRequest && currentStep === 0) {
      addAssistantMessage(
        t('aiTeamRequestRedirect')
      );
      setTimeout(() => setShowAiTeamModal(true), 1500);
      return;
    }

    switch (currentStep) {
      case 0:
        setFormData(prev => ({ ...prev, description: input }));
        updateProgress(1, 'completed', t('progressReq', { input: input.substring(0, 20) }));
        setCurrentStep(1);
        addAssistantMessage(t('aiResponseStep0', { input: input.substring(0, 20) }));
        break;

      case 1:
        setFormData(prev => ({ ...prev, dataSources: [input] }));
        updateProgress(2, 'completed', t('progressDataSource', { input }));
        setCurrentStep(2);
        addAssistantMessage(t('aiResponseStep1', { input }));
        break;

      case 2:
        setFormData(prev => ({ ...prev, outputs: [input] }));
        updateProgress(3, 'completed', t('progressOutput', { input }));
        setCurrentStep(3);
        addAssistantMessage(t('aiResponseStep2', { input }));
        break;

      case 3:
        setFormData(prev => ({ ...prev, implementation: input }));
        setCurrentStep(4);
        updateProgress(4, 'in_progress', t('searchingTemplates'));
        addAssistantMessage(t('aiResponseStep3'));
        addAssistantMessage(`🔍 ${t('aiResponseStep3Search')}`);

        try {
          const templates = await searchTemplates(formData.description, input);
          if (templates && templates.length > 0) {
            updateProgress(4, 'completed', t('foundTemplates', { count: templates.length }));
            const templateList = templates.map((tmpl: TemplateResult, i: number) => {
              const name = String(tmpl.name || tmpl.title || t('unnamedTemplate'));
              const rating = tmpl.rating ? String(tmpl.rating) : 'N/A';
              const matchScore = tmpl.matchScore ? String(tmpl.matchScore) : 'N/A';
              const skills = Array.isArray(tmpl.skills) ? tmpl.skills.map(s => String(s)).join(', ') : t('none');
              return `${i + 1}. **${name}** ${t('templateRating', { rating, matchScore })}
   - ${t('skills')}：${skills}`;
            }).join('\n\n');
            addAssistantMessage(t('foundTemplatesMsg', { count: templates.length, list: templateList }));
          } else {
            updateProgress(4, 'completed', t('noTemplates'));
            addAssistantMessage(t('noTemplatesMsg'));
          }
        } catch {
          updateProgress(4, 'failed', t('searchFailed'));
          addAssistantMessage(t('searchFailedMsg'));
        }

        await executeSkillAnalysisAndReview();
        break;

      case 4:
        setCurrentStep(5);
        updateProgress(5, 'in_progress', t('analyzingSkills'));
        setFormData(prev => ({ ...prev, skills: [t('skillNlp'), t('skillKb'), t('skillDialog')] }));
        addAssistantMessage(
          t('aiSkillAnalysis')
        );

        setTimeout(async () => {
          const updatedSkills = [t('skillNlp'), t('skillKb'), t('skillDialog'), t('skillOrderConnector'), t('skillRealtimeSync')];
          setFormData(prev => ({ ...prev, skills: updatedSkills }));
          addAssistantMessage(
            t('aiSkillSearchResult')
          );

          try {
            const currentConfig = {
              name: formData.name || formData.description || t('defaultAgentName'),
              description: formData.description,
              dataSources: formData.dataSources,
              outputs: formData.outputs,
              implementation: formData.implementation,
              skills: updatedSkills
            };
            const reviewResult = await reviewAgentConfig(currentConfig);

            if (reviewResult.reviewPassed) {
              updateProgress(5, 'completed', t('reviewPassed'));
              let suggestionsText = '';
              if (reviewResult.suggestions?.length > 0) {
                suggestionsText = `\n\n💡 **${t('optimizationSuggestions')}：**\n${reviewResult.suggestions.map((s: string) => `- ${s}`).join('\n')}`;
              }
              addAssistantMessage(
                t('aiReviewPassed', { confidence: (reviewResult.confidence * 100).toFixed(0), suggestionsText, name: currentConfig.name, dataSources: currentConfig.dataSources.join(', '), outputs: currentConfig.outputs.join(', '), implementation: currentConfig.implementation, skills: currentConfig.skills.join(' + ') })
              );
            } else {
              updateProgress(5, 'failed', t('reviewFailed'));
              const issuesText = reviewResult.issues.map((issue: string) => `- ${issue}`).join('\n');
              const suggestionsText = reviewResult.suggestions.map((s: string) => `- ${s}`).join('\n');
              addAssistantMessage(
                t('aiReviewFailed', { issuesText, suggestionsText })
              );
            }
          } catch {
            updateProgress(5, 'failed', t('reviewError'));
            addAssistantMessage(
              t('aiReviewError')
            );
          }
          setCurrentStep(6);
        }, 1500);
        break;

      case 5:
      case 6:
        if (input.includes('确认') || input.includes('是') || input.toLowerCase().includes('yes')) {
          updateProgress(6, 'completed', t('configConfirmed'));
          if (!isLoggedIn) {
            addAssistantMessage(
              t('aiNeedLogin')
            );
          } else {
            updateProgress(7, 'in_progress', t('savingConfig'));
            addAssistantMessage(
              t('aiSaveOptions')
            );
            setCurrentStep(10); // 保存方式选择
          }
        } else {
          addAssistantMessage(t('aiRetryOptions'));
        }
        break;

      case 10:
        if (input === '1' || input.includes('项目')) {
          addAssistantMessage(
            t('aiSelectProject')
          );
          setCurrentStep(11);
        } else if (input === '2' || input.includes('个人')) {
          updateProgress(7, 'completed', t('savedToPersonal'));
          addAssistantMessage(
            t('aiSavedPersonal', { name: formData.description || t('defaultAgentName') })
          );
          setCurrentStep(7);
        } else {
          addAssistantMessage(t('aiSavePrompt'));
        }
        break;

      case 11: {
        const selectedProject =
          input === '1' ? t('projectEcommerce') :
          input === '2' ? t('projectDataPlatform') :
          input === '3' ? t('projectCMS') : input;
        updateProgress(7, 'completed', t('savedToProject', { project: selectedProject }));
        addAssistantMessage(
          t('aiSavedProject', { name: formData.description || t('defaultAgentName'), project: selectedProject })
        );
        setCurrentStep(7);
        break;
      }

      default:
        addAssistantMessage(t('aiDefaultResponse'));
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
        <div className="absolute inset-0 bg-linear-to-r from-blue-500/5 via-blue-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-blue-500/10 dark:to-pink-500/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-linear-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative group">
                <div className="absolute inset-0 bg-linear-to-r from-blue-500 to-blue-700 rounded-2xl blur-md opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-linear-to-br from-blue-500 via-indigo-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Sparkles size={20} className="text-white animate-pulse" />
                </div>
              </div>
            </div>

            {/* 居中：模式切换器 */}
            <div className="flex-1 flex justify-center">
              <div className="inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-inner">
                {/* Nvwa Agent */}
                <button
                  onClick={() => { setActiveMode('agent'); setShowAiTeamModal(false); }}
                  className={`relative flex items-center gap-2 px-4 sm:px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    activeMode === 'agent'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    activeMode === 'agent'
                      ? 'bg-linear-to-br from-blue-500 to-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  }`}>
                    🤖
                  </span>
                  <span className="hidden sm:inline">Nvwa Agent</span>
                  <span className="sm:hidden text-xs">Agent</span>
                </button>

                {/* NvwaX Aiteam */}
                <button
                  onClick={() => { setActiveMode('aiteam'); setShowAiTeamModal(true); }}
                  className={`relative flex items-center gap-2 px-4 sm:px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    activeMode === 'aiteam'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    activeMode === 'aiteam'
                      ? 'bg-linear-to-br from-blue-600 to-blue-700 text-white'
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
            <div className="flex items-center gap-2 shrink-0">
              {activeMode === 'agent' && currentStep > 0 && currentStep < 7 && (
                <button
                  onClick={() => {
                    if (confirm(t('restartConfirm'))) {
                      window.location.reload();
                    }
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200"
                  aria-label="重新开始"
                >
                  <RotateCcw size={15} />
                  <span>{t('restart')}</span>
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
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('requirementInfo')}</h3>
              </div>

              {(!formData.name && !formData.description && formData.dataSources.length === 0) ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                    <Lightbulb className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('requirementPlaceholder').split('<br/>').map((l, i) => <span key={i}>{i > 0 && <br/>}{l}</span>)}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.description && (
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      <label className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">{t('purposeLabel')}</label>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 leading-relaxed">{formData.description}</p>
                    </div>
                  )}
                  {formData.dataSources.length > 0 && (
                    <div>
                      <label className="text-[11px] font-semibold text-green-500 dark:text-green-400 uppercase tracking-wider">{t('dataSourcesLabel')}</label>
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
                      <label className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">{t('outputTypeLabel')}</label>
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
                      <label className="text-[11px] font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider">{t('implementationLabel')}</label>
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
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('selectedSkills')}</h3>
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
                      <div className="shrink-0 w-7 h-7 rounded-lg bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
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
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('skillsPlaceholder')}</p>
                </div>
              )}
            </div>

            {/* 创建进度 */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                  <Loader className={`w-4 h-4 text-indigo-600 dark:text-indigo-400 ${progress.percentage > 0 && progress.percentage < 100 ? 'animate-spin' : ''}`} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('creationProgress')}</h3>
                <span className="ml-auto text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {progress.percentage}%
                </span>
              </div>

              {/* 进度条 */}
              <div className="mb-5">
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-indigo-500 via-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out shadow-sm shadow-indigo-500/25"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>

              {/* 步骤列表 */}
              <div className="space-y-1.5">
                {progress.steps.map((step, idx) => {
                  const meta = STEP_CONFIG_META[idx];
                  const StepIcon = meta.icon;
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
                        `bg-gray-100 dark:bg-gray-700 text-gray-400 ${meta.textColor} group-hover:bg-gray-200 dark:group-hover:bg-gray-600`
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
                      className="h-full bg-linear-to-r from-indigo-500 to-blue-600 rounded-full transition-all duration-500"
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
              aria-label={t('chatLog')}
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
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-linear-to-br from-blue-500 via-indigo-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/20">
                          <Bot size={18} className="text-white" />
                        </div>
                      </div>
                    )}

                    {/* 消息气泡 */}
                    <div
                      className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 sm:px-5 py-3 text-sm leading-relaxed shadow-sm ${
                        message.role === 'user'
                          ? 'bg-linear-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20 rounded-br-lg'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700/50 rounded-bl-lg'
                      }`}
                    >
                      <div className="text-[14px] sm:text-sm">
                        {renderMessageContent(message.content, message.role === 'user')}
                      </div>
                      <div className={`text-[10px] mt-2 ${
                        message.role === 'user' ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* 用户头像 */}
                    {message.role === 'user' && (
                      <div className="shrink-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-linear-to-br from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center shadow-sm">
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
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/20">
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
                  aria-label={t('scrollToBottom')}
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
                    {SUGGESTION_KEYS[0].map((key, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(t(key))}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm active:scale-95"
                                              >
                                                <Lightbulb size={12} className="shrink-0 text-amber-400" />
                                                {t(key)}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                        
                                        {/* 后续步骤建议 */}
                                        {messages.length > 1 && currentStep < 4 && SUGGESTION_KEYS[currentStep] && (
                                          <div className="flex flex-wrap gap-2 mb-3 opacity-0 animate-[fadeIn_0.3s_ease-out_0.1s_forwards]">
                                            {SUGGESTION_KEYS[currentStep].map((key, idx) => (
                                              <button
                                                key={idx}
                                                onClick={() => handleSuggestionClick(t(key))}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/50 dark:border-gray-700/50 rounded-lg transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 active:scale-95"
                                              >
                                                {t(key)}
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
                                                currentStep === 0 ? t('placeholderStep0') :
                                                currentStep === 10 ? t('placeholderStep10') :
                                                currentStep === 11 ? t('placeholderStep11') :
                                                t('placeholderDefault')
                                              }
                                              aria-label={t('messageInput')}
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
                                              <span className="text-[10px] text-gray-400">{t('send')}</span>
                                            </div>
                                          </div>
                        
                                          <button
                                            onClick={handleSendMessage}
                                            disabled={!inputValue.trim() || isTyping}
                                            aria-label={t('sendMessage')}
                                            className="shrink-0 p-3 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                                            style={{ width: '44px', height: '44px' }}
                                          >
                                            <Send size={18} />
                                          </button>
                                        </div>
                        
                                        {/* 底部提示 */}
                                        <div className="flex items-center justify-between mt-2 px-1">
                                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                            <span className="hidden sm:inline">{t.rich('keyboardHint', { enter: () => <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">Enter</kbd>, shiftEnter: () => <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">Shift + Enter</kbd> })}</span>
                                          </p>
                                          {currentStep > 0 && currentStep < 7 && (
                                            <button
                                              onClick={() => {
                                                if (confirm(t('restartConfirm'))) {
                                                  window.location.reload();
                                                }
                                              }}
                                              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                              aria-label={t('restartChat')}
                                            >
                                              <RotateCcw size={11} />
                                              <span className="hidden sm:inline">{t('restart')}</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </section>
                                </div>
                              </main>
                        
                              {/* AiTeam 创建弹窗 */}
                              {showAiTeamModal && (
                                <AiTeamCreatorModal
                                  initialMessage={initialAiTeamMessage}
                                  onClose={() => { setShowAiTeamModal(false); setActiveMode('agent'); }}
                                  onSuccess={(teamSkillId) => {
                                    setShowAiTeamModal(false);
                                    setActiveMode('agent');
                                    addAssistantMessage(
                                      t('aiTeamSuccess', { teamId: teamSkillId })
                                    );
                                  }}
                                />
                              )}
                            </div>
                          );
                        }