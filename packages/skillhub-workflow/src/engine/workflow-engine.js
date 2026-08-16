/**
 * WorkflowEngine — skillhub-workflow 编排内核
 * ------------------------------------------------------------
 * 镜像 @deepseek-ai/dsh-workflow 的编排语义：
 *   - 编排脚本 = 一段 JS 代码，注入原语 agent()/pipeline()/parallel()/phase()/log()/args，
 *     以 `return <json-value>` 结束；
 *   - 脚本在 worker 线程中隔离执行（镜像 dsh-workflow-worker-thread：离开宿主事件循环）；
 *   - agent() 桥接子代理执行（镜像 dsh-subagent 的 fresh-child 语义：新的一次性子代理）。
 *
 * 替换路径：接入 DSH 运行时后，本模块可替换为 dsh-workflow + dsh-workflow-worker-thread
 * （agent() 桥接到 ctx.subagents）。
 */

import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

// ============================================================
// 原语（在 worker 内构建，见 worker-thread.js）
// ============================================================

/** 顺序阶段流水线：每个 item 独立流经各 stage，无跨 item 屏障（镜像 dsh pipeline） */
export async function pipeline(items, ...stages) {
  if (stages.length === 0) return items;
  const results = await Promise.all(
    items.map(async (item, index) => {
      let value = item;
      for (const stage of stages) {
        value = await stage(value, item, index);
      }
      return value;
    })
  );
  return results;
}

/** 并发执行：任一 thunk 抛错则该位解析为 null（镜像 dsh parallel 语义） */
export async function parallel(thunks) {
  return Promise.all(thunks.map((t) => Promise.resolve().then(t).catch(() => null)));
}

/** 阶段标记（进度/日志） */
export function phase(title) {
  // 在 worker 内由 postMessage 实现；此处为占位（见 worker-thread.js 的注入实现）
  return title;
}

/** 日志 */
export function log(message) {
  // 在 worker 内由 postMessage 实现；此处为占位
  return message;
}

// ============================================================
// 脚本执行入口（worker-thread 隔离）
// ============================================================

const WORKER_ENTRY = fileURLToPath(new URL('./worker-thread.js', import.meta.url));

export const WORKFLOW_SCRIPT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 在 worker 线程中执行一段编排脚本。
 * @param {string} scriptSource 脚本源码（注入 agent/pipeline/parallel/phase/log/args 原语）
 * @param {object} args 传给脚本的输入（作为全局 args）
 * @param {{ timeoutMs?: number }} options
 * @returns {Promise<any>} 脚本 `return` 的值（JSON 可序列化）
 */
export function runWorkflowScript(scriptSource, args = {}, options = {}) {
  if (typeof scriptSource !== 'string' || scriptSource.trim() === '') {
    return Promise.reject(new Error('[WorkflowEngine] script must be a non-empty string'));
  }

  const timeoutMs = options.timeoutMs ?? WORKFLOW_SCRIPT_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_ENTRY, {
      workerData: { script: scriptSource, args },
    });

    const timer = setTimeout(() => {
      worker.terminate().catch(() => undefined);
      reject(new Error(`[WorkflowEngine] script timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    worker.on('message', (message) => {
      // 进度消息（phase/log）只记录，不终止
      if (message?.type === 'phase' || message?.type === 'log') {
        if (message.type === 'phase') {
          console.log(`[WorkflowScript] phase: ${message.title}`);
        } else if (message.message !== undefined) {
          console.log(`[WorkflowScript] ${message.message}`);
        }
        return;
      }
      clearTimeout(timer);
      if (message?.ok) {
        resolve(message.result);
      } else {
        reject(new Error(message?.error ?? '[WorkflowEngine] script failed'));
      }
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    worker.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`[WorkflowEngine] worker exited with code ${code}`));
      }
    });
  });
}
