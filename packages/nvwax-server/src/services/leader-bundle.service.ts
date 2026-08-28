/**
 * Leader Bundle Service
 *
 * Leader Skill Bundle 的核心服务，对齐 Hermes Agent 的 Skill Bundle 设计。
 *
 * 核心职责：
 * 1. Bundle CRUD：从文件系统 / 远端 registry 加载 Bundle 元数据
 * 2. Bundle 安装：把 Bundle 内的 skills 同步到 leader_skills 表
 * 3. Bundle 卸载：清理已安装的 skills
 * 4. 版本管理：支持多版本并存，新版本自动 deprecated 旧版本
 *
 * 设计参考：
 * - docs/HERMES-AGENT-ARCHITECTURE-RESEARCH.md §2.3
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §5
 */

import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { databaseService } from './database.service.js';
import { leaderSkillService, LeaderSkillInput } from './leader-skill.service.js';

// ============================================================
// 类型定义
// ============================================================

export interface BundleManifest {
  name: string;
  version: string;
  format: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  icon?: string;
  tags?: string[];
  skills: string[];                                  // skill_id 列表
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  documentation?: {
    readme?: string;
    changelog?: string;
    examples?: string;
  };
  distribution?: {
    registry?: string;
    checksum?: string;
    size?: string;
  };
}

export interface BundleInfo extends BundleManifest {
  id: string;
  source: 'local' | 'remote' | 'marketplace';
  sourceUrl?: string;
  checksum?: string;
  sizeBytes?: number;
  installCount: number;
  downloadCount: number;
  isOfficial: boolean;
  isActive: boolean;
  installed: boolean;                                // 当前是否已安装
  installedAt?: string;
}

export interface InstallOptions {
  /** 仅安装 skills，不动 Bundle 元数据 */
  skillsOnly?: boolean;
  /** 指定要安装的 skills（默认安装 Bundle 中所有） */
  skillsFilter?: string[];
  /** 强制覆盖已存在的 skill */
  overwrite?: boolean;
  /** 安装时使用的 userId */
  userId?: string;
}

export interface InstallResult {
  bundleId: string;
  installedSkills: string[];
  skippedSkills: string[];
  failedSkills: Array<{ skillId: string; error: string }>;
  durationMs: number;
}

// ============================================================
// 默认 Bundle 路径
// ============================================================

const DEFAULT_BUNDLE_PATHS = [
  // 生产环境：从打包后的 bundles 目录加载
  path.resolve(process.cwd(), 'bundles'),
  // 开发环境：从 skillhub-workflow 包内加载
  path.resolve(process.cwd(), '../../skillhub-workflow/src/bundles'),
  // 直接路径（兜底）
  path.resolve(process.cwd(), 'packages/skillhub-workflow/src/bundles')
];

// ============================================================
// Leader Bundle Service
// ============================================================

export class LeaderBundleService {
  private pool: Pool;
  private bundleCache: Map<string, BundleInfo> = new Map();
  private cacheLoaded = false;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL_MS = 60_000;

  constructor() {
    this.pool = databaseService.getPool();
  }

  // ============================================================
  // Bundle CRUD
  // ============================================================

  /**
   * 注册一个 Bundle（从文件系统加载的 manifest）
   */
  async register(manifest: BundleManifest, options: { isOfficial?: boolean; source?: string; sourceUrl?: string } = {}): Promise<BundleInfo> {
    console.log(`[LeaderBundle] Registering: ${manifest.name}@${manifest.version}`);

    const result = await this.pool.query(
      `INSERT INTO leader_bundles (
        name, version, format, description, skills, author, license, homepage,
        icon, tags, dependencies, peer_dependencies, engines,
        source, source_url, is_official, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true)
      ON CONFLICT (name) DO UPDATE SET
        version = EXCLUDED.version,
        description = EXCLUDED.description,
        skills = EXCLUDED.skills,
        tags = EXCLUDED.tags,
        dependencies = EXCLUDED.dependencies,
        source_url = EXCLUDED.source_url,
        updated_at = NOW()
      RETURNING *`,
      [
        manifest.name,
        manifest.version,
        manifest.format || 'hermes-skill-bundle/v1',
        manifest.description || null,
        JSON.stringify(manifest.skills),
        manifest.author || null,
        manifest.license || null,
        manifest.homepage || null,
        manifest.icon || null,
        JSON.stringify(manifest.tags || []),
        JSON.stringify(manifest.dependencies || {}),
        JSON.stringify(manifest.peerDependencies || {}),
        JSON.stringify(manifest.engines || {}),
        options.source || 'local',
        options.sourceUrl || null,
        options.isOfficial || false
      ]
    );

    cacheLoaded = false;
    return this.rowToBundle(result.rows[0]);
  }

