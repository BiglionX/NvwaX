/**
 * worker-thread.js — 编排脚本的 worker 执行入口
 * ------------------------------------------------------------
 * 被 workflow-engine.runWorkflowScript 以 Worker 方式拉起：
 * 1. 从 workerData 读取 { script, args }；
 * 2. 构建注入原语：agent()（子代理 LLM 执行 + 可选 schema 校验）、
 *    pipeline()/parallel()（复用 workflow-engine 的实现）、
 *    phase()/log()（postMessage 回宿主做进度日志）；
 * 3. 以 async IIFE 形式执行脚本，`return` 值即结果；
 * 4. postMessage({ ok, result }) 或 { ok: false, error }。
 */

import { parentPort, workerData } from 'node:worker_threads';
import { pipeline, parallel } from './workflow-engine.js';
import { complete } from './llm-client.js';

const { script, args } = workerData;

const port = parentPort;

function report(type, payload) {
  port?.postMessage({ type, ...payload });
}

/** 子代理：fresh-child 语义（镜像 dsh-subagent）——一次性 LLM 补全，可选 schema 校验 */
async function agent(prompt, opts = {}) {
  const label = opts.label || 'subagent';
  const persona = opts.persona || 'You are a helpful subagent working on a delegated task.';
  report('log', { message: `[agent:${label}] started` });
  try {
    const result = await complete({
      prompt: String(prompt),
      systemPrompt: persona,
      model: opts.model,
      temperature: opts.temperature ?? 0.3,
    });
    if (result.error) {
      report('log', { message: `[agent:${label}] failed: ${result.error}` });
      return null;
    }
    const text = result.response;
    if (opts.schema) {
      const parsed = validateAgainstSchema(text, opts.schema);
      if (parsed === null) {
        report('log', { message: `[agent:${label}] schema validation failed` });
        return null;
      }
      return parsed;
    }
    return text;
  } catch (error) {
    report('log', { message: `[agent:${label}] threw: ${error.message}` });
    return null;
  }
}

/**
 * 简单 JSON Schema 校验（镜像 dsh agent() opts.schema 的支持子集）：
 * 仅支持 type/properties/required/items/enum/const。
 */
function validateAgainstSchema(text, schema) {
  let data;
  try {
    const trimmed = String(text).trim();
    const match = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    data = JSON.parse(match ? match[0] : trimmed);
  } catch {
    return null;
  }
  return checkNode(data, schema) ? data : null;
}

function checkNode(value, schema) {
  if (!schema || typeof schema !== 'object') return true;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.const !== undefined && schema.const !== value) return false;
  switch (schema.type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      if (!Array.isArray(value)) return false;
      return schema.items ? value.every((v) => checkNode(v, schema.items)) : true;
    case 'object':
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
      if (schema.required) {
        for (const key of schema.required) {
          if (!(key in value)) return false;
        }
      }
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in value && !checkNode(value[key], propSchema)) return false;
        }
      }
      return true;
    default:
      return true;
  }
}

// ============================================================
// 执行
// ============================================================

try {
  const fn = new Function(
    'agent', 'pipeline', 'parallel', 'phase', 'log', 'args',
    `return (async () => {\n${script}\n})()`
  );
  const result = await fn(agent, pipeline, parallel, (title) => report('phase', { title }), (message) => report('log', { message }), args);
  port?.postMessage({ ok: true, result });
} catch (error) {
  port?.postMessage({ ok: false, error: error?.message ?? String(error) });
}
