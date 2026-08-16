/**
 * yaml-loader.js — YAML Agent/Workflow 加载器（纯 JS）
 * ------------------------------------------------------------
 * 替代 src/loaders/yaml-agent-loader.js（该文件含 TypeScript 语法 `export interface`，
 * 在 ESM 下无法被 Node 直接加载，属预存缺陷；本实现为其纯 JS 等价物）。
 * 读取 agents/*.yaml 与 workflows/*.yaml，解析为定义对象。
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

function readYamlFiles(dir) {
  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  } catch {
    return [];
  }
  const defs = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const parsed = yaml.load(content);
      if (parsed && typeof parsed === 'object') {
        defs.push({ file, definition: parsed });
      }
    } catch (error) {
      console.warn(`[YamlLoader] Failed to parse ${file}:`, error.message);
    }
  }
  return defs;
}

export class YamlLoader {
  constructor(agentsDir, workflowsDir) {
    this.agentsDir = agentsDir;
    this.workflowsDir = workflowsDir;
  }

  /** @returns {{ agents: object[], workflows: object[] }} */
  loadAll() {
    const agents = readYamlFiles(this.agentsDir)
      .filter(({ definition }) => definition?.agent?.id)
      .map(({ definition }) => definition);

    const workflows = readYamlFiles(this.workflowsDir)
      .filter(({ definition }) => definition?.workflow?.id)
      .map(({ definition }) => definition);

    return { agents, workflows };
  }
}
