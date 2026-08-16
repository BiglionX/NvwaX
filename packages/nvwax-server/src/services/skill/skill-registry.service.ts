/**
 * SkillRegistry — NvwaX 技能/提示词注册表
 * ------------------------------------------------------------
 * 镜像 @deepseek-ai/dsh-skill（技能提供者注册表 + 按名解析）与
 * @deepseek-ai/dsh-agent-instructions（AGENTS.md/CLAUDE.md 指令上下文加载）。
 *
 * 用途：
 * 1. 把散落在 prompts/*.ts 的 system prompt 常量注册为具名 skill，统一按名解析；
 * 2. 提供指令文件加载（AGENTS.md / CLAUDE.md），供服务注入上下文。
 *
 * 替换路径：接入 DSH 运行时后，可替换为 dsh-skill（provider 注册）+ dsh-agent-instructions
 * （指令加载）挂载在 Cordis Context 上，公共 API（register/get/list/resolve/loadInstructions）保持不变。
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

// ============================================================
// 类型
// ============================================================

export interface SkillProvider {
  name: string;
  description: string;
  /** 静态内容或惰性求值（允许延迟拼装业务上下文） */
  content: string | (() => string | Promise<string>);
}

// ============================================================
// 实现
// ============================================================

export class SkillRegistry {
  private readonly providers = new Map<string, SkillProvider>();

  /** 注册技能；同名覆盖（后注册者优先） */
  register(provider: SkillProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): SkillProvider | undefined {
    return this.providers.get(name);
  }

  list(): SkillProvider[] {
    return [...this.providers.values()];
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  /** 解析技能内容（惰性求值支持） */
  async resolve(name: string): Promise<string> {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`[SkillRegistry] unknown skill: ${name}`);
    const content = typeof provider.content === 'function' ? await provider.content() : provider.content;
    return content;
  }

  /**
   * 加载指令文件上下文（镜像 dsh-agent-instructions）：
   * 按优先级读取 <dir>/AGENTS.md、<dir>/CLAUDE.md；不存在返回空串。
   */
  async loadInstructions(dir?: string): Promise<string> {
    const base = dir ?? process.cwd();
    for (const filename of ['AGENTS.md', 'CLAUDE.md']) {
      try {
        const full = path.join(base, filename);
        const text = await fs.readFile(full, 'utf8');
        if (text.trim().length > 0) {
          return `# Instructions from ${filename}\n\n${text.trim()}\n`;
        }
      } catch {
        // 文件不存在则继续尝试下一个
      }
    }
    return '';
  }
}

export const skillRegistry = new SkillRegistry();
