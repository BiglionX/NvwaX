/**
 * AiTeam Creation API 客户端
 * ----------------------------------------------------------------
 * 对应后端 routes/aiteam-creation.routes.ts：
 *   POST   /api/aiteam-creation/sessions
 *   GET    /api/aiteam-creation/sessions/:id
 *   POST   /api/aiteam-creation/sessions/:id/message
 *   POST   /api/aiteam-creation/sessions/:id/confirm
 *   POST   /api/aiteam-creation/sessions/:id/export
 *   GET    /api/aiteam-creation/sessions/:id/download
 *   POST   /api/aiteam-creation/sessions/:id/integrate-proclaw
 *   GET    /api/aiteam-creation/sessions/:id/progress
 *
 * 主要服务于 Nvwa 工作台 v2.3+ 的"创建即入仓库"流程。
 */

import { authedJson } from '@/lib/oidc/authed-fetch';

// ============================================================
// 类型定义（与后端 controller 对齐）
// ============================================================

/** 7 步进度的单个步骤 */
export interface CreationStep {
  stepNumber: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
}

/** 会话进度 */
export interface CreationProgress {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  steps: CreationStep[];
}

/** 文档包元数据 */
export interface DocumentPackage {
  packageInfo: {
    teamName: string;
    teamType: string;
    generatedAt: string;
    totalDocuments: number;
  };
  // 文档包正文（可能很大，按需使用）
  documents?: unknown[];
}

/** 创建会话 */
export interface CreationSession {
  id: string;
  userId: string;
  status: 'active' | 'completed' | 'abandoned';
  requirements?: Record<string, unknown> | null;
  teamDesign?: Record<string, unknown> | null;
  ceoConfig?: Record<string, unknown> | null;
  agentMatches?: Record<string, unknown> | null;
  skillMatches?: Record<string, unknown> | null;
  documentPackage?: DocumentPackage | null;
  documentPackageUrl?: string | null;
  progress?: CreationProgress;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 错误处理
// ============================================================

export class AiTeamCreationApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AiTeamCreationApiError';
  }
}

function unwrap<T>(data: { success: boolean; data?: T; error?: string }, fallbackError = 'API request failed'): T {
  if (!data.success || data.data === undefined) {
    throw new AiTeamCreationApiError(data.error || fallbackError);
  }
  return data.data;
}

function handleAxiosError(err: unknown, fallback = 'Network error'): never {
  if (err instanceof AiTeamCreationApiError) throw err;
  const axiosErr = err as {
    response?: { status?: number; data?: { error?: string } };
    message?: string;
    status?: number;
  };
  const status = axiosErr.response?.status ?? axiosErr.status;
  const msg = axiosErr.response?.data?.error || axiosErr.message || fallback;
  throw new AiTeamCreationApiError(msg, status);
}

// ============================================================
// API 方法
// ============================================================

