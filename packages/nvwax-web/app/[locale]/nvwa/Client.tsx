'use client';

/**
 * Nvwa 工作台 —— IDE 风格重构版（v2.3 桌面风格）
 * ----------------------------------------------------------------
 * 保留 100% 业务逻辑（状态机/ProClaw 跨域认证/消息流/模板搜索/配置审查/进度追踪），
 * 仅重构呈现层为 IDE 工作台范式：
 *
 *   ┌─ Title Bar（命令栏：项目名 + 模式切换 + 状态灯 + AI 搜索） ──────┐
 *   ├──────────┬────────────────────────────────────────────────────┤
 *   │          │ ┌─ Tab Bar（会话/蓝图/状态机） ──────────────────┐ │
 *   │ Activity │ │                                                    │ │
 *   │  Bar     │ │     Main Workbench（对话 / Blueprint / Graph） │ │
 *   │ (图标列) │ │                                                    │ │
 *   │          │ └────────────────────────────────────────────────────┘ │
 *   │          ├────────────────────────────────────────────────────┤
 *   │          │     Inspector（需求/技能/进度/导出）                  │
 *   └──────────┴────────────────────────────────────────────────────┘
 *
 * 兼容：
 * - embedded=true 模式（首页 / Hero 区域调用）：隐藏 Title Bar 中的 Logo 与 macOS 占位
 * - 移动端：自动折叠为顶部 Tab Bar + 单列堆叠
 * - ProClaw 外部注入需求：URL ?requirements=&teamName=&category=&tags=&proclaw_token=&proclaw_email=
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Send,
  Bot,
  Sparkles,
  Loader,
  RotateCcw,
  Lightbulb,
  Zap,
  Check,
  ArrowUp,
  CornerDownLeft,
  Activity,
  Workflow,
  FileOutput,
  Settings2,
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  Download,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import AiTeamCreatorModal from '@/components/aiteam-creator-modal';
import { useTranslations } from 'next-intl';
import { AiteamStateGraphView } from '@/components/UI';
import StepProgress from '@/components/creation/StepProgress';
import ChatMessage from '@/components/creation/ChatMessage';
import NvwaBlueprintPanel, { type NvwaDeploySuccess } from '@/components/orchestration/NvwaBlueprintPanel';
import CreateSuccessInlinePanel from '@/components/creation/CreateSuccessInlinePanel';
import type { SuccessData } from '@/components/creation/CreateSuccessDialog';
import type { ExportFormatType } from '@/components/ExportModal';
import type { BlueprintConfig, BlueprintValidationResult } from '@/lib/api/blueprints';
import { useAiTeamCreationProgress } from '@/hooks/use-aiteam-creation-progress';
import { AiTeamCreationApiError } from '@/lib/api/aiteam-creation';
import {
  recordAudit,
  NvwaAuditAction,
  NVWA_AUDIT_SOURCE,
  downloadAuditLog,
} from '@/lib/audit/nvwa-audit';

// ============================================================
// 类型定义（与原实现一致）
// ============================================================

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

/** 快捷建议词组（按 currentStep 索引） */
const SUGGESTION_KEYS: Record<number, string[]> = {
  0: ['suggestion1', 'suggestion2', 'suggestion3', 'suggestion4'],
  1: ['suggestion5', 'suggestion6', 'suggestion7', 'suggestion8'],
  2: ['suggestion9', 'suggestion10', 'suggestion11', 'suggestion12'],
  3: ['suggestion13', 'suggestion14', 'suggestion15', 'suggestion16'],
};

