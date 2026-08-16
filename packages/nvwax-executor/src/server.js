/**
 * server.js — NvwaX 隔离执行 worker（零依赖 node:http）
 * ------------------------------------------------------------
 * 镜像 dsh-headless worker 的形态：一个独立进程，通过 HTTP 接收执行任务，
 * 在受约束的沙箱中运行 JS 片段 / shell 命令 / Python 片段，返回结构化结果。
 *
 * 鉴权：Bearer token（EXECUTOR_TOKEN）。未配置 token 时 fail-closed（503）。
 * 端口：EXECUTOR_PORT（默认 3010，避开 nvwax-server 3001 / skillhub-workflow 3002）。
 */

import http from 'node:http';
import { runJs, runCommand, runPython } from './engine/executor.js';

const PORT = parseInt(process.env.EXECUTOR_PORT || '3010', 10);
const TOKEN = process.env.EXECUTOR_TOKEN || '';
const MAX_BODY_BYTES = 1 << 20; // 1MB

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${error.message}`));
      }
    });
    req.on('error', reject);
  });
}

function isAuthed(req) {
  if (!TOKEN) return false; // fail-closed：未配置 token 拒绝一切执行
  const header = req.headers['authorization'] || '';
  return header === `Bearer ${TOKEN}`;
}

async function handleExec(req, res) {
  const body = await readBody(req);
  const { kind = 'js', source, command, args = [], cwd, timeoutMs, env = {} } = body;

  const start = Date.now();
  const wrap = async (fn) => {
    const result = await fn();
    return {
      success: true,
      kind,
      ...result,
      durationMs: Date.now() - start,
    };
  };

  try {
    switch (kind) {
      case 'js': {
        if (!source || typeof source !== 'string') {
          return send(res, 400, { success: false, error: 'source (string) is required for kind=js' });
        }
        return send(res, 200, await wrap(() => runJs(source, { timeoutMs, args: body.args })));
      }
      case 'shell': {
        if (!command || typeof command !== 'string') {
          return send(res, 400, { success: false, error: 'command (string) is required for kind=shell' });
        }
        const r = await wrap(() =>
          runCommand(command, { args, cwd, env, timeoutMs })
        );
        return send(res, r.code === 0 ? 200 : 422, r);
      }
      case 'python': {
        if (!source || typeof source !== 'string') {
          return send(res, 400, { success: false, error: 'source (string) is required for kind=python' });
        }
        const r = await wrap(() => runPython(source, { cwd, env, timeoutMs }));
        return send(res, r.code === 0 ? 200 : 422, r);
      }
      default:
        return send(res, 400, { success: false, error: `unknown kind: ${kind} (js|shell|python)` });
    }
  } catch (error) {
    send(res, 500, { success: false, kind, error: error.message, durationMs: Date.now() - start });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, {
      status: 'ok',
      service: 'nvwax-executor',
      tokenConfigured: Boolean(TOKEN),
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/exec/run') {
    if (!isAuthed(req)) {
      return send(res, 401, { success: false, error: 'unauthorized (missing/invalid EXECUTOR_TOKEN)' });
    }
    try {
      await handleExec(req, res);
    } catch (error) {
      send(res, 500, { success: false, error: error.message });
    }
    return;
  }

  send(res, 404, { success: false, error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 NvwaX Executor running on http://localhost:${PORT}`);
  console.log(`🔒 Token auth: ${TOKEN ? 'configured' : 'NOT CONFIGURED (fail-closed: all exec requests rejected)'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