export const aiteamCreationApi = {
  /**
   * 创建会话
   * POST /api/aiteam-creation/sessions
   */
  createSession: async (body?: { requirements?: Record<string, unknown> }): Promise<CreationSession> => {
    try {
      const r = await authedJson<{ success: boolean; data?: CreationSession; error?: string }>(
        '/aiteam-creation/sessions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body ?? {}),
        }
      );
      return unwrap<CreationSession>(r);
    } catch (err) {
      handleAxiosError(err, 'Failed to create session');
    }
  },

  /**
   * 获取会话详情
   * GET /api/aiteam-creation/sessions/:id
   */
  getSession: async (sessionId: string): Promise<CreationSession | null> => {
    try {
      const r = await authedJson<{ success: boolean; data?: CreationSession | null; error?: string }>(
        `/aiteam-creation/sessions/${sessionId}`,
      );
      if (!r.success) return null;
      return (r.data as CreationSession) ?? null;
    } catch (err) {
      // 404 → 返回 null 而非抛出（业务层常用"会话不存在"分支）
      const axiosErr = err as { response?: { status?: number }; status?: number };
      const status = axiosErr.response?.status ?? axiosErr.status;
      if (status === 404) return null;
      handleAxiosError(err, 'Failed to get session');
    }
  },

  /**
   * 发送消息推进流程
   * POST /api/aiteam-creation/sessions/:id/message
   */
  sendMessage: async (
    sessionId: string,
    body: { content: string; locale?: string }
  ): Promise<{
    message: string;
    progress?: CreationProgress;
    /** NvwaX Agent 阶段（requirements_gathering / team_design / ...） */
    phase?: string;
    extractedRequirements?: Record<string, unknown> | null;
    /** 后端推荐的角色数组（roleName / role / responsibilities） */
    recommendedRoles?: Array<{ roleName?: string; role?: string; responsibilities?: string[] }> | null;
    needsClarification?: boolean;
    clarificationQuestions?: string[] | null;
    nextStep?: string | null;
  }> => {
    try {
      const r = await authedJson<{
        success: boolean;
        data?: {
          message: string;
          progress?: CreationProgress;
          phase?: string;
          extractedRequirements?: Record<string, unknown> | null;
          recommendedRoles?: Array<{ roleName?: string; role?: string; responsibilities?: string[] }> | null;
          needsClarification?: boolean;
          clarificationQuestions?: string[] | null;
          nextStep?: string | null;
        };
        error?: string;
      }>(`/aiteam-creation/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return unwrap<{
        message: string;
        progress?: CreationProgress;
        phase?: string;
        extractedRequirements?: Record<string, unknown> | null;
        recommendedRoles?: Array<{ roleName?: string; role?: string; responsibilities?: string[] }> | null;
        needsClarification?: boolean;
        clarificationQuestions?: string[] | null;
        nextStep?: string | null;
      }>(r);
    } catch (err) {
      handleAxiosError(err, 'Failed to send message');
    }
  },

  /**
   * 获取会话进度
   * GET /api/aiteam-creation/sessions/:id/progress
   */
  getProgress: async (sessionId: string): Promise<CreationProgress> => {
    try {
      const r = await authedJson<{ success: boolean; data?: CreationProgress; error?: string }>(
        `/aiteam-creation/sessions/${sessionId}/progress`,
      );
      return unwrap<CreationProgress>(r);
    } catch (err) {
      handleAxiosError(err, 'Failed to get progress');
    }
  },

  /**
   * 确认并保存 AiTeam（关键端点）
   * POST /api/aiteam-creation/sessions/:id/confirm
   *
   * 触发文档包生成 + AiTeam 入库，返回 { sessionId, aiteamId, documentPackage, downloadUrl }
   */
  confirmAndSave: async (
    sessionId: string
  ): Promise<{
    sessionId: string;
    aiteamId: string | null;
    documentPackage: DocumentPackage;
    downloadUrl: string;
    message: string;
  }> => {
    try {
      const r = await authedJson<{
        success: boolean;
        data?: {
          sessionId: string;
          aiteamId: string | null;
          documentPackage: DocumentPackage;
          downloadUrl: string;
          message: string;
        };
        error?: string;
      }>(`/aiteam-creation/sessions/${sessionId}/confirm`, { method: 'POST' });
      return unwrap(r, 'Failed to confirm and save team');
    } catch (err) {
      handleAxiosError(err, 'Failed to confirm and save team');
    }
  },

  /**
   * 导出团队到指定格式
   * POST /api/aiteam-creation/sessions/:id/export
   * @param format 'json' | 'yaml' | 'proclaw' | 'crewai' | 'langgraph'
   */
  exportToFormat: async (
    sessionId: string,
    format: 'json' | 'yaml' | 'proclaw' | 'crewai' | 'langgraph'
  ): Promise<{
    format: string;
    fileName: string;
    downloadUrl: string;
    downloadPath?: string;
    extension: string;
  }> => {
    try {
      const r = await authedJson<{
        success: boolean;
        data?: {
          format: string;
          fileName: string;
          downloadUrl: string;
          downloadPath?: string;
          extension: string;
        };
        error?: string;
      }>(`/aiteam-creation/sessions/${sessionId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      return unwrap(r, 'Export failed');
    } catch (err) {
      handleAxiosError(err, 'Export failed');
    }
  },

  /**
   * 集成到 ProClaw（TODO: 后端当前为模拟实现）
   * POST /api/aiteam-creation/sessions/:id/integrate-proclaw
   */
  integrateToProClaw: async (
    sessionId: string
  ): Promise<{ proclawTeamId: string; sessionId: string; message: string }> => {
    try {
      const r = await authedJson<{
        success: boolean;
        data?: { proclawTeamId: string; sessionId: string; message: string };
        error?: string;
      }>(`/aiteam-creation/sessions/${sessionId}/integrate-proclaw`, { method: 'POST' });
      return unwrap(r, 'Failed to integrate to ProClaw');
    } catch (err) {
      handleAxiosError(err, 'Failed to integrate to ProClaw');
    }
  },

  /**
   * 删除会话
   * DELETE /api/aiteam-creation/sessions/:id
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    try {
      await authedJson(`/aiteam-creation/sessions/${sessionId}`, { method: 'DELETE' });
    } catch (err) {
      handleAxiosError(err, 'Failed to delete session');
    }
  },
};

export default aiteamCreationApi;
