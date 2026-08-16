/**
 * ExecutorClient — 隔离执行 worker 的 HTTP 客户端
 * ------------------------------------------------------------
 * nvwax-server 通过本服务把执行任务委托给独立的 nvwax-executor 进程
 * （镜像 DSH-MIGRATION-PLAN Phase 3 的架构：nvwax-server 不直接执行代码，
 * 业务 API 保持不变，执行委托给隔离 worker）。
 *
 * 环境变量：
 *   EXECUTOR_URL   （默认 http://localhost:3010）
 *   EXECUTOR_TOKEN （与 executor 的 EXECUTOR_TOKEN 一致；未配置则客户端不可用）
 *
 * 替换路径：可把 executor 换成 dsh-headless worker（dsh-sandbox ACL 隔离），
 * 本客户端只需调整 baseUrl/契约。
 */

export interface ExecJobRequest {
  kind: 'js' | 'shell' | 'python';
  /** kind=js/python 时必填 */
  source?: string;
  /** kind=shell 时必填 */
  command?: string;
  args?: string[];
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  /** kind=js 时作为 args 传给 vm 上下文 */
  execArgs?: unknown;
}

export interface ExecJobResult {
  success: boolean;
  kind: string;
  stdout?: string;
  stderr?: string;
  result?: unknown;
  code?: number | string;
  error?: string;
  durationMs: number;
}

function resolveBaseUrl(): string {
  return process.env.EXECUTOR_URL || 'http://localhost:3010';
}

export class ExecutorClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = baseUrl ?? resolveBaseUrl();
    this.token = token ?? process.env.EXECUTOR_TOKEN ?? '';
  }

  get isConfigured(): boolean {
    return this.token.length > 0;
  }

  get healthUrl(): string {
    return `${this.baseUrl}/health`;
  }

  /** 委托执行任务 */
  async run(req: ExecJobRequest): Promise<ExecJobResult> {
    if (!this.isConfigured) {
      throw new Error(
        '[ExecutorClient] EXECUTOR_TOKEN not configured; execution delegation disabled.'
      );
    }
    const started = Date.now();
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/exec/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          kind: req.kind,
          source: req.source,
          command: req.command,
          // executor 线上契约：js 用 args 传 vm 上下文对象；shell/python 用 args 传命令参数数组
          args: req.kind === 'js' ? req.execArgs : req.args,
          cwd: req.cwd,
          timeoutMs: req.timeoutMs,
          env: req.env,
        }),
      });
    } catch (error: any) {
      return {
        success: false,
        kind: req.kind,
        error: `[ExecutorClient] cannot reach executor at ${this.baseUrl}: ${error?.message ?? error}`,
        durationMs: Date.now() - started,
      };
    }

    const text = await response.text();
    let parsed: Partial<ExecJobResult> = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      // 非 JSON 响应，透传原文
    }

    if (!response.ok) {
      return {
        success: false,
        kind: req.kind,
        error: parsed.error ?? `executor returned HTTP ${response.status}`,
        stdout: parsed.stdout,
        stderr: parsed.stderr,
        code: parsed.code,
        durationMs: parsed.durationMs ?? Date.now() - started,
      };
    }

    return {
      success: parsed.success !== false,
      kind: parsed.kind ?? req.kind,
      stdout: parsed.stdout,
      stderr: parsed.stderr,
      result: parsed.result,
      code: parsed.code,
      error: parsed.error,
      durationMs: parsed.durationMs ?? Date.now() - started,
    };
  }
}

export const executorClient = new ExecutorClient();
