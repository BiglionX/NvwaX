/**
 * Jest 自定义 resolver（CommonJS）：把 .js 相对路径 / 无扩展名路径映射到 .ts 源文件
 *
 * Jest 30 要求 resolver 必须导出 { sync, async } 对象。
 *
 * 配合 jest.config.cjs 中的 moduleNameMapper:
 *   '^(\\.{1,2}/.*)\\.js$': '$1'
 * （先剥掉 .js 扩展名，再到 resolver 这里补回 .ts）
 */

const { existsSync } = require('node:fs');
const { fileURLToPath } = require('node:url');
const { dirname, resolve: pathResolve } = require('node:path');

const { findNodeModule } = require('jest-resolve').default;

function resolveJsToTs(request, options) {
  // 仅处理相对或绝对路径
  if (request.startsWith('.') || request.startsWith('/')) {
    try {
      const baseDir =
        options.basedir ||
        (options.testURL ? dirname(fileURLToPath(options.testURL)) : process.cwd());

      // 候选：把所有可能的 .ts 路径都试一遍
      const candidates = [];

      // 情况 1: 带 .js 扩展名（如果 moduleNameMapper 没剥掉）
      if (request.endsWith('.js')) {
        candidates.push(pathResolve(baseDir, request.slice(0, -3) + '.ts'));
      }

      // 情况 2: 无扩展名或类似 .util 的"伪扩展名"（moduleNameMapper 已剥掉 .js）→ 直接试 .ts
      candidates.push(pathResolve(baseDir, request + '.ts'));

      for (const candidate of candidates) {
        if (existsSync(candidate)) {
          return candidate;
        }
      }
    } catch {}
  }
  // 其他情况（node_modules 等）走 jest-resolve 的 findNodeModule 静态方法
  return findNodeModule(request, options);
}

module.exports = {
  sync: resolveJsToTs,
  async: resolveJsToTs,
};