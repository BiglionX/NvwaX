'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Loader2, Bot, CheckCircle, AlertCircle, Share2 } from 'lucide-react';
import { useAiTeamCreationProgress } from '@/hooks/use-aiteam-creation-progress';
import CEOConfigPreview from './CEOConfigPreview';
import DocumentPackagePreview from './DocumentPackagePreview';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { authedFetch } from '@/lib/oidc/authed-fetch';
import StepProgress from '@/components/creation/StepProgress';
import ChatMessage, { ChatMessageData } from '@/components/creation/ChatMessage';
import ChatInput from '@/components/creation/ChatInput';
import CreateSuccessDialog, { SuccessData } from '@/components/creation/CreateSuccessDialog';
import type { ExportFormatType } from '@/components/ExportModal';

interface AiTeamCreatorModalProps {
  onClose: () => void;
  onSuccess: (teamSkillId: string) => void;
  /** 外部注入的初始需求描述（如从 ProClaw 跳转带入） */
  initialMessage?: string;
  /** 页内嵌入模式（/nvwa 页面内使用），默认 false 为弹窗模式（agent-repository 使用） */
  embedded?: boolean;
}

interface AiTeamMessage extends ChatMessageData {
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
  nextStep?: string;
  showConfirmButton?: boolean;
  downloadUrl?: string;
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

export default function AiTeamCreatorModal({ onClose, initialMessage, embedded = false }: AiTeamCreatorModalProps) {
  const t = useTranslations('vcChatModal');
  const locale = useLocale();
  const { isLoggedIn, login } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiTeamMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareContent, setShareContent] = useState({ title: '', content: '', url: '' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [autoPublishToMarketplace, setAutoPublishToMarketplace] = useState(true); // 默认勾选自动发布
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 使用 SSE Hook 追踪进度
  const { progress } = useAiTeamCreationProgress(sessionId, {
    autoReconnect: true,
    maxRetries: 3,
    retryDelay: 2000
  });

  // 进度步骤定义
  const progressSteps = progress?.steps || [
    { stepNumber: 1, name: t('step1Name'), status: 'pending' as const, message: t('stepWaiting') },
    { stepNumber: 2, name: t('step2Name'), status: 'pending' as const, message: t('stepWaiting') },
    { stepNumber: 3, name: t('step3Name'), status: 'pending' as const, message: t('stepWaiting') },
    { stepNumber: 4, name: t('step4Name'), status: 'pending' as const, message: t('stepWaiting') },
    { stepNumber: 5, name: t('step5Name'), status: 'pending' as const, message: t('stepWaiting') },
    { stepNumber: 6, name: t('step6Name'), status: 'pending' as const, message: t('stepWaiting') },
    { stepNumber: 7, name: t('step7Name'), status: 'pending' as const, message: t('stepWaiting') }
  ];

  const currentProgress = progress || { percentage: 0 };

  // 初始化会话：
  // - 未登录 → 游客模式（本地模拟会话，可先体验完整流程）
  // - 登录后（含游客模式切到登录）→ 创建真实会话；保留游客聊过的需求，自动补发到真实会话
  const guestRequirementsRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setSessionId('guest');
      const welcomeMessage: AiTeamMessage = {
        id: 'welcome',
        role: 'nvwax_agent',
        content: t('welcomeMessage'),
        timestamp: new Date(),
        phase: 'requirements_gathering'
      };
      setMessages([welcomeMessage]);

      // 外部跳转带入的需求，在游客模式也自动发送
      if (initialMessage) {
        guestRequirementsRef.current = initialMessage;
        setTimeout(() => {
          sendMessageContent(initialMessage);
        }, 1200);
      }
      return;
    }

    // 游客模式切到登录：保留游客消息展示，真实会话自动补发需求
    const guestReq = guestRequirementsRef.current;
    if (guestReq) {
      guestRequirementsRef.current = null;
      createSession(guestReq);
    } else {
      createSession();
    }
  }, [isLoggedIn]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createSession = async (initialReq?: string) => {
    try {
      // Sprint 2.2: 走 authedFetch（OIDC cookie 由 /api/auth/proxy 注入 Authorization）
      const response = await authedFetch('/aiteam-creation/sessions', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Session 过期或无效，提示重新登录
          addSystemMessage(t('tokenExpired'));
          console.warn('Session expired or invalid');
          return;
        }
        throw new Error(data.error?.message || data.error || t('sessionCreateError'));
      }

      if (!data.success) {
        throw new Error(data.error?.message || data.error || t('sessionCreateError'));
      }

      setSessionId(data.data.id);
      // session 数据现在通过 SSE hook 自动更新

      // 添加 NvwaX Agent 的欢迎消息
      const welcomeMessage: AiTeamMessage = {
        id: 'welcome',
        role: 'nvwax_agent',
        content: t('welcomeMessage'),
        timestamp: new Date(),
        phase: 'requirements_gathering'
      };
      setMessages((prev) => {
        // 登录衔接：若保留着游客消息（且未重复），保留之；否则从欢迎消息开始
        const hasWelcome = prev.some((m) => m.id === 'welcome');
        return hasWelcome ? prev : [welcomeMessage];
      });

      // 如果有外部注入/游客带入的初始需求，自动发送
      const req = initialReq || initialMessage;
      if (req) {
        setTimeout(() => {
          sendMessageContent(req);
        }, 1200);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      addSystemMessage(t('sessionError'));
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isSending) return;
    const content = inputMessage.trim();
    setInputMessage('');
    await sendMessageContent(content);
  };

