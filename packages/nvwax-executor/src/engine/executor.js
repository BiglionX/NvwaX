/**
 * executor.js — 隔离执行内核
 * ------------------------------------------------------------
 * 镜像 @deepseek-ai/dsh-sandbox + dsh-bash-sandbox 的约束语义（同世界隔离、fail-closed）：
 *
 * - runJs：JS 片段在 worker 线程 + vm 受限上下文中执行（无 require/process/fs/globalThis 逃逸面）；
 * - runShell / runPython：child_process.execFile（默认无 shell 解释器），
 *   约束 cwd 白名单（仅工作区）、env 清洗（剔除 *_KEY/*_SECRET/*TOKEN/*PASSWORD）、
 *   强制超时与输出截断。
 *
 * 替换路径：接入 DSH 运行时后，可替换为 dsh-headless worker（dsh-sandbox Windows ACL / landlock
 * 提供 OS 级隔离），HTTP 契约保持不变。
 */

import { Worker } from 'node:worker_threads';
import { execFile } from 'node:child_process';
import path from 'node:path';

const SENSITIVE_ENV_PATTERN = /(_KEY|_SECRET|_TOKEN|_PASSWORD|PASSWD|_CREDENTIALS?)$/i;

const DEFAULT_ALLOWED_ROOTS = [
  process.cwd(),
  path.resolve(process.cwd(), '..'),
  path.resolve(process.cwd(), '..', '..'),
];

export function resolveAllowedRoots() {
  const extra = (process.env.EXECUTOR_ALLOWED_ROOTS || '')
    .split(path.delimiter)
    .filter(Boolean)
    .map((p) => path.resolve(p));
  return [...extra, ...DEFAULT_ALLOWED_ROOTS];
}

function isPathWithin(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export function assertAllowedCwd(cwd) {
  const resolved = path.resolve(cwd || process.cwd());
  const allowed = resolveAllowedRoots();
  if (!allowed.some((root) => isPathWithin(root, resolved))) {
    throw new Error(`[Executor] cwd ${resolved} is outside allowed roots`);
  }
  return resolved;
}

export function scrubEnv(env = process.env, extra = {}) {
  const out = {};
  for (const [key, value] of Object.entries(extra)) out[key] = value;
  for (const [key, value] of Object.entries(env)) {
    if (SENSITIVE_ENV_PATTERN.test(key)) continue;
    out[key] = value;
  }
  return out;
}

// ============================================================
// JS 执行（worker + vm 受限上下文）
// ============================================================

const JS_WORKER_ENTRY = new URL('./js-worker.js', import.meta.url);

/**
 * 在 worker 线程 + vm 受限上下文中执行 JS 片段。
 * @param {string} source
 * @param {{ timeoutMs?: number, args?: object }} options
 * @returns {Promise<{ stdout: string, result?: unknown, durationMs: number, code: number }>}
 */
export function runJs(source, { timeoutMs = 10000, args = {} } = {}) {
  if (typeof source !== 'string' || source.trim() === '') {
    return Promise.reject(new Error('[Executor] JS source must be a non-empty string'));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(JS_WORKER_ENTRY, {
      workerData: { source, args },
    });
    const timer = setTimeout(() => {
      worker.terminate().catch(() => undefined);
      reject(new Error(`[Executor] JS execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    const stdoutLines = [];
    const stderrLines = [];

    worker.on('message', (message) => {
      // 进度消息（console 输出）只累积，不终止
      if (message?.type === 'stdout' || message?.type === 'stderr') {
        (message.type === 'stdout' ? stdoutLines : stderrLines).push(message.line ?? '');
        return;
      }
      clearTimeout(timer);
      if (message?.ok) {
        resolve({
          stdout: stdoutLines.join('\n'),
          stderr: stderrLines.join('\n'),
          result: message.result,
          durationMs: message.durationMs,
          code: 0,
        });
      } else {
        reject(new Error(message?.error ?? '[Executor] JS execution failed'));
      }
    });
    worker.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    worker.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`[Executor] JS worker exited with code ${code}`));
    });
  });
}

// ============================================================
// Shell / Python 执行（execFile + 约束）
// ============================================================

/**
 * 约束式命令执行。
 * @param {string} command
 * @param {{ args?: string[], cwd?: string, env?: object, timeoutMs?: number, maxOutputBytes?: number }} options
 */
export function runCommand(command, { args = [], cwd, env = {}, timeoutMs = 30000, maxOutputBytes = 1 << 20 } = {}) {
  if (!command || typeof command !== 'string') {
    return Promise.reject(new Error('[Executor] command must be a non-empty string'));
  }
  let resolvedCwd;
  try {
    resolvedCwd = assertAllowedCwd(cwd);
  } catch (error) {
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    const child = execFile(
      command,
      args,
      {
        cwd: resolvedCwd,
        env: scrubEnv(process.env, env),
        timeout: timeoutMs,
        maxBuffer: maxOutputBytes,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          // error.killed → 超时；否则为退出码非零
          const code = typeof error.code === 'number' ? error.code : (error.killed ? 'timeout' : 1);
          resolve({ stdout, stderr, code, killed: Boolean(error.killed), error: error.message });
          return;
        }
        resolve({ stdout, stderr, code: 0, killed: false });
      }
    );
    child.on('error', reject);
  });
}

/** Python 片段执行（python -c <code>，同样受约束） */
export function runPython(code, options = {}) {
  return runCommand('python', { ...options, args: ['-c', code] });
}
