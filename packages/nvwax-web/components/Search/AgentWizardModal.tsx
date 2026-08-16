'use client';

/**
 * AgentWizardModal - v2.2.0 三步 Agent 创建向导
 *
 * 集成 v2.2.0 后端：
 * - agent-registry.service.ts (语义匹配 + Agent 注册)
 * - nvwax-mcp-server.ts (MCP 协议接口)
 * - CreationStateMachine (状态机)
 *
 * UI 集成：
 * - WizardStepper (顶部步骤指示)
 * - IndustryTemplateCard (Step 1 行业选择)
 * - SandboxChat (Step 3 沙箱测试)
 *
 * 改造前 vs 改造后：
 * - 改造前: 单一弹窗，所有字段堆叠，无引导 (CreateAgentModal.tsx, 270 行)
 * - 改造后: 3 步向导，每步聚焦，实时预览，所见即所得
 *
 * @example
 * ```tsx
 * <AgentWizardModal
 *   isOpen={showWizard}
 *   onClose={() => setShowWizard(false)}
 *   initialQuery="营销内容创作"
 *   onSuccess={(agent) => console.log('Created:', agent)}
 * />
 * ```
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Sparkles, Bot, ChevronRight, ChevronLeft, Save, Check, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  WizardStepper,
  type WizardStep,
  type WizardStepStatus,
  IndustryTemplateGrid,
  type IndustryType,
  type IndustryTemplate,
  SandboxChat,
  type SandboxMessage,
} from '@/components/UI';
import agentWizardApi, {
  type CreateAgentRequest,
  type CreateAgentResponse,
  type AgentMatchResult,
} from '@/lib/api/agent-wizard';

// ============================================================
// 类型定义
// ============================================================

export interface AgentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 初始查询关键词（来自搜索框） */
  initialQuery?: string;
  /** 推荐 Skills（来自旧版 CreateAgentModal，向后兼容） */
  initialSkills?: Array<{ id: string; name: string; description: string; category?: string; relevanceScore: number }>;
  /** 创建成功回调 */
  onSuccess?: (response: CreateAgentResponse) => void;
}

type WizardStepId = 'identity' | 'capability' | 'test';

const STEP_IDS: WizardStepId[] = ['identity', 'capability', 'test'];

// ============================================================
// 主组件
// ============================================================

