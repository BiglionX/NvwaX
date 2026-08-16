/**
 * LlmService — NvwaX 统一 LLM 服务
 * ------------------------------------------------------------
 * 镜像 @deepseek-ai/dsh-llm 的设计原则（provider-neutral 接口 + 适配器注册 +
 * provider 重试策略 + 用量计量），为 nvwax-server 的业务服务提供单一 LLM 入口，
 * 消除各 service 重复的 `new OpenAI(...)` 初始化与手写错误处理。
 *
 * 与 DSH 的差异（替换路径见 docs/DSH-MIGRATION-PLAN.md Phase 1）：
 * - dsh-llm 的 `stream()` 是流式 chunk 协议，且 dsh-llm-retry 只作用于 agent loop
 *   的 `agent/request-error` 瀑布（对直接调用无效）；structured-output 依赖的
 *   `response_format`（json_schema/json_object）dsh-llm-deepseek 不透传。
 *   因此这里保留 OpenAI SDK 作为传输层，但统一配置/重试/计量/路由语义，
 *   后续若接入 DSH 运行时，只需替换本服务内部实现、保持 createCompletion 签名不变。
 */

import OpenAI from 'openai';

// ============================================================
// 类型
// ============================================================

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type LlmResponseFormat =
  | { type: 'json_object' }
  | { type: 'json_schema'; json_schema: Record<string, unknown> };

export interface LlmCompletionRequest {
  /** 模型名；缺省用服务默认模型（deepseek-v4-flash） */
  model?: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  /** 透传给 OpenAI SDK 的 response_format（structured-output 3 级降级依赖） */
  responseFormat?: LlmResponseFormat;
  /** 调用用途，用于日志/计量/模型路由（默认 conversation） */
  purpose?:
    | 'conversation'
    | 'translation'
    | 'search'
    | 'structured'
    | 'reflection'
    | 'team-generation';
}

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmCompletionResult {
  content: string;
  model: string;
  usage?: LlmUsage;
  finishReason?: string;
}

export interface LlmServiceOptions {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  /** 重试次数（镜像 dsh-llm-retry normal 模式，默认 2） */
  maxRetries?: number;
  /** 退避初始延迟 ms（默认 500） */
  retryInitialDelayMs?: number;
  /** 退避上限 ms（默认 10000） */
  retryMaxDelayMs?: number;
}

// ============================================================
// 实现
// ============================================================

function resolveApiKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || undefined;
}

function resolveBaseURL(): string | undefined {
  return process.env.OPENAI_BASE_URL || 'https://api.deepseek.com';
}

const DEFAULT_MODEL = 'deepseek-v4-flash';

export class LlmService {
  private client: OpenAI | null = null;
  private readonly options: LlmServiceOptions;

  constructor(options: LlmServiceOptions = {}) {
    this.options = options;
  }

  /** 懒初始化 OpenAI 客户端（保持与旧各 service 相同的环境变量语义） */
  private getClient(): OpenAI | null {
    if (this.client) return this.client;
    const apiKey = this.options.apiKey ?? resolveApiKey();
    if (!apiKey) return null;
    this.client = new OpenAI({
      apiKey,
      baseURL: this.options.baseURL ?? resolveBaseURL(),
    });
    return this.client;
  }

  get isConfigured(): boolean {
    return this.getClient() !== null;
  }

  resolveModel(requested?: string): string {
    return requested ?? this.options.defaultModel ?? process.env.LLM_DEFAULT_MODEL ?? DEFAULT_MODEL;
  }

  /**
   * 单次非流式补全，带重试（镜像 dsh-llm-retry normal 模式：
   * 仅对 429 / 5xx / 超时 / 传输错误重试，指数退避 + 抖动）。
   */
  async createCompletion(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const client = this.getClient();
    if (!client) {
      throw new Error(
        '[LlmService] DEEPSEEK_API_KEY or OPENAI_API_KEY not configured; cannot complete.'
      );
    }

    const model = this.resolveModel(req.model);
    const maxRetries = this.options.maxRetries ?? 2;
    const initialDelay = this.options.retryInitialDelayMs ?? 500;
    const maxDelay = this.options.retryMaxDelayMs ?? 10000;

    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: req.messages as any,
          ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
          ...(req.maxTokens !== undefined ? { max_tokens: req.maxTokens } : {}),
          ...(req.responseFormat ? { response_format: req.responseFormat as any } : {}),
        });
        const choice = completion.choices?.[0];
        return {
          content: choice?.message?.content ?? '',
          model,
          usage: completion.usage
            ? {
                promptTokens: completion.usage.prompt_tokens ?? 0,
                completionTokens: completion.usage.completion_tokens ?? 0,
                totalTokens: completion.usage.total_tokens ?? 0,
              }
            : undefined,
          finishReason: choice?.finish_reason ?? undefined,
        };
      } catch (err: any) {
        lastError = err;
        if (attempt >= maxRetries) break;
        if (!isRetryable(err)) break;
        await sleepWithJitter(initialDelay * Math.pow(2, attempt), maxDelay);
      }
    }
    throw lastError;
  }
}

/** 是否属于可重试错误（镜像 dsh-llm-retry 的 RATE_LIMIT/SERVER/TIMEOUT/TRANSPORT） */
function isRetryable(err: any): boolean {
  if (!err) return false;
  const status = err.status;
  if (typeof status === 'number') {
    return status === 429 || (status >= 500 && status < 600);
  }
  // 无状态码：超时 / 网络 / 传输层错误
  const name = String(err.name ?? '');
  const message = String(err.message ?? '');
  return (
    name.includes('Timeout') ||
    name.includes('APIConnection') ||
    name.includes('Network') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNRESET') ||
    message.includes('socket hang up')
  );
}

function sleepWithJitter(baseMs: number, maxMs: number): Promise<void> {
  const delay = Math.min(baseMs, maxMs);
  const jitter = delay * (0.1 * Math.random()); // 10% 抖动，镜像 dsh-llm-retry jitterRatio
  return new Promise((resolve) => setTimeout(resolve, delay + jitter));
}

export const llmService = new LlmService();