  /**
   * 获取 Bundle 信息
   */
  async get(name: string): Promise<BundleInfo | null> {
    await this.ensureCacheLoaded();
    return this.bundleCache.get(name) || null;
  }

  /**
   * 列出所有 Bundle
   */
  async list(options: {
    source?: string;
    isOfficial?: boolean;
    tag?: string;
    installed?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: BundleInfo[]; total: number }> {
    const conditions: string[] = ['is_active = true'];
    const params: any[] = [];
    let paramIdx = 1;

    if (options.source) {
      conditions.push(`source = $${paramIdx++}`);
      params.push(options.source);
    }
    if (options.isOfficial !== undefined) {
      conditions.push(`is_official = $${paramIdx++}`);
      params.push(options.isOfficial);
    }
    if (options.tag) {
      conditions.push(`tags @> $${paramIdx++}::jsonb`);
      params.push(JSON.stringify([options.tag]));
    }

    const whereClause = conditions.join(' AND ');
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const itemsResult = await this.pool.query(
      `SELECT * FROM leader_bundles WHERE ${whereClause}
       ORDER BY is_official DESC, install_count DESC, name
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    const totalResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM leader_bundles WHERE ${whereClause}`,
      params
    );

    const items = itemsResult.rows.map(row => this.rowToBundle(row));
    // 标记安装状态
    for (const item of items) {
      const installResult = await this.pool.query(
        `SELECT installed_at FROM leader_installations
         WHERE bundle_id = $1 AND status = 'installed'
         ORDER BY installed_at DESC LIMIT 1`,
        [item.id]
      );
      item.installed = installResult.rows.length > 0;
      if (item.installed) {
        item.installedAt = installResult.rows[0].installed_at?.toISOString?.();
      }
    }

    return {
      items,
      total: parseInt(totalResult.rows[0].count, 10)
    };
  }

  /**
   * 停用 Bundle（不删除，保留历史）
   */
  async deactivate(name: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE leader_bundles SET is_active = false, updated_at = NOW() WHERE name = $1',
      [name]
    );
    cacheLoaded = false;
    return (result.rowCount || 0) > 0;
  }

  // ============================================================
  // Bundle 安装/卸载
  // ============================================================

