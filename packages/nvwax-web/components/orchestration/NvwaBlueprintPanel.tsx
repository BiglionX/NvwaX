'use client';

/**
 * NvwaBlueprintPanel — Nvwa 工作台蓝图 Tab 的智能包装层（v2.3+ 真实后端）
 * ----------------------------------------------------------------
 * 封装 AgentBlueprintCanvas，对接真实后端：
 * - 从 Nvwa 表单数据（formData）自动派生 initial BlueprintConfig
 * - 用户在画布上的 onChange → 同步 upsert 到 /api/blueprints（draft）
 * - 用户点击 Deploy → 走 Draft → Deploy 门禁 → 调 /api/blueprints/:id/deploy
 * - 部署成功后通过 onDeploySuccess 把后端返回的 blueprintId / sessionId 传回 Nvwa
 *
 * 与 `mode='seed'` 版本的区别：
 * - 真实模式下，画布的"Deploy"按钮会真正把 config 落到 PostgreSQL
 * - 校验错误从服务端返回，会显示在画布状态条
 * - 取消 seed 的本地模拟部署
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  type BlueprintConfig,
  type BlueprintValidationResult,
  blueprintApi,
} from '@/lib/api/blueprints';

// ReactFlow 依赖浏览器环境，禁用 SSR（与 blueprint-demo 保持一致）
const AgentBlueprintCanvas = dynamic(
  () => import('./AgentBlueprintCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span>蓝图画布加载中…</span>
        </div>
      </div>
    ),
  }
);

/** Nvwa 表单数据子集（与 Client.tsx 中 AgentFormData 对齐） */
export interface NvwaFormDataLike {
  name?: string;
  description?: string;
  implementation?: string;
  skills?: string[];
}

/** 部署成功回调参数 */
export interface NvwaDeploySuccess {
  /** 蓝图 ID（来自 POST /api/blueprints） */
  blueprintId: string;
  /** 部署后的状态 */
  status: 'draft' | 'deployed';
  /** 服务端最终校验结果 */
  validation: BlueprintValidationResult;
  /** 服务端部署时间（status='deployed' 时） */
  deployedAt?: string;
}

export interface NvwaBlueprintPanelProps {
  /** Nvwa 当前表单数据 */
  formData: NvwaFormDataLike;
  /** 当前关联的 Agent ID（用于挂载蓝图） */
  agentId?: string | null;
  /** 可选的会话 ID（用于追溯） */
  sessionId?: string | null;
  /** 画布变更同步回调（不触发网络请求，仅 UI 反馈） */
  onSync?: (snapshot: {
    config: BlueprintConfig;
    validation: BlueprintValidationResult;
  }) => void;
  /** 部署成功回调 */
  onDeploySuccess?: (result: NvwaDeploySuccess, config: BlueprintConfig) => void;
  /** 部署失败回调 */
  onDeployError?: (error: { message: string; validation?: BlueprintValidationResult }) => void;
  /** 根节点默认使用的模型（默认 deepseek-v4-flash） */
  defaultModel?: string;
  /** 可选：强制刷新 initial config（key） */
  resetKey?: string | number;
}

/** 把 Nvwa 表单的 skill 名称映射成 BlueprintSkillRef */
function mapSkillsToBlueprint(skills: string[] | undefined): BlueprintConfig['skills'] {
  if (!skills || skills.length === 0) return [];
  return skills.map((s) => {
    // skillId 用名称的简化形式，便于校验与持久化
    const skillId = `skill-${s.replace(/\s+/g, '-').toLowerCase()}`;
    return {
      agentId: 'ceo',
      skillId,
      skillName: s,
    };
  });
}

/** 从 Nvwa 表单数据构造画布初始 config */
export function buildBlueprintConfigFromForm(
  formData: NvwaFormDataLike,
  defaultModel = 'deepseek-v4-flash'
): BlueprintConfig {
  const description = (formData.description ?? '').trim();
  const name = (formData.name ?? '').trim() || description.slice(0, 20) || '未命名 Agent';

  const root = {
    id: 'ceo',
    name,
    systemPrompt: description
      ? `你是 NvwaX 虚拟公司的 CEO Agent，负责协调团队完成用户任务。\n\n【用户需求】\n${description}`
      : '你是 NvwaX 虚拟公司的 CEO Agent，负责协调团队完成用户任务。',
    model: defaultModel,
    temperature: 0.7,
  };

  // 当用户描述了"实现方式"或具体业务，自动挂一个团队架构师子代理
  const subagents: BlueprintConfig['subagents'] = [];
  if ((formData.implementation ?? '').trim()) {
    subagents.push({
      id: 'team_architect',
      name: '团队架构师',
      systemPrompt: `根据以下实现要求设计虚拟公司的角色矩阵与协作关系：\n\n${formData.implementation}`,
      parentId: 'ceo',
    });
  }

  return {
    root,
    subagents,
    skills: mapSkillsToBlueprint(formData.skills),
    tools: [],
  };
}

/**
 * 构造一条客户端错误 issue（severity 固定为 'error'，类型安全）
 */
function errorIssue(message: string): BlueprintValidationResult['issues'][number] {
  return { path: '', message, severity: 'error' };
}