  /** 以编程方式发送消息（不依赖 inputMessage state） */
  const sendMessageContent = useCallback(async (content: string) => {
    if (!sessionId || isSending) return;

    const userMessage: AiTeamMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);

    // ── 游客模式：本地模拟回复（与 Agent 模式一致的"先玩后登录"体验） ──
    if (sessionId === 'guest') {
      setTimeout(() => {
        const guestReply: AiTeamMessage = {
          id: `guest-${Date.now()}`,
          role: 'nvwax_agent',
          content: t('guestReply'),
          timestamp: new Date(),
          phase: 'requirements_gathering',
          recommendedRoles: [
            { roleName: '🎯 团队负责人 (Leader)', description: '统筹全局，制定策略并协调团队成员' },
            { roleName: '💼 业务分析师 (Analyst)', description: '分析需求，拆解任务与交付物' },
            { roleName: '🛠️ 执行专员 (Specialist)', description: '执行具体任务，产出成果' },
          ],
        };
        setMessages(prev => [...prev, guestReply]);
        setIsSending(false);
        // 试用模式下也展示"确认保存"按钮（点击后触发登录）
        setTimeout(() => {
          const guestConfirm: AiTeamMessage = {
            id: `guest-confirm-${Date.now()}`,
            role: 'nvwax_agent',
            content: t('matchReadyToSave'),
            timestamp: new Date(),
            phase: 'confirming',
            showConfirmButton: true,
          };
          setMessages(prev => [...prev, guestConfirm]);
        }, 1000);
      }, 800);
      return;
    }

    try {
      const response = await authedFetch(`/aiteam-creation/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage.content }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('sendMessageError'));
      }

      // 添加 NvwaX Agent 回复
      const nvwaxMessage: AiTeamMessage = {
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
        setTimeout(() => triggerNvwaXMatch(), 1000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addSystemMessage(t('sendError'));
    } finally {
      setIsSending(false);
    }
  }, [sessionId, isSending, t]);

  /**
   * 触发 NvwaX 完整匹配流程
   */
  const triggerNvwaXMatch = async () => {
    if (!sessionId) return;

    try {
      // 添加系统消息
      const systemMessage: AiTeamMessage = {
        id: `system-match-${Date.now()}`,
        role: 'nvwax_agent',
        content: t('matchSearching'),
        timestamp: new Date(),
        phase: 'agent_matching'
      };
      setMessages(prev => [...prev, systemMessage]);

      const response = await authedFetch(`/aiteam-creation/sessions/${sessionId}/nvwax-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('triggerMatchError'));
      }

      // 添加完成消息
      const agentMatches = data.data.agentMatches || {};
      const skillMatches = data.data.skillMatches || {};
      const ceoConfig = data.data.ceoConfig;
      const agentCount = Object.values(agentMatches).flat().length;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const skillCount = Object.values(skillMatches).filter((s: any) => s.status === 'found').length;

      let content = t('matchComplete', { agentCount, skillCount });

      if (ceoConfig) {
        content += t('matchConfigGenerated', { templateName: ceoConfig.templateName, managementStyle: ceoConfig.managementStyle, skillCount: ceoConfig.skills.length });
      }

      content += t('matchReadyToSave');

      const completeMessage: AiTeamMessage = {
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
      const errorMessage: AiTeamMessage = {
        id: `system-match-error-${Date.now()}`,
        role: 'nvwax_agent',
        content: t('matchError'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const addSystemMessage = (content: string) => {
    const systemMessage: AiTeamMessage = {
      id: `system-${Date.now()}`,
      role: 'nvwax_agent',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  /**
   * 确认并保存团队到用户中心
   * 游客模式下点击确认 → 触发 OIDC 登录（登录后由 useEffect 自动创建真实会话，用户可重新确认保存）
   */
  const handleConfirmAndSave = async () => {
    if (!isLoggedIn || !sessionId || sessionId === 'guest') {
      addSystemMessage(t('loginRequired'));
      await login('/nvwa');
      return;
    }

    setIsConfirming(true);

    try {
      const authedHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Step 1: 确认并保存团队（Sprint 2.3: 走 authedFetch）
      const response = await authedFetch(`/aiteam-creation/sessions/${sessionId}/confirm`, {
        method: 'POST',
        headers: authedHeaders,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('saveFailed'));
      }

      // Step 2: 如果勾选了自动发布，则发布到市场
      let publishResult = null;
      if (autoPublishToMarketplace && sessionId) {
        try {
          const publishResponse = await authedFetch(`/aiteam-creation/sessions/${sessionId}/publish-to-marketplace`, {
            method: 'POST',
            headers: authedHeaders,
          });

          const publishData = await publishResponse.json();

          if (publishResponse.ok && publishData.success) {
            publishResult = publishData.data;
          } else {
            console.warn('⚠️ Auto-publish failed:', publishData.error);
          }
        } catch (publishError) {
          console.error('Error auto-publishing:', publishError);
          // 不阻断流程，继续显示成功消息
        }
      }

      // 设置成功数据并显示弹窗（不再在对话中显示按钮）
      setSuccessData({
        downloadUrl: data.data.downloadUrl,
        // "创建即入仓库"：confirm 返回的 aiteamId 供后续导出/管理
        aiteamId: data.data.aiteamId || null,
        documentPackage: data.data.documentPackage
      });
      setShowSuccessModal(true);

      // 添加成功消息（包含发布状态）
      let successContent = t('successSaved');

      if (autoPublishToMarketplace && publishResult) {
        successContent += t('successPublished');
      } else if (autoPublishToMarketplace && !publishResult) {
        successContent += t('successPublishFailed');
      }

      const successMessage: AiTeamMessage = {
        id: `system-confirm-success-${Date.now()}`,
        role: 'nvwax_agent',
        content: successContent,
        timestamp: new Date(),
        documentPackage: data.data.documentPackage
      };
      setMessages(prev => [...prev, successMessage]);
    } catch (error) {
      console.error('Error confirming and saving team:', error);
      const errorMessage: AiTeamMessage = {
        id: `system-confirm-error-${Date.now()}`,
        role: 'nvwax_agent',
        content: t('saveFailed'),
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
      const response = await authedFetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Download failed');
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
    } catch (error) {
      console.error('Error downloading document package:', error);
      alert(t('downloadFailed'));
    }
  };

  /**
   * 集成到ProClaw
   *
   * 真实实现（Sprint 2.13）：
   * 1. 调用 POST /api/aiteam-creation/sessions/:id/integrate-proclaw
   *    服务端会生成符合 schema 的 .nvwax-vc.json 导出包（详见
   *    docs/integration/virtual-company-package.schema.json），
   *    写入临时目录，返回 { packageId, downloadUrl, checksum }
   * 2. 自动触发浏览器下载 .nvwax-vc.json
   * 3. 在对话中提示用户：
   *    - 方案 A：直接把下载好的文件拖入 ProClaw「导入团队」页面
   *    - 方案 B：复制 downloadUrl 在 ProClaw 内粘贴（适合远程 NvwaX + 本地 ProClaw 的场景）
   */
  const handleIntegrateToProClaw = async (teamSessionId: string) => {
    try {
      // Sprint 2.3: 走 authedFetch（OIDC cookie 由 /api/auth/proxy 注入 Authorization）
      const response = await authedFetch(`/aiteam-creation/sessions/${teamSessionId}/integrate-proclaw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('integrateFailed'));
      }

      const { packageId, downloadUrl, checksum, teamName, agentsCount } = data.data;

      // 自动触发下载 .nvwax-vc.json
      // downloadUrl 形如 /api/aiteam-creation/packages/<uuid>/download
      try {
        const downloadResp = await authedFetch(downloadUrl, { method: 'GET' });
        if (downloadResp.ok) {
          const blob = await downloadResp.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `virtual-company-${teamName || packageId}.nvwax-vc.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(blobUrl);
        }
      } catch (downloadErr) {
        console.warn('[integrateToProClaw] 自动下载失败（用户可手动使用链接）:', downloadErr);
      }

      // 拼出可在 ProClaw 中粘贴的完整 URL（基于当前 origin）
      const fullDownloadUrl = `${window.location.origin}${downloadUrl}`;

      const successMessage: AiTeamMessage = {
        id: `system-integrate-success-${Date.now()}`,
        role: 'nvwax_agent',
        content:
          `✅ 团队「${teamName || data.data.proclawTeamId}」已生成 ProClaw 导出包（${agentsCount} 个 Agent）。\n\n` +
          `**方式 A（推荐）**：文件已开始自动下载，把下载好的 .nvwax-vc.json 文件拖入 ProClaw「虚拟公司 → 导入团队」页面即可。\n\n` +
          `**方式 B（适合远程 NvwaX）**：复制下面的链接，在 ProClaw「导入团队」页面粘贴即可：\n\n` +
          `\`${fullDownloadUrl}\`\n\n` +
          `包 ID：\`${packageId}\`\n` +
          `校验和：\`${checksum}\``,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, successMessage]);
    } catch (error) {
      console.error('Error integrating to ProClaw:', error);
      const errorMessage: AiTeamMessage = {
        id: `system-integrate-error-${Date.now()}`,
        role: 'nvwax_agent',
        content: t('integrateFailed'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  /**
   * 多壳落地导出（Sprint 新增）
   *
   * 用户在创建成功弹窗选择"落地方式"后触发：
   * - 优先：若 confirm 已返回 aiteamId（"创建即入仓库"）→ 走标准 /aiteams/:id/export
   * - 兜底：走 session-based 导出 POST /api/aiteam-creation/sessions/:id/export
   * - 触发浏览器下载
   */
  const handleExportToShell = async (format: ExportFormatType) => {
    // 优先走标准 aiteam 导出（Agent 仓库同款 API）
    if (successData?.aiteamId) {
      try {
        const response = await authedFetch(`/aiteams/${successData.aiteamId}/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error?.message || '导出失败');
        }
        // data.data 是 ExportResult（含 downloadUrl）
        const downloadUrl = data.data?.downloadUrl;
        if (!downloadUrl) throw new Error('Missing downloadUrl');
        const dlResponse = await authedFetch(downloadUrl, { method: 'GET' });
        if (!dlResponse.ok) throw new Error('Download failed');
        const blob = await dlResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // 按格式映射文件名（避免 YAML/LangGraph 被存成 .json）
        const shellFilenames: Record<ExportFormatType, string> = {
          json: 'company-config.json',
          yaml: 'company-config.yaml',
          proclaw: 'company-config.proclaw-team.json',
          crewai: 'team.crewai',
          langgraph: 'company-config.langgraph.json',
        };
        a.download = shellFilenames[format] || 'company-config.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return;
      } catch (err) {
        console.warn('[handleExportToShell] standard aiteam export failed, falling back to session export:', err);
      }
    }

    // 兜底：session-based 导出
    if (!sessionId) {
      alert(t('exportFailed') || '导出失败：会话不存在');
      return;
    }
    try {
      const response = await authedFetch(`/aiteam-creation/sessions/${sessionId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || t('exportFailed') || '导出失败');
      }

      // 触发浏览器下载（后端已把文件写到 exports/，通过静态端点提供）
      const downloadUrl = data.data.downloadUrl;
      if (!downloadUrl) {
        throw new Error('Missing downloadUrl');
      }
      const dlResponse = await authedFetch(downloadUrl, { method: 'GET' });
      if (!dlResponse.ok) {
        throw new Error('Download failed');
      }
      const blob = await dlResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.data.fileName || `ai-team.${data.data.extension || 'json'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to shell:', error);
      alert(t('exportFailed') || '导出失败');
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
   * 创建成功后跳转到「我的 AI 公司」详情（带 ?aiteam=<id> 参数）
   */
  const handleViewCompany = (aiteamId: string) => {
    const target = `/${locale}/my-aiteam?aiteam=${encodeURIComponent(aiteamId)}`;
    if (typeof window !== 'undefined') {
      window.location.href = target;
    }
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

  const renderRecommendedRoles = (roles: Array<{roleName: string; description: string; responsibilities?: string[]}>) => {
    if (!roles || roles.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span className="text-lg">🎯</span>
          {t('recommendedRolesTitle')}：
        </p>
        {roles.map((role, index) => (
          <div key={index} className="bg-linear-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-base">{role.roleName}</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5 leading-relaxed">{role.description}</p>
                {role.responsibilities && (
                  <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2.5 list-disc list-inside space-y-1">
                    {role.responsibilities.map((resp: string, i: number) => (
                      <li key={i} className="leading-relaxed">{resp}</li>
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

  /** 渲染消息附加内容（推荐角色 / CEO 配置 / 确认按钮 / 文档包 / 澄清问题） */
  const renderMessageExtra = (message: AiTeamMessage) => {
    const isAgent = message.role !== 'user';

    return (
      <>
        {isAgent && message.recommendedRoles && (
          <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
            {renderRecommendedRoles(message.recommendedRoles)}
          </div>
        )}

        {isAgent && message.ceoConfig && (
          <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
            <CEOConfigPreview config={message.ceoConfig} />
          </div>
        )}

        {isAgent && message.showConfirmButton && (
          <div className="mt-5 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
            {/* 自动发布到市场选项 */}
            <div className="mb-4 p-3 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPublishToMarketplace}
                  onChange={(e) => setAutoPublishToMarketplace(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    🚀 {t('autoPublishLabel')}
                  </span>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('autoPublishDesc')}
                  </p>
                </div>
              </label>
            </div>

            <button
              onClick={handleConfirmAndSave}
              disabled={isConfirming}
              className="w-full px-6 py-3 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-md hover:shadow-lg hover:shadow-green-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold text-sm active:scale-[0.98]"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('confirmingButton')}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>{t('confirmSave')}</span>
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              {t('confirmSaveDesc')}
            </p>
          </div>
        )}

        {isAgent && message.documentPackage && (
          <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
            <DocumentPackagePreview docPackage={message.documentPackage} />
          </div>
        )}

        {isAgent && message.clarificationQuestions && message.clarificationQuestions.length > 0 && (
          <div className="mt-4 flex items-start gap-2.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">{t('needsMoreInfo')}</p>
              <ul className="list-disc list-inside space-y-1">
                {message.clarificationQuestions.map((q, i) => (
                  <li key={i} className="leading-relaxed">{q}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </>
    );
  };

  // ── 内容主体（左侧进度 + 右侧对话），embedded 与弹窗模式共用 ──
  const renderWorkspace = () => (
    <div className="flex-1 flex overflow-hidden">
      {/* 左侧：可视化进度 - 统一玻璃态卡片风格 */}
      <aside className="hidden lg:flex w-80 border-r border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-6 overflow-y-auto shrink-0">
        <div className="sticky top-0 w-full">
          <StepProgress
            steps={progressSteps}
            percentage={currentProgress?.percentage || 0}
            title={t('progressTitle')}
            waitingLabel={t('stepWaiting')}
            processingLabel={t('processing')}
            overallLabel={t('progressTitle')}
            className="w-full"
          />

          {/* 提示信息 */}
          <div className="mt-5 p-3.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
              💡 <strong className="font-semibold">{t('tipTitle')}</strong>：{t('tipDesc')}
            </p>
          </div>
        </div>
      </aside>

      {/* 中间：对话区域 */}
      <section className="flex-1 flex flex-col min-h-0 bg-linear-to-b from-white to-gray-50/30 dark:from-gray-900 dark:to-gray-800/30">
        {/* 游客模式提示条（未登录可先玩，保存时才登录） */}
        {!isLoggedIn && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-50/80 dark:bg-amber-900/20 border-b border-amber-200/60 dark:border-amber-800/40">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
              {t('guestModeBadge')}
            </span>
            <p className="text-xs text-amber-700/90 dark:text-amber-300/90">{t('guestModeHint')}</p>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 sm:space-y-6 scroll-smooth">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              extra={renderMessageExtra(message)}
            />
          ))}

          {isSending && (
            <div className="flex gap-3 sm:gap-4 justify-start">
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

        {/* Input Area */}
        <ChatInput
          value={inputMessage}
          onChange={setInputMessage}
          onSend={sendMessage}
          placeholder={t('inputPlaceholder')}
          disabled={isSending || !sessionId}
          sendLabel={t('sendButton')}
          showKeyboardHint={false}
          showFooterHint={false}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 pb-3 text-center bg-white dark:bg-gray-900">
          💡 {t('inputHint')}
        </p>
      </section>
    </div>
  );

  // ── 页内模式（/nvwa）：与 Agent 模式同一页面骨架，无遮罩、无独立头部 ──
  if (embedded) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {renderWorkspace()}

        {/* 创建成功弹窗 */}
        {showSuccessModal && successData && (
          <CreateSuccessDialog
            open={showSuccessModal}
            successData={successData}
            onClose={() => setShowSuccessModal(false)}
            onDownload={handleDownload}
            onIntegrate={() => {
              if (sessionId) handleIntegrateToProClaw(sessionId);
            }}
            onExportToShell={handleExportToShell}
            onShare={handleShare}
            onViewCompany={successData?.aiteamId ? () => handleViewCompany(successData.aiteamId!) : undefined}
          />
        )}

        {/* 分享弹窗 */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
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
                  aria-label={t('close')}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{shareContent.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{shareContent.content}</p>
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-mono break-all">{shareContent.url}</p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">📋 即将复制的内容：</p>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {shareContent.content}
                    {'\n'}
                    {'\n'}
                    🔗 查看详情：{shareContent.url}
                  </pre>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    💡 点击"复制并关闭"后，内容将自动复制到剪贴板，您可以粘贴到微信、微博、Twitter 等平台分享。
                  </p>
                </div>
              </div>

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

  // ── 弹窗模式（agent-repository 等）：保留全屏遮罩 ──
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-200/60 dark:border-gray-700/60">
        {/* Header - 与 Nvwa 页面对齐 */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-r from-blue-500/5 via-blue-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-blue-500/10 dark:to-pink-500/10" />
          <div className="relative flex items-center justify-between px-6 sm:px-8 py-4 sm:py-5 border-b border-gray-200/60 dark:border-gray-800">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-linear-to-r from-blue-500 to-blue-700 rounded-2xl blur-md opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-linear-to-br from-blue-500 via-indigo-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Sparkles size={22} className="text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  <span className="bg-linear-to-r from-blue-600 via-indigo-500 to-blue-700 bg-clip-text text-transparent">
                    {t('welcomeTitle')}
                  </span>
                  <span className="ml-2 text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full align-middle">
                    {t('welcomeBadge')}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('welcomeSubtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 group"
              aria-label={t('close')}
            >
              <X className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
            </button>
          </div>
        </div>

        {renderWorkspace()}

        {/* 创建成功弹窗 */}
        {showSuccessModal && successData && (
          <CreateSuccessDialog
            open={showSuccessModal}
            successData={successData}
            onClose={() => setShowSuccessModal(false)}
            onDownload={handleDownload}
            onIntegrate={() => {
              if (sessionId) handleIntegrateToProClaw(sessionId);
            }}
            onExportToShell={handleExportToShell}
            onShare={handleShare}
            onViewCompany={successData?.aiteamId ? () => handleViewCompany(successData.aiteamId!) : undefined}
          />
        )}

        {/* 分享弹窗 */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
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
                  aria-label={t('close')}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{shareContent.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{shareContent.content}</p>
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-mono break-all">{shareContent.url}</p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">📋 即将复制的内容：</p>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {shareContent.content}
                    {'\n'}
                    {'\n'}
                    🔗 查看详情：{shareContent.url}
                  </pre>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    💡 点击"复制并关闭"后，内容将自动复制到剪贴板，您可以粘贴到微信、微博、Twitter 等平台分享。
                  </p>
                </div>
              </div>

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
    </div>
  );
}
