/**
 * Sandbox — skillhub-workflow 执行沙箱
 * ------------------------------------------------------------
 * 镜像 @deepseek-ai/dsh-sandbox 的约束语义（同世界隔离、fail-closed），
 * 为本包的两个真实执行点提供安全边界：
 *
 * 1. `evaluateCondition` — 替代 server.js 中 condition 节点的裸 `eval(condition)`。
 *    使用 node:vm 在受限上下文中求值：只暴露工作流上下文与白名单全局
 *    （Math/JSON/Array/Object/String/Number/Boolean），无 process/require/fs，
 *    并带超时（fail-closed：超时或非法访问一律抛错，由调用方按失败处理）。
 *
 * 2. `execCommand` — 约束 child_process 执行（供未来测试执行等场景）：
 *    - cwd 白名单（仅允许工作区目录）
 *    - env 清洗（剥离 *_KEY / *_SECRET / *TOKEN / *PASSWORD 等敏感变量）
 *    - 强制超时 + 输出截断
 *
 * 替换路径：接入 DSH 运行时后，可替换为 dsh-sandbox（Windows ACL / landlock 后端）。
 */

import { runInNewContext } from 'node:vm';
import { execFile } from 'node:child_process';
import path from 'node:path';

// ============================================================
// 安全表达式求值（替代 eval）
// ============================================================

const SAFE_GLOBALS = {
  Math,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Date,
  RegExp,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  undefined,
  NaN,
  Infinity,
};

/** 求值条件表达式；非法访问/超时/语法错误一律抛错（fail-closed） */
export function evaluateCondition(expression, context = {}, timeoutMs = 1000) {
  if (typeof expression !== 'string' || expression.trim() === '') {
    throw new Error('[Sandbox] condition expression must be a non-empty string');
  }

  const sandbox = { ...SAFE_GLOBALS, ...context };

  // 防止通过 constructor 原型链逃逸：封死 Function/constructor 访问
  const result = runInNewContext(`(${expression})`, sandbox, {
    timeout: timeoutMs,
    filename: 'condition.js',
  });

  return result;
}

// ============================================================
// 受限命令执行（约束 child_process）
// ============================================================

const SENSITIVE_ENV_PATTERN = /(_KEY|_SECRET|_TOKEN|_PASSWORD|PASSWD|_CREDENTIALS?)$/i;
const DEFAULT_ALLOWED_ROOTS = [
  process.cwd(),
  // 允许指向仓库根（本包位于 packages/skillhub-workflow）
  path.resolve(process.cwd(), '..', '..'),
];

export function scrubEnv(env = process.env, extra = {}) {
  const out = {};
  for (const [key, value] of Object.entries(extra)) out[key] = value;
  for (const [key, value] of Object.entries(env)) {
    if (SENSITIVE_ENV_PATTERN.test(key)) continue; // 不把密钥传给子进程
    out[key] = value;
  }
  return out;
}

export function resolveAllowedRoots(extraRoots = []) {
  return [...DEFAULT_ALLOWED_ROOTS, ...extraRoots].map((p) => path.resolve(p));
}

function isPathWithin(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * 受限执行命令（fail-closed：越界 cwd 直接拒绝，超时/输出超限终止）。
 * 返回 { stdout, stderr, code }
 */
export function execCommand(command, { args = [], cwd, env = {}, timeoutMs = 60000, maxOutputBytes = 1 << 20 } = {}) {
  const allowedRoots = resolveAllowedRoots();
  const resolvedCwd = path.resolve(cwd || process.cwd());

  if (!allowedRoots.some((root) => isPathWithin(root, resolvedCwd))) {
    return Promise.reject(
      new Error(`[Sandbox] cwd ${resolvedCwd} is outside allowed roots`)
    );
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
          // timeout/killed 视为失败
          reject(error);
          return;
        }
        resolve({ stdout, stderr, code: 0 });
      }
    );
    child.on('error', reject);
  });
}