export default function NvwaBlueprintPanel({
  formData,
  agentId,
  sessionId,
  onSync,
  onDeploySuccess,
  onDeployError,
  defaultModel = 'deepseek-v4-flash',
  resetKey,
}: NvwaBlueprintPanelProps) {
  // 当前已存在的蓝图 ID（首次 upsert 后填入）
  const blueprintIdRef = useRef<string | null>(null);
  // 网络请求中标记（避免重复 upsert）
  const inflightUpsertRef = useRef<Promise<string | null> | null>(null);
  // 最近一次服务端校验（用于状态条展示）
  const [lastServerValidation, setLastServerValidation] = useState<BlueprintValidationResult | null>(null);
  // 网络错误提示
  const [networkError, setNetworkError] = useState<string | null>(null);

  // 根据表单派生初始 config；当 resetKey 变化时强制重建
  const initialConfig = useMemo(
    () => buildBlueprintConfigFromForm(formData, defaultModel),
    [resetKey, formData.name, formData.description, formData.implementation, (formData.skills ?? []).join('|')]
  );

  /**
   * 把当前 config upsert 到 /api/blueprints（draft）。
   * 同一组件多次调用会自动 dedupe（in-flight promise 复用）。
   * 没有 agentId 时退化为本地占位（保留旧 mode='seed' 行为，避免破坏）。
   */
  const upsertDraft = useCallback(
    async (config: BlueprintConfig): Promise<string | null> => {
      // 没有 agentId → 不能挂到任何 agent 上，返回 null 走"本地模式"路径
      if (!agentId) {
        return null;
      }
      if (inflightUpsertRef.current) {
        return inflightUpsertRef.current;
      }
      const promise = (async () => {
        try {
          setNetworkError(null);
          if (blueprintIdRef.current) {
            const r = await blueprintApi.update(blueprintIdRef.current, config);
            setLastServerValidation(r.validation);
            return blueprintIdRef.current;
          } else {
            const r = await blueprintApi.create({
              agentId,
              sessionId: sessionId ?? undefined,
              config,
            });
            blueprintIdRef.current = r.data.id;
            setLastServerValidation(r.validation);
            return r.data.id;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Blueprint upsert failed';
          setNetworkError(msg);
          console.error('[NvwaBlueprintPanel] upsertDraft failed:', err);
          return null;
        } finally {
          inflightUpsertRef.current = null;
        }
      })();
      inflightUpsertRef.current = promise;
      return promise;
    },
    [agentId, sessionId]
  );

  /** onChange: UI 反馈 + 异步 upsert 到后端（fire-and-forget） */
  const handleChange = useCallback(
    (config: BlueprintConfig, validation: BlueprintValidationResult) => {
      onSync?.({ config, validation });
      // 后端 upsert 不阻塞 UI；失败时 networkError 会显示
      void upsertDraft(config);
    },
    [onSync, upsertDraft]
  );

  /** onDeploy: 真实后端的 Draft → Deploy 链路 */
  const handleDeploy = useCallback(
    async (config: BlueprintConfig) => {
      // 1. 确保 draft 已落到后端
      const id = await upsertDraft(config);
      if (!id) {
        // 没有 agentId / 网络失败 → 退回 seed 行为（demo 用）
        if (!agentId) {
          onDeploySuccess?.(
            {
              blueprintId: 'local-demo',
              status: 'deployed',
              validation: { valid: true, issues: [] },
            },
            config
          );
          return { success: true, validation: { valid: true, issues: [] } };
        }
        // 真失败 → 走 onDeployError
        const err = { message: networkError || '未保存到后端，无法部署' };
        onDeployError?.(err);
        return { success: false, validation: { valid: false, issues: [errorIssue(err.message)] } };
      }

      // 2. 调 /api/blueprints/:id/deploy
      try {
        const r = await blueprintApi.deploy(id);
        if (!r.success || !r.data) {
          const err = {
            message: r.error || '部署失败',
            validation: r.validation,
          };
          onDeployError?.(err);
          setLastServerValidation(r.validation ?? null);
          return {
            success: false,
            validation: r.validation ?? { valid: false, issues: [errorIssue(err.message)] },
          };
        }
        // 成功
        const success: NvwaDeploySuccess = {
          blueprintId: r.data.id,
          status: r.data.status as 'draft' | 'deployed',
          validation: r.validation ?? { valid: true, issues: [] },
          deployedAt: r.data.deployedAt,
        };
        setLastServerValidation(success.validation);
        onDeploySuccess?.(success, config);
        return { success: true, validation: success.validation };
      } catch (err) {
        const axiosErr = err as { response?: { data?: { validation?: BlueprintValidationResult; error?: string } }; message?: string };
        const validation = axiosErr.response?.data?.validation;
        const message = axiosErr.response?.data?.error || axiosErr.message || '部署异常';
        onDeployError?.({ message, validation });
        setLastServerValidation(validation ?? null);
        return {
          success: false,
          validation: validation ?? { valid: false, issues: [errorIssue(message)] },
        };
      }
    },
    [agentId, networkError, onDeployError, onDeploySuccess, upsertDraft]
  );

  return (
    <div className="flex flex-col h-full">
      {/* 网络/服务端校验提示 */}
      {(networkError || lastServerValidation) && (
        <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          {networkError && (
            <span className="text-red-600 dark:text-red-400">⚠ {networkError}</span>
          )}
          {!networkError && lastServerValidation && (
            <span
              className={
                lastServerValidation.valid
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400'
              }
            >
              服务端校验：{lastServerValidation.valid ? '✓ 通过' : `⚠ ${lastServerValidation.issues.filter((i) => i.severity === 'error').length} 错误`}
            </span>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <AgentBlueprintCanvas
          key={String(resetKey ?? 'default')}
          initialConfig={initialConfig}
          mode="remote"
          onChange={handleChange}
          onDeploy={handleDeploy}
        />
      </div>
    </div>
  );
}