export default function AgentWizardModal({
  isOpen,
  onClose,
  initialQuery = '',
  initialSkills = [],
  onSuccess,
}: AgentWizardModalProps) {
  const t = useTranslations('agentWizard');

  // ============================================================
  // 状态
  // ============================================================

  // 向导状态
  const [currentStepId, setCurrentStepId] = useState<WizardStepId>('identity');
  const [stepStatus, setStepStatus] = useState<Record<WizardStepId, WizardStepStatus>>({
    identity: 'active',
    capability: 'pending',
    test: 'pending',
  });

  // Step 1: 身份与定位
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType | null>(null);

  // Step 2: 能力配置
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [agentMatches, setAgentMatches] = useState<AgentMatchResult[]>([]);
  const [skillNames, setSkillNames] = useState<Record<string, string>>({}); // id -> name
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Step 3: 沙箱测试
  const [sandboxMessages, setSandboxMessages] = useState<SandboxMessage[]>([]);

  // 提交
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ============================================================
  // 副作用：初始化
  // ============================================================

  useEffect(() => {
    if (!isOpen) return;

    // 初始化时填充
    if (initialQuery) {
      setDescription(initialQuery);
    }

    // 兼容旧版：从 initialSkills 填充
    if (initialSkills.length > 0) {
      const ids = initialSkills.map(s => s.id);
      const nameMap: Record<string, string> = {};
      initialSkills.forEach(s => {
        nameMap[s.id] = s.name;
      });
      setSelectedSkills(ids);
      setSkillNames(nameMap);
    }
  }, [isOpen, initialQuery, initialSkills]);

  // 监听 industry 变化：自动填充 capabilities 和 skills
  useEffect(() => {
    if (!selectedIndustry) return;

    // 通过模板填充 - 这里使用客户端预置逻辑
    // 实际可调用后端 searchAgents 获取更精确的推荐
    const templatePresets: Record<IndustryType, { capabilities: string[]; skills: string[] }> = {
      marketing: {
        capabilities: ['content_strategy', 'social_media', 'copywriting', 'trend_analysis'],
        skills: ['content_strategy', 'social_media_posting', 'trend_analysis', 'data_analytics'],
      },
      development: {
        capabilities: ['frontend', 'backend', 'database', 'testing', 'devops'],
        skills: ['code_generation', 'code_review', 'unit_testing', 'api_design', 'database_design'],
      },
      'customer-service': {
        capabilities: ['customer_communication', 'sentiment_analysis', 'problem_solving'],
        skills: ['intent_recognition', 'faq_matching', 'order_query', 'sentiment_analysis'],
      },
      'data-analysis': {
        capabilities: ['data_analysis', 'sql', 'python', 'visualization'],
        skills: ['sql_query', 'data_visualization', 'statistical_analysis', 'report_generation'],
      },
      custom: { capabilities: [], skills: [] },
    };

    const preset = templatePresets[selectedIndustry];
    if (preset.capabilities.length > 0) {
      setCapabilities(preset.capabilities);
    }
    if (preset.skills.length > 0) {
      // 合并到 selectedSkills（用 skill name 作为 id）
      const newSkillNames: Record<string, string> = { ...skillNames };
      preset.skills.forEach(s => {
        newSkillNames[s] = s.replace(/_/g, ' ');
        if (!selectedSkills.includes(s)) {
          setSelectedSkills(prev => [...prev, s]);
        }
      });
      setSkillNames(newSkillNames);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndustry]);

  // 监听 description 变化：触发后端语义搜索（debounce）
  useEffect(() => {
    if (!description || description.length < 3) {
      setAgentMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingMatches(true);
      try {
        const result = await agentWizardApi.searchAgents(description, capabilities, 5);
        if (result.success && result.results.length > 0) {
          setAgentMatches(result.results);
        }
      } catch (err) {
        // 静默失败，使用本地模板即可
        console.warn('Agent search failed:', err);
      } finally {
        setLoadingMatches(false);
      }
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]);

  // ============================================================
  // 计算属性
  // ============================================================

  // WizardStepper 步骤列表
  const steps: WizardStep[] = useMemo(() => [
    {
      id: 'identity',
      title: t('stepIdentityTitle'),
      description: t('stepIdentityDesc'),
      status: stepStatus.identity,
      icon: <Bot size={14} />,
    },
    {
      id: 'capability',
      title: t('stepCapabilityTitle'),
      description: t('stepCapabilityDesc'),
      status: stepStatus.capability,
      icon: <Sparkles size={14} />,
    },
    {
      id: 'test',
      title: t('stepTestTitle'),
      description: t('stepTestDesc'),
      status: stepStatus.test,
      icon: <Save size={14} />,
    },
  ], [stepStatus, t]);

  // 当前步骤序号（0-2）
  const currentStepIndex = STEP_IDS.indexOf(currentStepId);

  // 是否可以进入下一步
  const canProceed = useMemo(() => {
    switch (currentStepId) {
      case 'identity':
        return name.trim().length >= 2 && description.trim().length >= 5;
      case 'capability':
        return selectedSkills.length > 0;
      case 'test':
        return true; // 测试步骤可保存
      default:
        return false;
    }
  }, [currentStepId, name, description, selectedSkills]);

  // 当前 SandboxChat 的 executor（调用后端）
  const sandboxExecutor = useCallback(async (input: string, _history: SandboxMessage[]) => {
    try {
      // 调用后端 analyze_requirements 模拟 Agent 响应
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/mcp/tools/call`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'nvwax_analyze_requirements',
            arguments: { user_input: input }
          })
        }
      );

      const data = await response.json();
      const text = data?.content?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        const analysis = parsed.analysis;
        const targetUsersLine = analysis.targetUsers
          ? t('targetUsersLine', { targetUsers: analysis.targetUsers })
          : '';
        const specialRequirementsLine = analysis.specialRequirements
          ? t('specialRequirementsLine', { specialRequirements: analysis.specialRequirements })
          : '';
        return {
          content: t('analysisResult', {
            name: name || 'Agent',
            companyType: analysis.companyType,
            responsibilities: analysis.responsibilities?.join('、') || '未指定',
            outputs: analysis.expectedOutputs?.join('、') || '未指定',
            confidence: (analysis.confidence * 100).toFixed(0),
            targetUsers: targetUsersLine,
            specialRequirements: specialRequirementsLine,
          }),
          tokens: text.length,
          durationMs: 800 + Math.random() * 400,
        };
      }
      throw new Error('Empty response');
    } catch (err: any) {
      // 降级为本地 mock
      return {
        content: t('mockResponse', {
          name: name || 'Agent',
          input,
          count: selectedSkills.length,
        }),
        tokens: input.length * 2,
        durationMs: 600 + Math.random() * 300,
      };
    }
  }, [name, selectedSkills.length, t]);

  // ============================================================
  // 事件处理
  // ============================================================

  /**
   * 跳到指定步骤
   */
  const goToStep = useCallback((targetStepId: WizardStepId) => {
    setCurrentStepId(targetStepId);
  }, []);

  /**
   * 下一步
   */
  const handleNext = useCallback(() => {
    if (!canProceed) return;

    // 标记当前步骤为完成
    setStepStatus(prev => ({ ...prev, [currentStepId]: 'completed' }));

    // 进入下一步
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_IDS.length) {
      const nextStepId = STEP_IDS[nextIndex];
      setCurrentStepId(nextStepId);
      setStepStatus(prev => ({ ...prev, [nextStepId]: 'active' }));
    }
  }, [canProceed, currentStepId, currentStepIndex]);

  /**
   * 上一步
   */
  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      // 标记当前为 pending
      setStepStatus(prev => ({ ...prev, [currentStepId]: 'pending' }));
      const prevStepId = STEP_IDS[prevIndex];
      setCurrentStepId(prevStepId);
      setStepStatus(prev => ({ ...prev, [prevStepId]: 'active' }));
    }
  }, [currentStepId, currentStepIndex]);

  /**
   * 跳到指定步骤（点击 Stepper）
   */
  const handleStepClick = useCallback((step: WizardStep) => {
    if (step.id === currentStepId) return;
    // 只允许跳转到已完成或当前步骤
    if (step.status === 'completed' || step.status === 'active') {
      goToStep(step.id as WizardStepId);
    }
  }, [currentStepId, goToStep]);

  /**
   * 提交：调用 v2.2.0 后端
   */
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const request: CreateAgentRequest = {
        name: name.trim(),
        description: description.trim(),
        industry: selectedIndustry || 'custom',
        capabilities,
        skills: selectedSkills,
        tools: [],
        modelParams: {
          model: 'deepseek-chat',
          temperature: 0.7,
        },
        metadata: {
          template: selectedIndustry || undefined,
          tags: capabilities.slice(0, 3),
        },
      };

      const result = await agentWizardApi.createAgent(request);
      if (result.success) {
        // 标记测试步骤为完成
        setStepStatus(prev => ({ ...prev, test: 'completed' }));
        onSuccess?.(result);
        // 短暂显示成功后关闭
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setSubmitError(result.error || '创建失败，请重试');
        setStepStatus(prev => ({ ...prev, test: 'error' }));
      }
    } catch (err: any) {
      setSubmitError(err.message || '网络错误');
      setStepStatus(prev => ({ ...prev, test: 'error' }));
    } finally {
      setSubmitting(false);
    }
  }, [submitting, name, description, selectedIndustry, capabilities, selectedSkills, onSuccess, onClose]);

  /**
   * 重置状态（关闭时）
   */
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // ============================================================
  // 渲染各步骤内容
  // ============================================================

  const renderStepContent = () => {
    switch (currentStepId) {
      case 'identity':
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t('agentNameLabel')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('agentNamePlaceholder')}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                maxLength={50}
              />
              <p className="mt-1 text-xs text-gray-500">{name.length}/50</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t('agentDescLabel')} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('agentDescPlaceholder')}
                rows={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white resize-none"
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">{description.length}/500</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t('industryLabel')} <span className="text-gray-400 text-xs font-normal">{t('industryRecommended')}</span>
              </label>
              <IndustryTemplateGrid
                selectedId={selectedIndustry || undefined}
                onSelect={(tpl: IndustryTemplate) => setSelectedIndustry(tpl.id)}
                size="md"
                columns={2}
              />
            </div>
          </div>
        );

      case 'capability':
        return (
          <div className="space-y-5">
            {/* Capabilities 标签 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t('capabilitiesLabel')}
                <span className="ml-2 text-xs text-gray-500 font-normal">
                  {selectedIndustry ? t('capabilitiesAutoFilled') : t('capabilitiesClickToAdd')}
                </span>
              </label>
              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                {capabilities.length === 0 ? (
                  <span className="text-sm text-gray-400">{t('noCapabilities')}</span>
                ) : (
                  capabilities.map(cap => (
                    <span
                      key={cap}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full"
                    >
                      {cap}
                      <button
                        onClick={() => setCapabilities(prev => prev.filter(c => c !== cap))}
                        className="hover:text-blue-900 dark:hover:text-blue-100"
                        aria-label={t('removeCapability', { cap })}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Skills 多选 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t('skillsLabel')} <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-gray-500 font-normal">
                  {selectedSkills.length} 个
                </span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                {selectedSkills.length === 0 ? (
                  <div className="text-center py-4 text-sm text-gray-400">
                    {t('noSkills')}
                  </div>
                ) : (
                  selectedSkills.map(skill => (
                    <div
                      key={skill}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-green-600" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {skillNames[skill] || skill}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedSkills(prev => prev.filter(s => s !== skill))}
                        className="text-gray-400 hover:text-red-500"
                        aria-label={t('removeSkill', { skill })}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 后端推荐 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t('smartRecommend')} <span className="text-xs text-gray-500 font-normal">{t('smartRecommendHint')}</span>
              </label>
              <div className="p-3 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 min-h-[60px]">
                {loadingMatches ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Sparkles size={14} className="animate-pulse" />
                    <span>{t('searchingAgents')}</span>
                  </div>
                ) : agentMatches.length > 0 ? (
                  <div className="space-y-2">
                    {agentMatches.slice(0, 3).map(match => (
                      <div key={match.agent.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {match.agent.name}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {t('matchPercent', { percent: (match.score * 100).toFixed(0) })}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (!selectedSkills.includes(match.agent.id)) {
                              setSelectedSkills(prev => [...prev, match.agent.id]);
                              setSkillNames(prev => ({ ...prev, [match.agent.id]: match.agent.name }));
                            }
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {t('reference')}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {t('recommendEmpty')}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="space-y-4">
            {/* 配置预览 */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Check size={14} className="text-green-600" />
                {t('configPreview')}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">{t('fieldName')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{name || t('notSet')}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('fieldIndustry')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedIndustry || t('custom')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">{t('fieldCapabilities')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{capabilities.length} 个</span>
                </div>
                <div>
                  <span className="text-gray-500">{t('fieldSkills')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedSkills.length} 个</span>
                </div>
              </div>
            </div>

            {/* 错误提示 */}
            {submitError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">{t('createFailed')}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{submitError}</p>
                </div>
              </div>
            )}

            {/* 沙箱对话 */}
            <SandboxChat
              title={t('sandboxTitle')}
              agentName={name || 'Agent'}
              systemHint={t('sandboxHint')}
              executor={sandboxExecutor}
              initialMessages={[]}
              maxMessages={20}
              height="h-64"
            />
          </div>
        );
    }
  };

  // ============================================================
  // 渲染主组件
  // ============================================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {t('title')}
                <span className="ml-2 text-xs font-normal text-gray-500">{t('versionBadge')}</span>
              </h2>
              {initialQuery && (
                <p className="text-xs text-gray-500">
                  {t('basedOnQuery', { query: initialQuery })}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={t('close')}
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
          <WizardStepper
            steps={steps}
            currentStepId={currentStepId}
            onStepClick={handleStepClick}
            size="sm"
            showDescription={false}
          />
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && currentStepId !== 'test' && (
              <button
                onClick={handleBack}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <ChevronLeft size={16} />
                {t('prevStep')}
              </button>
            )}

            {currentStepId === 'test' ? (
              <button
                onClick={handleSubmit}
                disabled={submitting || !name || !description}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {submitting ? (
                  <>
                    <Sparkles size={16} className="animate-spin" />
                    {t('creating')}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {t('saveAndPublish')}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="inline-flex items-center gap-1 px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('nextStep')}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