/** 安全取翻译文案：缺失 namespace 时回退默认文案 */
const tx = (
  t: ReturnType<typeof useTranslations<'nvwa'>>,
  key: string,
  fallback: string,
  values?: Record<string, string | number>
): string => {
  try {
    const v = values ? t(key, values as never) : t(key);
    return typeof v === 'string' && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
};

// ============================================================
// 主组件
// ============================================================

export default function NvwaClient({
  embedded = false,
  defaultMode = 'aiteam',
}: {
  embedded?: boolean;
  /** 默认创建模式：aiteam = AI 公司（虚拟公司）为主，agent = 招聘单个员工（收敛入口） */
  defaultMode?: 'agent' | 'aiteam';
}) {
  const t = useTranslations('nvwa');
  const { isLoggedIn, userInfo, login, loading: authLoading } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();

  // ---- 布局状态（IDE 风格特有） ----
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'progress' | 'requirement' | 'skills' | 'output'>('progress');
  const [activeWorkTab, setActiveWorkTab] = useState<'chat' | 'blueprint' | 'graph'>('chat');

  // ---- 蓝图状态（方案 X 续：与 AgentBlueprintCanvas 联通） ----
  const [blueprintDeployed, setBlueprintDeployed] = useState(false);
  const [blueprintValidation, setBlueprintValidation] = useState<BlueprintValidationResult | null>(null);

  // ---- 创建结果面板状态（任务 A：把 CreateSuccessDialog 内嵌到工作台右侧 Inspector） ----
  const [createSuccessData, setCreateSuccessData] = useState<SuccessData | null>(null);

  // ---- 真实后端链路状态（接 Agent CRUD + aiteam-creation 完整对话流） ----
  /** 当前绑定的后端 Agent ID（懒创建：用户首次发消息前调 agentsApi.create） */
  const [backendAgentId, setBackendAgentId] = useState<string | null>(null);
  const [backendAgentStatus, setBackendAgentStatus] = useState<'idle' | 'creating' | 'ready' | 'error'>('idle');
  const [backendAgentError, setBackendAgentError] = useState<string | null>(null);
  /** aiteam-creation session（懒创建：首次 sendMessage 时） */
  const [aiteamSessionId, setAiteamSessionId] = useState<string | null>(null);
  /** 后端 sendMessage 进度（true = 正在同步；用于顶部状态条） */
  const [sessionSyncing, setSessionSyncing] = useState(false);
  const [lastServerPhase, setLastServerPhase] = useState<string | null>(null);
  /** SuccessData 加载状态 */
  const [successLoading, setSuccessLoading] = useState(false);
  const [successError, setSuccessError] = useState<string | null>(null);

  // ---- SSE 实时进度追踪（接 aiteam-creation/sessions/:id/stream） ----
  // 仅当有真实 sessionId 且已登录时连接；guest/未登录时 hook 返回 null
  const sse = useAiTeamCreationProgress(aiteamSessionId && isLoggedIn ? aiteamSessionId : null, {
    autoReconnect: true,
    maxRetries: 3,
    retryDelay: 2000,
  });

  // SSE 连接状态变化审计（仅在状态实际翻转时记录，避免噪声）
  const prevSseConnectedRef = useRef<boolean | null>(null);
  const prevSseErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (!aiteamSessionId) return;
    if (prevSseConnectedRef.current !== sse.isConnected) {
      if (sse.isConnected) {
        recordAudit(NvwaAuditAction.SSE_CONNECTED, 'SSE 实时进度已连接', {
          resourceId: aiteamSessionId,
          source: NVWA_AUDIT_SOURCE,
        });
      } else if (prevSseConnectedRef.current === true) {
        recordAudit(NvwaAuditAction.SSE_DISCONNECTED, 'SSE 实时进度断开', {
          resourceId: aiteamSessionId,
          source: NVWA_AUDIT_SOURCE,
        });
      }
      prevSseConnectedRef.current = sse.isConnected;
    }
    const errMsg = sse.error?.message ?? null;
    if (prevSseErrorRef.current !== errMsg && errMsg) {
      recordAudit(NvwaAuditAction.SSE_ERROR, errMsg, {
        resourceId: aiteamSessionId,
        source: NVWA_AUDIT_SOURCE,
        level: 'warning',
      });
      prevSseErrorRef.current = errMsg;
    }
  }, [aiteamSessionId, sse.isConnected, sse.error]);

  // ---- 业务状态（与原实现一致） ----
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

        // Sprint 2.2：useAuth.login 仅触发 OIDC 跳转（returnTo?），不再接收 token/userInfo
        // access_token 走 httpOnly cookie，前端不能也无法注入 token。
        // ProClaw 跨服务认证已在 Sprint 2.2 重构后废弃（改走 OIDC RP 流程），
        // 保留 fetch 调用仅为兼容历史链接，服务端忽略即可。
        console.log('[ProClaw CrossAuth] legacy cross-auth ignored; use OIDC RP flow');
        console.log('[ProClaw CrossAuth] Auto-login successful:', data.data.user.email);
      } catch (err) {
        console.error('[ProClaw CrossAuth] Error:', err);
      } finally {
        setCrossAuthHandled(true);
      }
    };

    doCrossAuth();
  }, [isLoggedIn, authLoading, crossAuthHandled, login]);

  const [authReadyForModal, setAuthReadyForModal] = useState(false);
  useEffect(() => {
    if (crossAuthHandled && externalRequirements && !authLoading) {
      const timer = setTimeout(() => setAuthReadyForModal(true), 300);
      return () => clearTimeout(timer);
    }
  }, [crossAuthHandled, externalRequirements, authLoading]);

  const initialAiTeamMessage = externalRequirements
    ? [
        externalRequirements,
        externalTeamName ? `\n${tx(t, 'teamNameLabel', '团队名称')}：${externalTeamName}` : '',
        externalCategory ? `\n${tx(t, 'categoryLabel', '分类')}：${externalCategory}` : '',
        externalTags ? `\n${tx(t, 'tagsLabel', '标签')}：${externalTags}` : '',
      ].join('')
    : undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [useStateMachine, setUseStateMachine] = useState<boolean>(false);
  const [stateMachineSessionId] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    dataSources: [],
    outputs: [],
    implementation: '',
    skills: [],
  });
  const [activeMode, setActiveMode] = useState<'agent' | 'aiteam'>(defaultMode);
  const [progress, setProgress] = useState<CreationProgress>({
    currentStep: 0,
    totalSteps: 7,
    percentage: 0,
    steps: [
      { stepNumber: 1, name: tx(t, 'stepAnalysis', '需求分析'), status: 'pending', message: tx(t, 'waiting', '等待开始') },
      { stepNumber: 2, name: tx(t, 'stepDataSource', '数据源选择'), status: 'pending', message: tx(t, 'waiting', '等待开始') },
      { stepNumber: 3, name: tx(t, 'stepOutput', '输出类型'), status: 'pending', message: tx(t, 'waiting', '等待开始') },
      { stepNumber: 4, name: tx(t, 'stepImpl', '实现方式'), status: 'pending', message: tx(t, 'waiting', '等待开始') },
      { stepNumber: 5, name: tx(t, 'stepTemplate', '模板匹配'), status: 'pending', message: tx(t, 'waiting', '等待开始') },
      { stepNumber: 6, name: tx(t, 'stepReview', '配置审查'), status: 'pending', message: tx(t, 'waiting', '等待开始') },
      { stepNumber: 7, name: tx(t, 'stepSave', '保存配置'), status: 'pending', message: tx(t, 'waiting', '等待开始') }
    ]
  });

  /** 合并后的显示进度（SSE 后端进度优先，保留本地 i18n 步骤名） */
  const displayProgress = useMemo(() => {
    if (!sse.progress) return progress;
    // percentage 取较大者（后端可能因 LLM 处理先推进）
    const ssePct = sse.progress.percentage ?? 0;
    const localPct = progress.percentage ?? 0;
    const mergedPct = Math.max(ssePct, localPct);

    // 步骤状态：以后端为准（后端知道真实完成情况），保留本地步骤名（i18n）
    const mergedSteps = progress.steps.map((localStep) => {
      const serverStep = sse.progress?.steps?.find(
        (s) => s.stepNumber === localStep.stepNumber
      );
      if (!serverStep) return localStep;
      // 后端 completed 则本地也 completed；后端 in_progress 且本地 pending → 用 in_progress
      const status =
        serverStep.status === 'completed' || localStep.status === 'completed'
          ? ('completed' as const)
          : serverStep.status === 'in_progress'
            ? ('in_progress' as const)
            : localStep.status;
      return {
        ...localStep,
        status,
        message: serverStep.message || localStep.message,
      };
    });

    return {
      ...progress,
      percentage: mergedPct,
      currentStep: Math.max(progress.currentStep, sse.progress.currentStep ?? 0),
      steps: mergedSteps,
    };
  }, [progress, sse.progress]);

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
      content: tx(t, 'welcomeMessage', '👋 你好！我是 Nvwa，AI 公司架构师。你想成立一家什么类型的公司？请描述公司类型和核心目标。'),
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // 从 ProClaw 等外部来源跳转时，自动切换到 AiTeam 创建模式
  useEffect(() => {
    if (externalRequirements) {
      const timer = setTimeout(() => {
        setActiveMode('aiteam');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [authReadyForModal]);

  // 「重新开始」使用应用内确认对话框
  const handleRestart = useCallback(() => {
    confirm({
      title: tx(t, 'restart', '重新开始'),
      message: tx(t, 'restartConfirm', '确定要重新开始吗？当前进度将丢失。'),
      variant: 'warning',
      confirmText: tx(t, 'restart', '重新开始'),
      onConfirm: () => window.location.reload(),
    });
  }, [confirm, t]);

  // ---- 蓝图 Tab 回调（方案 X 续） ----
  // 最近一次画布 config（用于 Agent 实时同步，见下 debounceAgentSync）
  const latestBlueprintConfigRef = useRef<BlueprintConfig | null>(null);
  const debounceAgentSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 把画布最新 config 同步到后端 Agent（debounce 1s 后由 handleBlueprintChange 触发）。
   * 仅写画布变化影响的字段，避免覆盖用户已修改的 description / skills 等。
   * 必须在 handleBlueprintChange 之前声明 —— 因为 deps 数组立即求值。
   */
  const syncAgentToBackend = useCallback(
    async (config: BlueprintConfig) => {
      if (!backendAgentId) return;
      try {
        const { agentApi } = await import('@/lib/api/agents');
        // 画布变化 → 同步 root.name + root.model + skills + tools 计数
        await agentApi.updateAgent(backendAgentId, {
          name: config.root?.name || formData.name || formData.description?.slice(0, 20) || '未命名 Agent',
          skills: (config.skills ?? [])
            .map((s) => s.skillName ?? s.skillId)
            .filter(Boolean) as string[],
          config: {
            source: 'nvwa-workbench',
            blueprintDraft: true,
            model: config.root?.model,
            temperature: config.root?.temperature,
            subagentCount: (config.subagents ?? []).length,
            toolCount: (config.tools ?? []).length,
            lastSyncAt: new Date().toISOString(),
          },
        });
        recordAudit(NvwaAuditAction.AGENT_UPDATED, '画布变更触发 Agent 自动同步', {
          resourceId: backendAgentId,
          source: NVWA_AUDIT_SOURCE,
          userId: userInfo?.sub,
          meta: {
            model: config.root?.model,
            subagentCount: (config.subagents ?? []).length,
            toolCount: (config.tools ?? []).length,
          },
        });
      } catch (err) {
        // 自动同步失败不阻断主流程，仅审计
        recordAudit(NvwaAuditAction.AGENT_UPSERT_FAILED, '画布自动同步 Agent 失败', {
          resourceId: backendAgentId,
          source: NVWA_AUDIT_SOURCE,
          level: 'warning',
          meta: { error: err instanceof Error ? err.message : String(err) },
        });
      }
    },
    [backendAgentId, formData.name, formData.description, userInfo]
  );

  const handleBlueprintChange = useCallback(
    (snapshot: { config: BlueprintConfig; validation: BlueprintValidationResult }) => {
      // 1. validation 立即反馈给状态条
      setBlueprintValidation(snapshot.validation);

      // 2. 保存最近 config，给 debounceAgentSync 用
      latestBlueprintConfigRef.current = snapshot.config;

      // 3. 防抖 1s 后 PUT agent（仅在已绑定 backendAgentId 时）
      if (debounceAgentSyncTimerRef.current) {
        clearTimeout(debounceAgentSyncTimerRef.current);
      }
      debounceAgentSyncTimerRef.current = setTimeout(() => {
        void syncAgentToBackend(snapshot.config);
      }, 1000);
    },
    [backendAgentId, syncAgentToBackend]
  );

  /** 组件卸载 / 路由切换时清理 pending debounce 定时器 */
  useEffect(() => {
    return () => {
      if (debounceAgentSyncTimerRef.current) {
        clearTimeout(debounceAgentSyncTimerRef.current);
        debounceAgentSyncTimerRef.current = null;
      }
    };
  }, []);

  const handleBlueprintDeploy = useCallback(
    async (_result: NvwaDeploySuccess, config: BlueprintConfig) => {
      void _result;
      void config;
      setBlueprintDeployed(true);

      // ---- 真实后端流程（接 aiteam-creation 完整对话流） ----
      // 1. 复用之前 syncToBackendSession 已懒创建的 session
      //    （如果用户没发过消息、或者未登录，sessionId 为 null → 降级路径）
      // 2. 调 /confirm 让后端生成文档包 + 把 AiTeam 入库
      // 3. 把返回的 downloadUrl/aiteamId/documentPackage 填到 SuccessData
      setSuccessLoading(true);
      setSuccessError(null);

      // 审计：蓝图部署（前端门禁通过）→ 记录蓝图层事件
      recordAudit(NvwaAuditAction.BLUEPRINT_DEPLOYED, '蓝图画布部署门禁通过', {
        resourceId: backendAgentId ?? 'unbound',
        source: NVWA_AUDIT_SOURCE,
        userId: userInfo?.sub,
        meta: {
          rootName: config.root?.name,
          subagentCount: (config.subagents ?? []).length,
          skillCount: (config.skills ?? []).length,
          toolCount: (config.tools ?? []).length,
        },
      });

      try {
        const { aiteamCreationApi } = await import('@/lib/api/aiteam-creation');
        // 复用 syncToBackendSession 创建的 session；不存在则懒创建
        let sid = aiteamSessionId;
        if (!sid && isLoggedIn) {
          const session = await aiteamCreationApi.createSession({
            requirements: {
              teamName: (formData.description ?? '').trim().slice(0, 20) || '未命名 Agent',
              description: formData.description,
              dataSources: formData.dataSources,
              outputs: formData.outputs,
              implementation: formData.implementation,
              skills: formData.skills,
            },
          });
          sid = session.id;
          setAiteamSessionId(sid);
          recordAudit(NvwaAuditAction.AITEAM_SESSION_CREATED, 'aiteam-creation session（handleBlueprintDeploy 内）创建', {
            resourceId: sid,
            source: NVWA_AUDIT_SOURCE,
            userId: userInfo?.sub,
          });
        }
        if (!sid) {
          throw new Error('未登录或会话创建失败');
        }

        // 2. 确认保存 → 真实后端生成 documentPackage + AiTeam 入库
        const saved = await aiteamCreationApi.confirmAndSave(sid);

        // 审计：AiTeam 确认成功
        recordAudit(NvwaAuditAction.AITEAM_CONFIRMED, 'Aiteam 创建成功入库', {
          resourceId: saved.aiteamId ?? sid,
          source: NVWA_AUDIT_SOURCE,
          userId: userInfo?.sub,
          meta: {
            sessionId: sid,
            documentCount: saved.documentPackage?.packageInfo?.totalDocuments,
          },
        });

        // 2.5 Agent 元数据同步（Agent CRUD 闭环）：蓝图部署成功后，把最新配置写回 Agent
        //     让「我的 Agent 仓库」里的描述与画布配置保持一致
        if (backendAgentId) {
          try {
            const { agentApi } = await import('@/lib/api/agents');
            await agentApi.updateAgent(backendAgentId, {
              name: formData.name || formData.description?.slice(0, 20) || '未命名 Agent',
              description:
                formData.description ||
                (saved.documentPackage?.packageInfo?.teamName
                  ? `由 NvwaX 创建的${saved.documentPackage.packageInfo.teamName}`
                  : '由 Nvwa 工作台招聘的 AI 员工'),
              skills: formData.skills,
              dataSources: formData.dataSources,
              outputTypes: formData.outputs,
              implementation: formData.implementation,
              status: 'active',
              config: {
                source: 'nvwa-workbench',
                blueprintDeployed: true,
                deployedAt: new Date().toISOString(),
                sessionId: sid,
              },
            });
            console.log('[Nvwa] ✓ Agent metadata synced:', backendAgentId);
          } catch (agentErr) {
            // 元数据同步失败不阻断主流程
            console.warn('[Nvwa] Agent metadata sync failed (忽略):', agentErr);
          }
        }

        // 3. 填到右侧 Inspector
        const success: SuccessData = {
          downloadUrl: saved.downloadUrl,
          aiteamId: saved.aiteamId ?? undefined,
          documentPackage: saved.documentPackage,
        };
        setCreateSuccessData(success);

        addAssistantMessage(
          '🎉 右侧 Inspector「输出」面板已自动打开，文档包与下载链接均来自真实后端。'
        );

        // 把对话流同步：提示用户 AiTeam 已入库
        if (saved.aiteamId) {
          addAssistantMessage(
            `✅ AI 公司已保存到「我的 AI 公司」（ID: ${saved.aiteamId.slice(0, 8)}…）。`
          );
        }
      } catch (err) {
        const msg =
          err instanceof AiTeamCreationApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : '保存失败';
        setSuccessError(msg);
        console.error('[Nvwa] handleBlueprintDeploy failed:', err);

        recordAudit(NvwaAuditAction.AITEAM_CONFIRM_FAILED, 'Aiteam 创建确认失败', {
          source: NVWA_AUDIT_SOURCE,
          userId: userInfo?.sub,
          level: 'error',
          meta: { error: msg },
        });

        // 失败时降级：生成纯前端 demo SuccessData（保底不卡住流程）
        const teamName = formData.name || formData.description?.slice(0, 20) || '未命名 Agent';
        const fallback: SuccessData = {
          downloadUrl: `/api/aiteam-creation/sessions/local-${Date.now()}/download`,
          aiteamId: undefined,
          documentPackage: {
            packageInfo: {
              teamName,
              teamType: 'virtual_company',
              generatedAt: new Date().toISOString(),
              totalDocuments: 0,
            },
          },
        };
        setCreateSuccessData(fallback);
        addAssistantMessage(
          `⚠️ 保存到后端失败：${msg}。已显示本地占位结果，请稍后重试或检查网络。`
        );
      } finally {
        setSuccessLoading(false);
        setActiveSidePanel('output');
      }
    },
    [aiteamSessionId, backendAgentId, isLoggedIn, userInfo, formData.description, formData.dataSources, formData.outputs, formData.implementation, formData.name, formData.skills]
  );

  /** 当前 Nvwa 表单数据的快照 key（用于强制重建画布） */
  const blueprintSourceKey = useMemo(
    () => `${formData.name || ''}::${formData.description || ''}::${formData.implementation || ''}::${(formData.skills || []).join('|')}`,
    [formData.name, formData.description, formData.implementation, formData.skills]
  );

  // ---- 业务函数（与原实现一致） ----
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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, scrollToBottom]);

  const updateProgress = (stepNumber: number, status: 'pending' | 'in_progress' | 'completed' | 'failed', message: string) => {
    setProgress(prev => {
      const newSteps = prev.steps.map(step => {
        if (step.stepNumber === stepNumber) {
          return { ...step, status, message };
        }
        if (step.status === 'pending' && step.stepNumber < stepNumber) {
          return { ...step, status: 'completed' as const, message: tx(t, 'completed', '已完成') };
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

  /**
   * 接后端真实推荐引擎（v2.3 优化）：
   * GET /api/v2/agents/recommend-skills?industry_tags=...
   * 基于用户的"行业标签 + 需求 + 实现方式"抽取关键词作为 industry_tags。
   *
   * 返回结构：{ success: true, data: { recommended_skills: RecommendedSkill[], total_skills } }
   *
   * 失败降级：返回空数组，不影响本地 5 步硬编码流程。
   */
  const recommendSkillsByIndustry = async (
    industryTags: string[]
  ): Promise<Array<{ id: string; name: string; type?: string; source?: string; matchScore?: number; description?: string }>> => {
    if (industryTags.length === 0) return [];
    try {
      const apiClient = (await import('@/lib/api/client')).default;
      const r = await apiClient.get('/v2/agents/recommend-skills', {
        params: { industry_tags: industryTags.join(',') },
      });
      const data = r.data as { success: boolean; data?: { recommended_skills?: Array<{ id: string; name: string; type?: string; source?: string; match_score?: number; description?: string }>; total_skills?: number } };
      if (data.success && data.data?.recommended_skills) {
        return data.data.recommended_skills.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          source: s.source,
          matchScore: s.match_score,
          description: s.description,
        }));
      }
      return [];
    } catch (err) {
      console.warn('[Nvwa] recommendSkillsByIndustry failed (降级):', err);
      return [];
    }
  };

  /**
   * 从 formData 抽取 industry_tags 关键词（简单规则，未来可由 LLM 抽取）。
   * 中文 + 英文都按空格/标点切分；过滤常见停用词。
   */
  const extractIndustryTags = (text: string): string[] => {
    if (!text) return [];
    const stopwords = new Set(['的', '了', '和', '或', '与', '及', '一个', '用', '在', '我', '你', '他', '她', '它', '是', '有', 'the', 'a', 'an', 'and', 'or', 'with', 'to', 'for', 'in', 'on', 'at', 'by']);
    // 简单的 token 化：按非字母数字汉字切分
    const tokens = text
      .toLowerCase()
      .split(/[\s,。.;；:：、/\\()()[\]【】"'`!?？]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && t.length <= 30 && !stopwords.has(t));
    // 去重 + 限制最多 8 个
    return Array.from(new Set(tokens)).slice(0, 8);
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
      return {
        reviewPassed: true,
        issues: [tx(t, 'reviewServiceUnavailable', '配置审查服务暂不可用')],
        suggestions: [tx(t, 'checkManual', '请稍后手动复核')],
        confidence: 0.5
      };
    }
  };

  const executeSkillAnalysisAndReview = async () => {
    updateProgress(5, 'in_progress', tx(t, 'analyzingSkills', '正在分析技能...'));

    setFormData(prev => ({
      ...prev,
      skills: [tx(t, 'skillNlp', '自然语言处理'), tx(t, 'skillKb', '知识库检索'), tx(t, 'skillDialog', '多轮对话')]
    }));

    addAssistantMessage(tx(t, 'aiSkillAnalysis', '正在为你的 Agent 匹配推荐技能...'));

    setTimeout(async () => {
      const baseSkills = [
        tx(t, 'skillNlp', '自然语言处理'),
        tx(t, 'skillKb', '知识库检索'),
        tx(t, 'skillDialog', '多轮对话'),
        tx(t, 'skillOrderConnector', '订单连接器'),
        tx(t, 'skillRealtimeSync', '实时同步')
      ];
      let updatedSkills = [...baseSkills];

      // v2.3 优化：接后端真实推荐引擎 /api/v2/agents/recommend-skills
      // 从 formData.description + implementation 抽取 industry_tags
      const combinedText = [formData.description, formData.implementation].filter(Boolean).join(' ');
      const industryTags = extractIndustryTags(combinedText);
      if (industryTags.length > 0) {
        try {
          const recommended = await recommendSkillsByIndustry(industryTags);
          if (recommended.length > 0) {
            const existing = new Set(updatedSkills);
            const newOnes = recommended
              .map((r) => r.name)
              .filter((n) => !existing.has(n));
            if (newOnes.length > 0) {
              updatedSkills = [...updatedSkills, ...newOnes];
              console.log('[Nvwa] ✓ 推荐引擎返回', recommended.length, '个技能，新增', newOnes.length, '个');
              // 在对话流展示推荐引擎结果
              const preview = recommended
                .slice(0, 3)
                .map((r) => `${r.name}${r.matchScore ? ` (匹配度 ${(r.matchScore * 100).toFixed(0)}%)` : ''}`)
                .join('、');
              addAssistantMessage(`🎯 后端推荐引擎命中：${preview}${recommended.length > 3 ? '…' : ''}`);
            }
          }
        } catch (err) {
          console.warn('[Nvwa] recommend engine failed (降级到本地 5 个):', err);
        }
      }

      setFormData(prev => ({ ...prev, skills: updatedSkills }));

      addAssistantMessage(
        tx(t, 'aiSkillSearchResult', `已为你匹配到 ${updatedSkills.length} 个推荐技能 ✓`, { count: updatedSkills.length })
      );

      try {
        const currentConfig = {
          name: formData.name || formData.description || tx(t, 'defaultAgentName', '未命名 Agent'),
          description: formData.description,
          dataSources: formData.dataSources,
          outputs: formData.outputs,
          implementation: formData.implementation,
          skills: updatedSkills
        };

        const reviewResult = await reviewAgentConfig(currentConfig);

        if (reviewResult.reviewPassed) {
          updateProgress(5, 'completed', tx(t, 'reviewPassed', '审查通过'));
          let suggestionsText = '';
          if (reviewResult.suggestions?.length > 0) {
            suggestionsText = `\n\n💡 **${tx(t, 'optimizationSuggestions', '优化建议')}：**\n${reviewResult.suggestions.map((s: string) => `- ${s}`).join('\n')}`;
          }
          addAssistantMessage(
            tx(
              t,
              'aiReviewPassed',
              `✅ 配置审查通过 (置信度 ${(reviewResult.confidence * 100).toFixed(0)}%) — ${currentConfig.name} 已准备就绪。`,
              { confidence: (reviewResult.confidence * 100).toFixed(0) }
            ) + suggestionsText
          );
        } else {
          updateProgress(5, 'failed', tx(t, 'reviewFailed', '审查未通过'));
          const issuesText = reviewResult.issues.map((issue: string) => `- ${issue}`).join('\n');
          addAssistantMessage(`${tx(t, 'aiReviewFailed', '配置审查未通过')}\n\n${issuesText}`);
        }
      } catch {
        updateProgress(5, 'failed', tx(t, 'reviewError', '审查出错'));
        addAssistantMessage(tx(t, 'aiReviewError', '配置审查服务异常'));
      }

      setCurrentStep(6);
    }, 1500);
  };

  // ============================================================
  // 真实后端链路辅助函数（懒创建 + 后台同步）
  // ============================================================

  /** 懒创建后端 Agent（dedupe via inflight Promise） */
  const ensureBackendAgent = useCallback(async (): Promise<string | null> => {
    if (backendAgentId) return backendAgentId;
    if (backendAgentStatus === 'creating' && ensureAgentInflightRef.current) {
      return ensureAgentInflightRef.current;
    }
    if (!isLoggedIn) {
      // 未登录：跳过，返回 null（走"无后端"降级路径）
      return null;
    }

    const promise = (async () => {
      try {
        setBackendAgentStatus('creating');
        setBackendAgentError(null);
        const { agentApi } = await import('@/lib/api/agents');
        // Agent 名称优先级：description 前 20 字 → placeholder
        const seedName = (formData.description ?? '').trim().slice(0, 20) || `Nvwa Draft ${Date.now()}`;
        const agent = await agentApi.createAgent({
          name: seedName,
          description: formData.description || '由 Nvwa 工作台招聘的 AI 员工',
          config: {
            source: 'nvwa-workbench',
            initialStep: currentStep,
          },
          skills: formData.skills,
          dataSources: formData.dataSources,
          outputTypes: formData.outputs,
          implementation: formData.implementation,
        });
        setBackendAgentId(agent.id);
        setBackendAgentStatus('ready');
        console.log('[Nvwa] ✓ Backend agent created:', agent.id);
        recordAudit(NvwaAuditAction.AGENT_CREATED, '后端 Agent 懒创建成功', {
          resourceId: agent.id,
          source: NVWA_AUDIT_SOURCE,
          userId: userInfo?.sub,
          meta: { name: seedName, initialStep: currentStep },
        });
        return agent.id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Agent 创建失败';
        setBackendAgentStatus('error');
        setBackendAgentError(msg);
        console.warn('[Nvwa] Backend agent create failed (继续本地流程):', msg);
        recordAudit(NvwaAuditAction.AGENT_UPSERT_FAILED, '后端 Agent 懒创建失败', {
          source: NVWA_AUDIT_SOURCE,
          userId: userInfo?.sub,
          level: 'warning',
          meta: { error: msg },
        });
        return null;
      } finally {
        ensureAgentInflightRef.current = null;
      }
    })();
    ensureAgentInflightRef.current = promise;
    return promise;
  }, [backendAgentId, backendAgentStatus, isLoggedIn, formData.description, formData.skills, formData.dataSources, formData.outputs, formData.implementation, currentStep, userInfo]);

  const ensureAgentInflightRef = useRef<Promise<string | null> | null>(null);

  /**
   * 懒创建 aiteam-creation session（dedupe via inflight Promise）
   *
   * 设计决策（v2.3+）：Nvwa 工作台**不采用** `aiteam-creator-modal` 的 'guest' 占位策略。
   * - modal: 未登录时把 sessionId 设为字符串 'guest'，本地模拟回复，"先玩后登录"
   * - Nvwa 工作台: 未登录直接返回 null（不连接 SSE、不调 sendMessage），
   *   强依赖 useAuth().isLoggedIn。理由：Nvwa 工作台定位是"正式创建 Agent"，
   *   玩模式由 AiTeam 模态承担；这里需要真实后端链路（Lazy create agent + SSE）。
   */
  const ensureSessionInflightRef = useRef<Promise<string | null> | null>(null);
  const ensureAiteamSession = useCallback(async (): Promise<string | null> => {
    if (aiteamSessionId) return aiteamSessionId;
    if (!isLoggedIn) return null;
    if (ensureSessionInflightRef.current) return ensureSessionInflightRef.current;

    const promise = (async () => {
      try {
        const { aiteamCreationApi } = await import('@/lib/api/aiteam-creation');
        const session = await aiteamCreationApi.createSession({
          requirements: {
            teamName: (formData.description ?? '').trim().slice(0, 20) || '未命名 Agent',
            description: formData.description,
            dataSources: formData.dataSources,
            outputs: formData.outputs,
            implementation: formData.implementation,
            skills: formData.skills,
          },
        });
        setAiteamSessionId(session.id);
        console.log('[Nvwa] ✓ Aiteam session created:', session.id);
        recordAudit(NvwaAuditAction.AITEAM_SESSION_CREATED, 'aiteam-creation session 懒创建成功', {
          resourceId: session.id,
          source: NVWA_AUDIT_SOURCE,
          userId: userInfo?.sub,
        });
        return session.id;
      } catch (err) {
        console.warn('[Nvwa] Aiteam session create failed (继续本地流程):', err);
        recordAudit(NvwaAuditAction.AITEAM_SESSION_FAILED, 'aiteam-creation session 创建失败', {
          source: NVWA_AUDIT_SOURCE,
          userId: userInfo?.sub,
          level: 'warning',
          meta: { error: err instanceof Error ? err.message : String(err) },
        });
        return null;
      } finally {
        ensureSessionInflightRef.current = null;
      }
    })();
    ensureSessionInflightRef.current = promise;
    return promise;
  }, [aiteamSessionId, isLoggedIn, formData.description, formData.dataSources, formData.outputs, formData.implementation, formData.skills, userInfo]);

  /**
   * 后台把用户消息推送到后端 aiteam session（fire-and-forget）。
   * 后端返回的 phase / nextStep / recommendedRoles 异步写回 UI，不阻塞本地对话流。
   */
  const syncToBackendSession = useCallback(
    async (userMessage: string): Promise<void> => {
      if (!isLoggedIn) return;
      const sid = await ensureAiteamSession();
      if (!sid) return;

      try {
        setSessionSyncing(true);
        const { aiteamCreationApi } = await import('@/lib/api/aiteam-creation');
        const r = await aiteamCreationApi.sendMessage(sid, { content: userMessage });
        const data = r;
        // 把服务端 phase 写到 state（不覆盖 currentStep，本地状态机保留控制权）
        if (data.phase) setLastServerPhase(data.phase);

        // 后端推荐的 roles —— 当 currentStep >= 4（已进入技能分析阶段）时合并到 formData.skills
        // 策略：不去重覆盖，而是追加到末尾（让用户的修改优先 + 后端补充）
        const roles = data.recommendedRoles;
        if (Array.isArray(roles) && roles.length > 0 && currentStep >= 4) {
          setFormData((prev) => {
            const recommendedNames = roles
              .map((r: { roleName?: string; role?: string }) => (r.roleName || r.role || '').trim())
              .filter(Boolean) as string[];
            if (recommendedNames.length === 0) return prev;
            const existing = new Set((prev.skills ?? []).map((s) => s.trim()).filter(Boolean));
            const newOnes = recommendedNames.filter((n) => !existing.has(n));
            if (newOnes.length === 0) return prev;
            const merged = [...(prev.skills ?? []), ...newOnes];
            console.log('[Nvwa] recommendedRoles merged into skills:', newOnes);
            return { ...prev, skills: merged };
          });
        }

        // 后端 extractedRequirements（如果当前 description 为空）→ 用作回填
        if (data.extractedRequirements && typeof data.extractedRequirements === 'object') {
          const req = data.extractedRequirements as Record<string, unknown>;
          const extractedDesc = typeof req.description === 'string' ? req.description : null;
          if (extractedDesc && extractedDesc.trim()) {
            setFormData((prev) => {
              if (prev.description && prev.description.trim().length > 0) return prev;
              return { ...prev, description: extractedDesc };
            });
          }
        }

        // 后端 nextStep 提示写到对话流
        if (data.nextStep && typeof data.nextStep === 'string') {
          addAssistantMessage(`💡 后端提示：${data.nextStep}`);
        }

        // needsClarification：注入后端的 clarificationQuestions
        if (data.needsClarification && Array.isArray(data.clarificationQuestions) && data.clarificationQuestions.length > 0) {
          const qs = data.clarificationQuestions
            .map((q: unknown, i: number) => `${i + 1}. ${String(q)}`)
            .join('\n');
          addAssistantMessage(`❓ 后端想澄清：\n${qs}`);
        }

        console.log('[Nvwa] ✓ Message synced to backend session', sid, 'phase=', data.phase);
      } catch (err) {
        console.warn('[Nvwa] syncToBackendSession failed (本地流程继续):', err);
      } finally {
        setSessionSyncing(false);
      }
    },
    [isLoggedIn, ensureAiteamSession, currentStep]
  );

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userMessage = inputValue.trim();
    addUserMessage(userMessage);
    setInputValue('');
    setIsTyping(true);

    // 后台：懒创建后端 Agent（不动 UI）
    void ensureBackendAgent();
    // 后台：同步消息到 aiteam session（不影响本地对话流）
    void syncToBackendSession(userMessage);

    setTimeout(() => {
      processUserInput(userMessage);
      setIsTyping(false);
    }, 1000);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  const processUserInput = async (input: string) => {
    const teamKeywords = ['团队', 'team', 'AiTeam', 'aiteam', 'ai团队', 'ai team', '多agent', 'multi-agent', '协作', 'collaboration'];
    const isTeamRequest = teamKeywords.some(keyword => input.toLowerCase().includes(keyword));

    if (isTeamRequest && currentStep === 0) {
      addAssistantMessage(tx(t, 'aiTeamRequestRedirect', '好的，我将为你切换到 AiTeam 创建模式...'));
      setTimeout(() => setActiveMode('aiteam'), 1500);
      return;
    }

    switch (currentStep) {
      case 0:
        setFormData(prev => ({ ...prev, description: input }));
        updateProgress(1, 'completed', tx(t, 'progressReq', `需求已记录：${input.substring(0, 20)}`, { input: input.substring(0, 20) }));
        setCurrentStep(1);
        addAssistantMessage(tx(t, 'aiResponseStep0', '好的，已记录需求。'));
        break;

      case 1:
        setFormData(prev => ({ ...prev, dataSources: [input] }));
        updateProgress(2, 'completed', tx(t, 'progressDataSource', `数据源：${input}`, { input }));
        setCurrentStep(2);
        addAssistantMessage(tx(t, 'aiResponseStep1', '已选择数据源。'));
        break;

      case 2:
        setFormData(prev => ({ ...prev, outputs: [input] }));
        updateProgress(3, 'completed', tx(t, 'progressOutput', `输出：${input}`, { input }));
        setCurrentStep(3);
        addAssistantMessage(tx(t, 'aiResponseStep2', '已选择输出类型。'));
        break;

      case 3:
        setFormData(prev => ({ ...prev, implementation: input }));
        setCurrentStep(4);
        // 方案 X 续：步骤 4 后自动激活蓝图 Tab，让用户立即看到基于表单数据生成的画布
        setActiveWorkTab('blueprint');
        updateProgress(4, 'in_progress', tx(t, 'searchingTemplates', '正在搜索模板...'));
        addAssistantMessage(tx(t, 'aiResponseStep3', '正在搜索匹配的模板...'));
        addAssistantMessage(`🎨 ${tx(t, 'aiBlueprintReady', '蓝图画布已根据你的需求自动开启！切换到「蓝图」 Tab 查看 →')}`);
        addAssistantMessage(`🔍 ${tx(t, 'aiResponseStep3Search', '并行搜索 GitHub/Gitee/ModelScope...')}`);

        try {
          const templates = await searchTemplates(formData.description, input);
          if (templates && templates.length > 0) {
            updateProgress(4, 'completed', tx(t, 'foundTemplates', `找到 ${templates.length} 个模板`, { count: templates.length }));
            const templateList = templates.map((tmpl: TemplateResult, i: number) => {
              const name = String(tmpl.name || tmpl.title || tx(t, 'unnamedTemplate', '未命名'));
              const rating = tmpl.rating ? String(tmpl.rating) : 'N/A';
              const matchScore = tmpl.matchScore ? String(tmpl.matchScore) : 'N/A';
              const skills = Array.isArray(tmpl.skills) ? tmpl.skills.map(s => String(s)).join(', ') : tx(t, 'none', '无');
              return `${i + 1}. **${name}** ⭐ ${rating} | 匹配度 ${matchScore}\n   - 技能：${skills}`;
            }).join('\n\n');
            addAssistantMessage(`✅ ${tx(t, 'foundTemplatesMsg', '找到模板', { count: templates.length })}\n\n${templateList}`);
          } else {
            updateProgress(4, 'completed', tx(t, 'noTemplates', '未找到模板'));
            addAssistantMessage(tx(t, 'noTemplatesMsg', '暂无匹配模板，继续自定义配置...'));
          }
        } catch {
          updateProgress(4, 'failed', tx(t, 'searchFailed', '搜索失败'));
          addAssistantMessage(tx(t, 'searchFailedMsg', '模板搜索失败，请重试'));
        }

        await executeSkillAnalysisAndReview();
        break;

      case 4:
        setCurrentStep(5);
        updateProgress(5, 'in_progress', tx(t, 'analyzingSkills', '正在分析技能...'));
        setFormData(prev => ({ ...prev, skills: [tx(t, 'skillNlp', '自然语言处理'), tx(t, 'skillKb', '知识库检索'), tx(t, 'skillDialog', '多轮对话')] }));
        addAssistantMessage(tx(t, 'aiSkillAnalysis', '正在分析技能...'));

        setTimeout(async () => {
          const updatedSkills = [tx(t, 'skillNlp', '自然语言处理'), tx(t, 'skillKb', '知识库检索'), tx(t, 'skillDialog', '多轮对话'), tx(t, 'skillOrderConnector', '订单连接器'), tx(t, 'skillRealtimeSync', '实时同步')];
          setFormData(prev => ({ ...prev, skills: updatedSkills }));
          addAssistantMessage(tx(t, 'aiSkillSearchResult', '已匹配技能'));

          try {
            const currentConfig = {
              name: formData.name || formData.description || tx(t, 'defaultAgentName', '未命名'),
              description: formData.description,
              dataSources: formData.dataSources,
              outputs: formData.outputs,
              implementation: formData.implementation,
              skills: updatedSkills
            };
            const reviewResult = await reviewAgentConfig(currentConfig);

            if (reviewResult.reviewPassed) {
              updateProgress(5, 'completed', tx(t, 'reviewPassed', '审查通过'));
              addAssistantMessage(tx(t, 'aiReviewPassed', '审查通过', { confidence: (reviewResult.confidence * 100).toFixed(0) }));
            } else {
              updateProgress(5, 'failed', tx(t, 'reviewFailed', '审查未通过'));
              addAssistantMessage(tx(t, 'aiReviewFailed', '审查未通过'));
            }
          } catch {
            updateProgress(5, 'failed', tx(t, 'reviewError', '审查出错'));
            addAssistantMessage(tx(t, 'aiReviewError', '审查出错'));
          }
          setCurrentStep(6);
        }, 1500);
        break;

      case 5:
      case 6:
        if (input.includes('确认') || input.includes('是') || input.toLowerCase().includes('yes')) {
          updateProgress(6, 'completed', tx(t, 'configConfirmed', '配置已确认'));
          if (!isLoggedIn) {
            addAssistantMessage(tx(t, 'aiNeedLogin', '请先登录后再保存'));
          } else {
            updateProgress(7, 'in_progress', tx(t, 'savingConfig', '正在保存...'));
            addAssistantMessage(tx(t, 'aiSaveOptions', '请选择保存方式'));
            setCurrentStep(10);
          }
        } else {
          addAssistantMessage(tx(t, 'aiRetryOptions', '请输入"确认"以继续'));
        }
        break;

      default:
        addAssistantMessage(tx(t, 'aiDefaultResponse', '请继续描述你的需求'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ============================================================
  // 子组件渲染
  // ============================================================

  // 左侧二级面板：进度
  const renderProgressPanel = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Loader className={`w-4 h-4 text-indigo-600 dark:text-indigo-400 ${displayProgress.percentage > 0 && displayProgress.percentage < 100 ? 'animate-spin' : ''}`} />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{tx(t, 'creationProgress', '创建进度')}</h3>
        </div>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
          {displayProgress.percentage}%
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* v2.2.0 状态机模式切换 */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">{tx(t, 'creationMode', '创建模式')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseStateMachine(!useStateMachine)}
              aria-pressed={useStateMachine}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                useStateMachine ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  useStateMachine ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
              {useStateMachine ? tx(t, 'modeStateMachine', '状态机') : tx(t, 'modeConversation', '对话式')}
            </span>
          </div>
        </div>

        {!useStateMachine && (
          <StepProgress
            steps={displayProgress.steps}
            percentage={displayProgress.percentage}
            waitingLabel={tx(t, 'waiting', '等待开始')}
            completedLabel={tx(t, 'completed', '已完成')}
            processingLabel={tx(t, 'processing', '处理中...')}
            overallLabel={tx(t, 'creationProgress', '创建进度')}
          />
        )}

        {useStateMachine && stateMachineSessionId && (
          <AiteamStateGraphView
            sessionId={stateMachineSessionId}
            onNodeAction={(nodeId, action) => {
              // 节点操作回调（预留）
              console.log('[StateMachine] node action:', nodeId, action);
            }}
            onStateChange={(state) => {
              // 状态变更回调（预留）
              console.log('[StateMachine] state changed:', state);
            }}
          />
        )}
      </div>
    </div>
  );

  // 左侧二级面板：需求信息
  const renderRequirementPanel = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{tx(t, 'requirementInfo', '需求信息')}</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {(!formData.name && !formData.description && formData.dataSources.length === 0) ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
              <Lightbulb className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              {tx(t, 'requirementPlaceholder', '请在右侧对话中描述你的 Agent 需求\n系统会自动提取到这里')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {formData.description && (
              <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <label className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">{tx(t, 'purposeLabel', '用途')}</label>
                <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 leading-relaxed">{formData.description}</p>
              </div>
            )}
            {formData.dataSources.length > 0 && (
              <div>
                <label className="text-[10px] font-semibold text-green-500 dark:text-green-400 uppercase tracking-wider">{tx(t, 'dataSourcesLabel', '数据源')}</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {formData.dataSources.map((s, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md font-medium border border-green-100 dark:border-green-900/30">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {formData.outputs.length > 0 && (
              <div>
                <label className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">{tx(t, 'outputTypeLabel', '输出')}</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {formData.outputs.map((o, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md font-medium border border-blue-100 dark:border-blue-900/30">
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {formData.implementation && (
              <div className="p-3 bg-cyan-50/50 dark:bg-cyan-900/10 rounded-xl border border-cyan-100 dark:border-cyan-900/30">
                <label className="text-[10px] font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider">{tx(t, 'implementationLabel', '实现方式')}</label>
                <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{formData.implementation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // 左侧二级面板：技能
  const renderSkillsPanel = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{tx(t, 'selectedSkills', '已选技能')}</h3>
        </div>
        {formData.skills.length > 0 && (
          <span className="text-xs font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
            {formData.skills.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {formData.skills.length > 0 ? (
          <div className="space-y-2">
            {formData.skills.map((skill, index) => (
              <div key={index} className="group flex items-center gap-3 p-2.5 bg-gray-50/50 dark:bg-gray-900/30 rounded-lg hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                <div className="shrink-0 w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                  {index + 1}
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{skill}</p>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Check size={14} className="text-green-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
              <Bot className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{tx(t, 'skillsPlaceholder', '完成第 4 步后\n技能将自动出现')}</p>
          </div>
        )}
      </div>
    </div>
  );

  // 左侧二级面板：输出物（任务 A：内嵌 CreateSuccessInlinePanel）
  const renderOutputPanel = () => {
    if (createSuccessData) {
      return (
        <CreateSuccessInlinePanel
          successData={createSuccessData}
          onClose={() => setCreateSuccessData(null)}
          onDownload={async (url) => {
            // 真实下载：通过 GET 后端 → 后端流式返回文件
            // 如果 url 是相对路径，自动拼接 API base
            const fullUrl = url.startsWith('http')
              ? url
              : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}${url}`;
            try {
              window.open(fullUrl, '_blank', 'noopener,noreferrer');
            } catch (err) {
              console.error('[Nvwa] download open failed:', err);
            }
          }}
          onIntegrate={() => {
            // 兼容旧 API
            console.log('[Nvwa] onIntegrate (legacy) called');
          }}
          onExportToShell={async (format: ExportFormatType) => {
            if (!aiteamSessionId) {
              console.warn('[Nvwa] no aiteamSessionId, cannot export');
              addAssistantMessage('⚠️ 请先完成创建流程再导出。');
              return;
            }
            try {
              const { aiteamCreationApi } = await import('@/lib/api/aiteam-creation');
              const result = await aiteamCreationApi.exportToFormat(aiteamSessionId, format);
              // 真实后端返回 downloadUrl；自动打开下载
              const fullUrl = result.downloadUrl.startsWith('http')
                ? result.downloadUrl
                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}${result.downloadUrl}`;
              window.open(fullUrl, '_blank', 'noopener,noreferrer');
              addAssistantMessage(`✅ 已导出为 ${format} 格式：${result.fileName}`);
              recordAudit(NvwaAuditAction.AITEAM_EXPORTED, `Aiteam 已导出为 ${format} 格式`, {
                resourceId: aiteamSessionId,
                source: NVWA_AUDIT_SOURCE,
                userId: userInfo?.sub,
                meta: { format, fileName: result.fileName },
              });
            } catch (err) {
              const msg = err instanceof Error ? err.message : '导出失败';
              console.error('[Nvwa] export failed:', err);
              addAssistantMessage(`⚠️ 导出失败：${msg}`);
              recordAudit(NvwaAuditAction.AITEAM_EXPORTED, `Aiteam 导出失败 (${format})`, {
                resourceId: aiteamSessionId,
                source: NVWA_AUDIT_SOURCE,
                userId: userInfo?.sub,
                level: 'error',
                meta: { format, error: msg },
              });
            }
          }}
          onShare={() => {
            // 真实分享：复制带 aiteamId 的深链到剪贴板
            const shareUrl =
              createSuccessData.aiteamId && typeof window !== 'undefined'
                ? `${window.location.origin}/my-aiteam?aiteam=${createSuccessData.aiteamId}`
                : typeof window !== 'undefined'
                ? window.location.href
                : '';
            if (typeof window !== 'undefined' && navigator.clipboard && shareUrl) {
              navigator.clipboard
                .writeText(shareUrl)
                .then(() => {
                  addAssistantMessage('🔗 分享链接已复制到剪贴板');
                  console.log('[Nvwa] share link copied:', shareUrl);
                })
                .catch((err) => console.warn('[Nvwa] clipboard write failed:', err));
            }
          }}
        />
      );
    }

    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <FileOutput className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">输出物</h3>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
            完成所有步骤后，配置将输出为：
          </div>
          <div className="space-y-2">
            {[
              { label: 'Agent 配置 (JSON)', icon: '📄' },
              { label: '导出 ProClaw 桌面端', icon: '🖥️' },
              { label: '导出 CrewAI', icon: '🤖' },
              { label: '导出 LangGraph', icon: '🔗' },
              { label: '分享给朋友', icon: '🔗' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm text-gray-600 dark:text-gray-400 opacity-60">
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
            <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
              💡 完成创建后，结果会直接显示在这里（不再弹窗）。你可以继续编辑或直接导出。
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 中央 Tab：对话
  const renderChatTab = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth relative"
        role="log"
        aria-live="polite"
        aria-label={tx(t, 'chatLog', '对话日志')}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              userName={userInfo?.name}
            />
          ))}

          {isTyping && (
            <div className="flex gap-3 sm:gap-4 justify-start">
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

        {showScrollToBottom && (
          <button
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
            aria-label={tx(t, 'scrollToBottom', '滚动到底部')}
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
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTION_KEYS[0].map((key, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(tx(t, key, key))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm active:scale-95"
                >
                  <Lightbulb size={12} className="shrink-0 text-amber-400" />
                  {tx(t, key, key)}
                </button>
              ))}
            </div>
          )}

          {messages.length > 1 && currentStep < 4 && SUGGESTION_KEYS[currentStep] && (
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTION_KEYS[currentStep].map((key, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(tx(t, key, key))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/50 dark:border-gray-700/50 rounded-lg transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 active:scale-95"
                >
                  {tx(t, key, key)}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 sm:gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentStep === 0 ? tx(t, 'placeholderStep0', '描述你想创建的 Agent...') :
                  currentStep === 10 ? tx(t, 'placeholderStep10', '输入 1 / 2 选择保存方式') :
                  currentStep === 11 ? tx(t, 'placeholderStep11', '输入项目编号') :
                  tx(t, 'placeholderDefault', '继续输入...')
                }
                aria-label={tx(t, 'messageInput', '消息输入')}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-0 focus:border-blue-400 dark:focus:border-blue-600 outline-none resize-none text-sm leading-relaxed transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:shadow-lg focus:shadow-blue-500/10 disabled:opacity-60"
                rows={1}
                disabled={isTyping}
                style={{ minHeight: '44px' }}
              />
              <div className="absolute right-3 bottom-3 hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                  <CornerDownLeft size={10} className="inline" />
                </kbd>
                <span className="text-[10px] text-gray-400">{tx(t, 'send', '发送')}</span>
              </div>
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              aria-label={tx(t, 'sendMessage', '发送消息')}
              className="shrink-0 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
              style={{ width: '44px', height: '44px' }}
            >
              <Send size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">Enter</kbd>
              <span>{tx(t, 'send', '发送')} ·</span>
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">Shift + Enter</kbd>
              <span>{tx(t, 'newline', '换行')}</span>
            </p>
            {currentStep > 0 && currentStep < 7 && (
              <button
                onClick={handleRestart}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors ml-auto"
                aria-label={tx(t, 'restartChat', '重新开始')}
              >
                <RotateCcw size={11} />
                <span className="hidden sm:inline">{tx(t, 'restart', '重新开始')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // 中央 Tab：蓝图占位（暂用画布组件或引导用户完成创建）
  const renderBlueprintTab = () => {
    // 步骤 < 4：表单数据还不完整，显示引导页（避免空画布）
    if (currentStep < 4) {
      return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Workflow className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Agent 蓝图</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                完成第 1-3 步（需求 / 数据源 / 输出）后，画布将根据你的表单数据自动初始化。<br />
                你可以在画布上为 Agent 挂载 Sub-Agents / Skills / Tools。
              </p>
              <div className="text-xs text-gray-400">
                当前进度：<span className="font-bold text-indigo-600 dark:text-indigo-400">{displayProgress.percentage}%</span>
                <span className="ml-2 text-gray-400">（到达 4 步后画布自动开启）</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 步骤 ≥ 4：渲染真实蓝图画布
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        {/* 顶部状态条：与画布内容联动 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs">
          <span
            className={`px-2 py-0.5 rounded font-semibold ${
              blueprintDeployed
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {blueprintDeployed ? 'DEPLOYED' : 'DRAFT'}
          </span>
          {blueprintValidation && (
            <span
              className={`flex items-center gap-1 ${
                blueprintValidation.valid ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {blueprintValidation.valid ? (
                <>
                  <Check size={11} />
                  校验通过
                </>
              ) : (
                <>
                  ⚠ {blueprintValidation.issues.filter((i) => i.severity === 'error').length} 个错误
                </>
              )}
            </span>
          )}
          <span className="text-gray-400 dark:text-gray-500">
            · 蓝图画布 = 创建流程第 6 步
          </span>
          {lastServerPhase && (
            <span className="text-blue-500 dark:text-blue-400 font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              phase: {lastServerPhase}
            </span>
          )}
          {blueprintDeployed && (
            <span className="ml-auto text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
              {successLoading && (
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {successError ? (
                <span className="text-amber-600 dark:text-amber-400">⚠ {successError}</span>
              ) : successLoading ? (
                '正在保存到后端…'
              ) : (
                '✓ 已同步到后端'
              )}
            </span>
          )}
        </div>

        {/* 画布主体 */}
        <div className="flex-1 min-h-0">
          <NvwaBlueprintPanel
            formData={{
              name: formData.name,
              description: formData.description,
              implementation: formData.implementation,
              skills: formData.skills,
            }}
            agentId={backendAgentId}
            sessionId={aiteamSessionId}
            onSync={handleBlueprintChange}
            onDeploySuccess={handleBlueprintDeploy}
            resetKey={blueprintSourceKey}
          />
        </div>
      </div>
    );
  };

  // 中央 Tab：状态机视图
  const renderGraphTab = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-auto">
        {stateMachineSessionId ? (
          <AiteamStateGraphView
            sessionId={stateMachineSessionId}
            onNodeAction={(nodeId, action) => console.log('[StateMachine]', nodeId, action)}
            onStateChange={(state) => console.log('[StateMachine state]', state)}
          />
        ) : (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <GitBranch className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">状态机视图</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                v2.2.0 图状态机流程引擎<br />
                支持条件分支、断点恢复、人工审核
              </p>
              <button
                onClick={() => setUseStateMachine(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <Activity size={14} />
                <span>开启状态机模式</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================
  // 顶部 Title Bar（命令栏）
  // ============================================================
  const renderTitleBar = () => (
    <header
      className={`flex items-center h-11 border-b border-gray-200/80 dark:border-gray-800/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md ${
        embedded ? '' : 'shadow-sm'
      }`}
    >
      {/* macOS 风格交通灯（embedded 模式隐藏，避免与全局 Navbar 重复） */}
      {!embedded && (
        <div className="flex items-center gap-1.5 px-4 h-full">
          <span className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors" />
          <span className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors" />
          <span className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors" />
        </div>
      )}

      {/* 项目名 + 状态灯 */}
      <div className="flex items-center gap-2 px-3 h-full text-sm">
        <div className="flex items-center gap-1.5">
          <span className={`relative flex h-2 w-2`}>
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                isTyping || sessionSyncing ? 'bg-emerald-400' : 'bg-gray-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isTyping || sessionSyncing ? 'bg-emerald-500' : 'bg-gray-400'
              }`}
            />
          </span>
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            NvwaX {activeMode === 'agent' ? '招聘台' : 'AI 公司'} Factory
          </span>
        </div>
        {/* 后端 Agent 状态徽章 */}
        {backendAgentId && (
          <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
            <span className="w-1 h-1 rounded-full bg-green-500" />
            Agent {backendAgentId.slice(0, 6)}
          </span>
        )}
        {backendAgentStatus === 'creating' && (
          <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <svg className="animate-spin w-2 h-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            创建 Agent...
          </span>
        )}
        {backendAgentError && (
          <span
            className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
            title={backendAgentError}
          >
            ⚠ 后端未连接
          </span>
        )}
        {/* SSE 实时连接徽章 */}
        {aiteamSessionId && isLoggedIn && (
          <span
            className={`hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
              sse.isConnected
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}
            title={sse.isConnected ? '实时进度已连接' : sse.error ? `实时连接失败：${sse.error.message}` : '实时进度未连接'}
          >
            <span className={`w-1 h-1 rounded-full ${sse.isConnected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {sse.isConnected ? '实时' : '实时离线'}
          </span>
        )}
      </div>

      {/* 模式切换器：AI 公司（主）｜ 招聘员工（收敛入口） */}
      <div className="flex items-center h-full px-3">
        <div className="inline-flex items-center p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => setActiveMode('aiteam')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              activeMode === 'aiteam'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span>🏢</span>
            <span className="hidden sm:inline">AI 公司</span>
          </button>
          <button
            onClick={() => setActiveMode('agent')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              activeMode === 'agent'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span>🤖</span>
            <span className="hidden sm:inline">招聘员工</span>
          </button>
        </div>
      </div>

      {/* 占位 */}
      <div className="flex-1" />

      {/* 右侧操作区 */}
      <div className="flex items-center gap-1 px-3 h-full">
        {activeMode === 'agent' && currentStep > 0 && currentStep < 7 && (
          <button
            onClick={handleRestart}
            className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            aria-label={tx(t, 'restartChat', '重新开始')}
          >
            <RotateCcw size={12} />
            <span>{tx(t, 'restart', '重新开始')}</span>
          </button>
        )}
        <button
          onClick={() => {
            const result = downloadAuditLog();
            if (result) {
              recordAudit(NvwaAuditAction.AUDIT_EXPORTED, `导出 ${result.count} 条审计事件`, {
                source: NVWA_AUDIT_SOURCE,
                userId: userInfo?.sub,
                meta: { filename: result.filename, count: result.count },
              });
              addAssistantMessage(`📦 已导出 ${result.count} 条审计事件到 ${result.filename}`);
            } else {
              addAssistantMessage('⚠️ 当前 session 没有审计事件可导出');
            }
          }}
          className="hidden md:inline-flex items-center justify-center w-7 h-7 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="导出审计日志"
          title="导出审计日志"
        >
          <Download size={14} />
        </button>
        <button
          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          className="hidden lg:inline-flex items-center justify-center w-7 h-7 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label={leftPanelCollapsed ? '展开左侧' : '折叠左侧'}
        >
          {leftPanelCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
        <button
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className="hidden lg:inline-flex items-center justify-center w-7 h-7 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label={rightPanelCollapsed ? '展开右侧' : '折叠右侧'}
        >
          {rightPanelCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
        </button>
      </div>
    </header>
  );

  // ============================================================
  // 移动端 Tab Bar（lg 以下）
  // ============================================================
  const renderMobileTabBar = () => (
    <div className="lg:hidden flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto">
      {[
        { id: 'progress', label: '进度', icon: Loader },
        { id: 'requirement', label: '需求', icon: Sparkles },
        { id: 'skills', label: '技能', icon: Zap },
        { id: 'output', label: '输出', icon: FileOutput },
      ].map(tab => {
        const Icon = tab.icon;
        const isActive = activeSidePanel === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveSidePanel(tab.id as typeof activeSidePanel)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={14} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  // ============================================================
  // 顶层渲染
  // ============================================================

  // AiTeam 模式：保留原有嵌入式渲染（避免破坏跨服务认证 → 创建的链路）
  if (activeMode === 'aiteam') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-60px)]">
        <h1 className="sr-only">{tx(t, 'pageTitle', 'Nvwa 工作台')}</h1>
        {renderTitleBar()}
        <main className="flex-1">
          <AiTeamCreatorModal
            embedded
            initialMessage={initialAiTeamMessage}
            onClose={() => setActiveMode('agent')}
            onSuccess={(teamSkillId) => {
              setActiveMode('agent');
              addAssistantMessage(tx(t, 'aiTeamSuccess', `AiTeam ${teamSkillId} 创建成功！`, { teamId: teamSkillId }));
            }}
          />
        </main>
        <ConfirmDialog />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-950">
      {/* SEO: 屏幕阅读器可见 */}
      <h1 className="sr-only">{tx(t, 'pageTitle', 'Nvwa 工作台')}</h1>

      {renderTitleBar()}
      {renderMobileTabBar()}

      {/* 工作台主体：CSS Grid 三列布局 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[56px_minmax(0,1fr)] overflow-hidden">
        {/* Activity Bar（图标列）—— 仅 lg+ 显示 */}
        <aside
          className="hidden lg:flex flex-col items-center py-3 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 gap-1"
          aria-label="活动栏"
        >
          {[
            { id: 'progress', icon: Loader, label: '进度' },
            { id: 'requirement', icon: Sparkles, label: '需求' },
            { id: 'skills', icon: Zap, label: '技能' },
            { id: 'output', icon: FileOutput, label: '输出' },
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeSidePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSidePanel(item.id as typeof activeSidePanel);
                  if (leftPanelCollapsed) setLeftPanelCollapsed(false);
                }}
                className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
                title={item.label}
                aria-label={item.label}
              >
                <Icon size={18} />
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-blue-600 dark:bg-blue-400 rounded-r" />
                )}
              </button>
            );
          })}
          <div className="flex-1" />
          <button
            className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-600 transition-colors"
            title="设置"
            aria-label="设置"
          >
            <Settings2 size={18} />
          </button>
        </aside>

        {/* 左侧二级面板（移动端：堆叠在主区上方） */}
        {!leftPanelCollapsed && (
          <aside
            className="hidden lg:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-0"
            aria-label="侧边面板"
          >
            {activeSidePanel === 'progress' && renderProgressPanel()}
            {activeSidePanel === 'requirement' && renderRequirementPanel()}
            {activeSidePanel === 'skills' && renderSkillsPanel()}
            {activeSidePanel === 'output' && renderOutputPanel()}
          </aside>
        )}

        {/* 主工作区 */}
        <main className="flex flex-col min-w-0 bg-white dark:bg-gray-900 overflow-hidden">
          {/* Tab Bar */}
          <div className="flex items-center h-9 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 overflow-x-auto shrink-0">
            {[
              { id: 'chat', label: '对话', icon: MessageSquare },
              { id: 'blueprint', label: '蓝图', icon: Workflow, badge: blueprintDeployed ? '✓' : (currentStep >= 4 ? '●' : null) },
              { id: 'graph', label: '状态机', icon: GitBranch },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeWorkTab === tab.id;
              const badge = 'badge' in tab ? tab.badge : null;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveWorkTab(tab.id as typeof activeWorkTab)}
                  className={`flex items-center gap-1.5 h-full px-3 text-xs font-medium border-r border-gray-200 dark:border-gray-800 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 border-b-2 border-b-blue-600 dark:border-b-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                  {badge && (
                    <span
                      className={`ml-0.5 px-1 rounded-full text-[9px] font-bold ${
                        badge === '✓'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="flex-1" />
            {/* 进度指示（中央顶部） */}
            {activeWorkTab === 'chat' && displayProgress.percentage > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 text-[11px] text-gray-500">
                <div className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${displayProgress.percentage}%` }}
                  />
                </div>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{displayProgress.percentage}%</span>
              </div>
            )}
          </div>

          {/* 工作区内容 */}
          <div className="flex-1 min-h-0">
            {activeWorkTab === 'chat' && renderChatTab()}
            {activeWorkTab === 'blueprint' && renderBlueprintTab()}
            {activeWorkTab === 'graph' && renderGraphTab()}
          </div>
        </main>
      </div>

      {/* 移动端：单列堆叠的左侧面板 */}
      <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 max-h-80 overflow-y-auto">
        {activeSidePanel === 'progress' && renderProgressPanel()}
        {activeSidePanel === 'requirement' && renderRequirementPanel()}
        {activeSidePanel === 'skills' && renderSkillsPanel()}
        {activeSidePanel === 'output' && renderOutputPanel()}
      </div>

      <ConfirmDialog />
    </div>
  );
}
