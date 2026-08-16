/**
 * js-worker.js — JS 片段的 worker 执行入口
 * ------------------------------------------------------------
 * 在 worker 线程中，用 node:vm 的受限上下文执行用户/模型提供的 JS 片段：
 * 上下文只暴露白名单全局（console 受限 / Math / JSON / Date / structuredClone / TextEncoder...），
 * 无 process / require / module / globalThis 逃逸面（fail-closed：非法访问抛错）。
 */

import { parentPort, workerData } from 'node:worker_threads';
import { runInNewContext } from 'node:vm';

const { source, args } = workerData;
const port = parentPort;
const start = Date.now();

const sandbox = {
  console: {
    log: (...xs) => port?.postMessage({ type: 'stdout', line: xs.map(String).join(' ') }),
    error: (...xs) => port?.postMessage({ type: 'stderr', line: xs.map(String).join(' ') }),
    warn: (...xs) => port?.postMessage({ type: 'stderr', line: xs.map(String).join(' ') }),
    info: (...xs) => port?.postMessage({ type: 'stdout', line: xs.map(String).join(' ') }),
  },
  Math,
  JSON,
  Date,
  RegExp,
  String,
  Number,
  Boolean,
  Array,
  Object,
  structuredClone,
  TextEncoder,
  TextDecoder,
  setTimeout,
  clearTimeout,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  args,
};

try {
  const result = runInNewContext(
    `(async () => {\n${source}\n})()`,
    sandbox,
    { timeout: undefined, filename: 'exec.js' }
  );
  Promise.resolve(result)
    .then((value) => {
      port?.postMessage({
        ok: true,
        stdout: '',
        result: value,
        durationMs: Date.now() - start,
      });
    })
    .catch((error) => {
      port?.postMessage({ ok: false, error: error?.message ?? String(error) });
    });
} catch (error) {
  port?.postMessage({ ok: false, error: error?.message ?? String(error) });
}