  /**
   * 安装 Bundle
   *
   * 流程：
   * 1. 读取 Bundle 元数据
   * 2. 加载每个 skill 的定义（从文件系统或数据库）
   * 3. 调用 leaderSkillService.upsert() 注册每个 skill
   * 4. 记录安装记录到 leader_installations
   * 5. 更新 leader_bundles.install_count
   */
  async install(name: string, options: InstallOptions = {}): Promise<InstallResult> {
    const startTime = Date.now();
    const bundle = await this.get(name);
    if (!bundle) {
      throw new Error(`Bundle not found: ${name}`);
    }

    // 加载 skills 定义
    const skillDefs = await this.loadSkillDefinitions(bundle);

    const installedSkills: string[] = [];
    const skippedSkills: string[] = [];
    const failedSkills: Array<{ skillId: string; error: string }> = [];

    // 过滤要安装的 skills
    const skillsToInstall = options.skillsFilter
      ? skillDefs.filter(s => options.skillsFilter!.includes(s.skill_id))
      : skillDefs;

    for (const skillDef of skillsToInstall) {
      try {
        // 检查是否已存在
        if (!options.overwrite) {
          const existing = await leaderSkillService.getBySkillId(skillDef.skill_id);
          if (existing) {
            skippedSkills.push(skillDef.skill_id);
            continue;
          }
        }

        // 安装 skill
        const skillInput: LeaderSkillInput = {
          skillId: skillDef.skill_id,
          name: skillDef.name,
          category: skillDef.category,
          version: skillDef.version,
          triggers: skillDef.triggers,
          toolsRequired: skillDef.tools_required,
          riskLevel: skillDef.risk_level,
          responsibilities: skillDef.responsibilities,
          systemPrompt: skillDef.system_prompt,
          managementStyle: skillDef.management_style,
          decisionRules: skillDef.decision_rules,
          defaultSkills: skillDef.default_skills,
          bundle: name,
          description: skillDef.description
        };

        await leaderSkillService.upsert(skillInput);
        installedSkills.push(skillDef.skill_id);
      } catch (error) {
        failedSkills.push({
          skillId: skillDef.skill_id,
          error: (error as Error).message
        });
      }
    }

    // 记录安装
    await this.pool.query(
      `INSERT INTO leader_installations (bundle_id, user_id, install_options, installed_skills, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        bundle.id,
        options.userId || null,
        JSON.stringify(options),
        JSON.stringify(installedSkills),
        failedSkills.length === 0 ? 'installed' : 'failed'
      ]
    );

    // 更新安装计数
    await this.pool.query(
      `UPDATE leader_bundles SET install_count = install_count + 1 WHERE id = $1`,
      [bundle.id]
    );

    cacheLoaded = false;

    console.log(`[LeaderBundle] Installed ${name}: ${installedSkills.length} skills, ${skippedSkills.length} skipped, ${failedSkills.length} failed`);

    return {
      bundleId: bundle.id,
      installedSkills,
      skippedSkills,
      failedSkills,
      durationMs: Date.now() - startTime
    };
  }

  /**
   * 卸载 Bundle
   * 注意：这会停用 Bundle 内的所有 skills（不是物理删除）
   */
  async uninstall(name: string, options: { userId?: string } = {}): Promise<{
    bundleId: string;
    deactivatedSkills: string[];
  }> {
    const bundle = await this.get(name);
    if (!bundle) {
      throw new Error(`Bundle not found: ${name}`);
    }

    const deactivatedSkills: string[] = [];
    for (const skillId of bundle.skills) {
      const ok = await leaderSkillService.deactivate(skillId);
      if (ok) deactivatedSkills.push(skillId);
    }

    // 记录卸载
    await this.pool.query(
      `INSERT INTO leader_installations (bundle_id, user_id, installed_skills, status, uninstalled_at)
       VALUES ($1, $2, $3, 'uninstalled', NOW())`,
      [bundle.id, options.userId || null, JSON.stringify(deactivatedSkills)]
    );

    console.log(`[LeaderBundle] Uninstalled ${name}: ${deactivatedSkills.length} skills`);

    return {
      bundleId: bundle.id,
      deactivatedSkills
    };
  }

  /**
   * 列出已安装的 Bundles
   */
  async listInstalled(): Promise<BundleInfo[]> {
    const result = await this.pool.query(
      `SELECT b.*, i.installed_at
       FROM leader_bundles b
       INNER JOIN LATERAL (
         SELECT installed_at FROM leader_installations
         WHERE bundle_id = b.id AND status = 'installed'
         ORDER BY installed_at DESC LIMIT 1
       ) i ON true
       WHERE b.is_active = true
       ORDER BY i.installed_at DESC`
    );

    return result.rows.map(row => ({
      ...this.rowToBundle(row),
      installed: true,
      installedAt: row.installed_at?.toISOString?.() || row.installed_at
    }));
  }

  // ============================================================
  // 加载 skill 定义
  // ============================================================

  /**
   * 从 Bundle 中加载所有 skill 的定义
   * 支持两种来源：
   * 1. 文件系统：bundle.json 的同级 skills/ 目录
   * 2. 数据库：skill 已在 leader_skills 表中
   */
  private async loadSkillDefinitions(bundle: BundleInfo): Promise<any[]> {
    const skillDefs: any[] = [];

    // 方案 1：从数据库读取（最常见）
    for (const skillId of bundle.skills) {
      const skill = await leaderSkillService.getBySkillId(skillId);
      if (skill) {
        skillDefs.push({
          skill_id: skill.skillId,
          name: skill.name,
          category: skill.category,
          version: skill.version,
          triggers: skill.triggers,
          tools_required: skill.toolsRequired,
          risk_level: skill.riskLevel,
          responsibilities: skill.responsibilities,
          system_prompt: skill.systemPrompt,
          management_style: skill.managementStyle,
          decision_rules: skill.decisionRules,
          default_skills: skill.defaultSkills,
          bundle: bundle.name,
          description: skill.description
        });
      }
    }

    // 方案 2：从文件系统读取（用于新 Bundle 安装）
    if (skillDefs.length < bundle.skills.length) {
      const fsPath = await this.findBundlePath(bundle.name);
      if (fsPath) {
        const skillsDir = path.join(fsPath, 'skills');
        try {
          const files = await fs.readdir(skillsDir);
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const content = await fs.readFile(path.join(skillsDir, file), 'utf-8');
            const skillDef = JSON.parse(content);
            // 检查是否已从 DB 加载过
            if (!skillDefs.find(s => s.skill_id === skillDef.skill_id)) {
              skillDefs.push(skillDef);
            }
          }
        } catch (err) {
          console.warn(`[LeaderBundle] Cannot read skills dir for ${bundle.name}:`, (err as Error).message);
        }
      }
    }

    return skillDefs;
  }

  /**
   * 在多个候选路径中查找 Bundle 目录
   */
  private async findBundlePath(bundleName: string): Promise<string | null> {
    for (const basePath of DEFAULT_BUNDLE_PATHS) {
      const candidate = path.join(basePath, bundleName);
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * 从文件系统发现所有 Bundles（启动时调用）
   */
  async discoverFromFilesystem(): Promise<BundleInfo[]> {
    const discovered: BundleInfo[] = [];

    for (const basePath of DEFAULT_BUNDLE_PATHS) {
      try {
        const entries = await fs.readdir(basePath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const bundleJsonPath = path.join(basePath, entry.name, 'bundle.json');
          try {
            const content = await fs.readFile(bundleJsonPath, 'utf-8');
            const manifest: BundleManifest = JSON.parse(content);
            if (!manifest.name) manifest.name = entry.name;
            const registered = await this.register(manifest, { source: 'local' });
            discovered.push(registered);
          } catch (err) {
            console.warn(`[LeaderBundle] Failed to load ${entry.name}/bundle.json:`, (err as Error).message);
          }
        }
      } catch (err) {
        // 路径不存在是正常的
      }
    }

    console.log(`[LeaderBundle] Discovered ${discovered.length} bundles from filesystem`);
    return discovered;
  }

  // ============================================================
  // 缓存
  // ============================================================

  private async ensureCacheLoaded(): Promise<void> {
    if (this.cacheLoaded && (Date.now() - this.cacheTimestamp) < this.CACHE_TTL_MS) {
      return;
    }

    try {
      const result = await this.pool.query(
        'SELECT * FROM leader_bundles WHERE is_active = true'
      );

      this.bundleCache.clear();
      for (const row of result.rows) {
        const bundle = this.rowToBundle(row);
        this.bundleCache.set(bundle.name, bundle);
      }
      this.cacheLoaded = true;
      this.cacheTimestamp = Date.now();

      console.log(`[LeaderBundle] Cache loaded: ${this.bundleCache.size} bundles`);
    } catch (error: any) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('[LeaderBundle] leader_bundles table not found, using empty cache');
      } else {
        console.error('[LeaderBundle] Failed to load cache:', error.message);
      }
    }
  }

  // ============================================================
  // 数据库行映射
  // ============================================================

  private rowToBundle(row: any): BundleInfo {
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      format: row.format,
      description: row.description,
      author: row.author,
      license: row.license,
      homepage: row.homepage,
      icon: row.icon,
      tags: this.parseJson(row.tags, []),
      skills: this.parseJson(row.skills, []),
      dependencies: this.parseJson(row.dependencies, {}),
      peerDependencies: this.parseJson(row.peer_dependencies, {}),
      engines: this.parseJson(row.engines, {}),
      distribution: typeof row.distribution === 'string' ? JSON.parse(row.distribution) : row.distribution,
      source: row.source,
      sourceUrl: row.source_url,
      checksum: row.checksum,
      sizeBytes: row.size_bytes,
      installCount: row.install_count,
      downloadCount: row.download_count,
      isOfficial: row.is_official,
      isActive: row.is_active,
      installed: false  // 默认 false，由调用方补充
    };
  }

  private parseJson<T>(value: unknown, defaultValue: T): T {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'object') return value as T;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }
}

// 导出单例
export const leaderBundleService = new LeaderBundleService();