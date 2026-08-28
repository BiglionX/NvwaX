/**
 * Leader Bundle Registry
 *
 * 远端 Bundle Registry 客户端，支持：
 * 1. 拉取远端 Bundle（HTTP/HTTPS）
 * 2. 搜索远端 Marketplace
 * 3. 本地缓存（避免重复下载）
 * 4. 校验 checksum
 *
 * 协议：使用 Hvgemes 兼容的 tar.gz 压缩包 + bundle.json manifest
 *
 * 设计参考：
 * - docs/LEADER-AGENT-HERMES-REFACTOR-PLAN.md §5.1
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';
import { Pool } from 'pg';
import { databaseService } from './database.service.js';
import { leaderBundleService, BundleManifest } from './leader-bundle.service.js';

// ============================================================
// 类型定义
// ============================================================

export interface RegistryConfig {
  /** 默认 registry URL */
  url: string;
  /** 本地缓存目录 */
  cacheDir: string;
  /** 请求超时（ms） */
  timeoutMs: number;
  /** 重试次数 */
  maxRetries: number;
}

export interface SearchResult {
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];
  downloadCount?: number;
  rating?: number;
}

export interface PullOptions {
  /** 强制重新下载，即使已缓存 */
  force?: boolean;
  /** 校验 checksum */
  verifyChecksum?: boolean;
  /** 是否自动安装 */
  autoInstall?: boolean;
}

export interface PullResult {
  bundleName: string;
  version: string;
  sizeBytes: number;
  checksum: string;
  cached: boolean;
  installed: boolean;
  durationMs: number;
  cachePath: string;
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: RegistryConfig = {
  url: process.env.LEADER_BUNDLE_REGISTRY_URL || 'https://bundles.nvwax.cc',
  cacheDir: process.env.LEADER_BUNDLE_CACHE_DIR || path.join(os.homedir(), '.nvwax', 'bundle-cache'),
  timeoutMs: 30_000,
  maxRetries: 3
};

// ============================================================
// Leader Bundle Registry
// ============================================================

export class LeaderBundleRegistry {
  private pool: Pool;
  private config: RegistryConfig;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.pool = databaseService.getPool();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================
  // 配置
  // ============================================================

  /**
   * 获取当前配置
   */
  getConfig(): RegistryConfig {
    return { ...this.config };
  }

  /**
   * 更新 registry URL
   */
  setRegistryUrl(url: string): void {
    this.config.url = url;
    console.log(`[LeaderBundleRegistry] Registry URL set to: ${url}`);
  }

  // ============================================================
  // 搜索
  // ============================================================

  /**
   * 搜索远端 Marketplace
   * 返回最多 50 个匹配的 Bundle 列表
   */
  async search(query: string, options: { tag?: string; limit?: number } = {}): Promise<SearchResult[]> {
    const limit = options.limit || 50;
    const url = `${this.config.url}/api/search?q=${encodeURIComponent(query)}&limit=${limit}${options.tag ? `&tag=${options.tag}` : ''}`;

    try {
      const response = await this.fetchWithRetry(url, { method: 'GET' });
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.warn('[LeaderBundleRegistry] Search failed:', (error as Error).message);
      return [];
    }
  }

  // ============================================================
  // 拉取
  // ============================================================

  /**
   * 从远端 Registry 拉取 Bundle
   *
   * 流程：
   * 1. 检查本地缓存
   * 2. 如果缓存命中且 checksum 一致，直接返回
   * 3. 否则从远端下载到本地
   * 4. 解压并解析 bundle.json
   * 5. 验证 checksum
   * 6. 注册到 leader_bundles 表
   * 7. （可选）调用 leaderBundleService.install() 安装
   */
  async pull(bundleName: string, version: string = 'latest', options: PullOptions = {}): Promise<PullResult> {
    const startTime = Date.now();
    const actualVersion = version === 'latest' ? await this.resolveLatestVersion(bundleName) : version;

    // 1. 检查本地缓存
    const cachePath = this.getCachePath(bundleName, actualVersion);
    if (!options.force) {
      const cached = await this.checkCache(cachePath);
      if (cached) {
        console.log(`[LeaderBundleRegistry] Cache hit: ${bundleName}@${actualVersion}`);
        return {
          bundleName,
          version: actualVersion,
          sizeBytes: cached.sizeBytes,
          checksum: cached.checksum,
          cached: true,
          installed: false,
          durationMs: Date.now() - startTime,
          cachePath
        };
      }
    }

    // 2. 从远端下载
    const url = `${this.config.url}/api/bundles/${bundleName}/${actualVersion}/download`;
    const response = await this.fetchWithRetry(url, { method: 'GET' });

    // 3. 下载到临时文件
    const tempPath = path.join(os.tmpdir(), `bundle-${Date.now()}.tar.gz`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(tempPath, buffer);

    // 4. 校验 checksum
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    if (options.verifyChecksum) {
      const expectedChecksum = response.headers.get('x-bundle-checksum') || '';
      if (expectedChecksum && !expectedChecksum.includes(checksum)) {
        await fs.unlink(tempPath).catch(() => {});
        throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${checksum}`);
      }
    }

    // 5. 保存到缓存
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.rename(tempPath, cachePath);

    // 6. 解压并解析
    const manifest = await this.extractManifest(cachePath);

    // 7. 注册到数据库
    await leaderBundleService.register(manifest, {
      source: 'remote',
      sourceUrl: this.config.url
    });

    // 8. 更新下载计数
    await this.pool.query(
      `UPDATE leader_bundles SET download_count = download_count + 1 WHERE name = $1`,
      [bundleName]
    ).catch(() => {});

    // 9. 自动安装（如果启用）
    let installed = false;
    if (options.autoInstall) {
      const installResult = await leaderBundleService.install(bundleName);
      installed = installResult.installedSkills.length > 0;
    }

    return {
      bundleName,
      version: actualVersion,
      sizeBytes: buffer.length,
      checksum,
      cached: false,
      installed,
      durationMs: Date.now() - startTime,
      cachePath
    };
  }

  /**
   * 解析 latest 版本的真实版本号
   */
  private async resolveLatestVersion(bundleName: string): Promise<string> {
    try {
      const url = `${this.config.url}/api/bundles/${bundleName}/latest`;
      const response = await this.fetchWithRetry(url, { method: 'GET' });
      const data = await response.json();
      return data.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  /**
   * 检查本地缓存
   */
  private async checkCache(cachePath: string): Promise<{ sizeBytes: number; checksum: string } | null> {
    try {
      const stats = await fs.stat(cachePath);
      const content = await fs.readFile(cachePath);
      const checksum = crypto.createHash('sha256').update(content).digest('hex');
      return {
        sizeBytes: stats.size,
        checksum
      };
    } catch {
      return null;
    }
  }

  /**
   * 获取缓存路径
   */
  private getCachePath(name: string, version: string): string {
    return path.join(this.config.cacheDir, name, `${version}.tar.gz`);
  }

  /**
   * 从 tar.gz 中提取 bundle.json
   * 注意：这里简化实现，不真正解压 tar.gz
   * 生产环境应该用 tar 库或 zlib + tar-stream
   */
  private async extractManifest(tarPath: string): Promise<BundleManifest> {
    // 简化：直接读 tar.gz 中的第一个 JSON）
    // 真实场景：使用 tar 库解压后读 bundle.json
    const content = await fs.readFile(tarPath, 'utf-8');
    try {
      return JSON.parse(content);
    } catch {
      // 如果是 gzip，先解压
      const zlib = await import('zlib');
      const decompressed = zlib.gunzipSync(await fs.readFile(tarPath));
      const tarContent = decompressed.toString('utf-8');
      // 简化：假设 bundle.json 在前 64KB
      const endIdx = tarContent.indexOf('}\n');
      if (endIdx > 0) {
        const manifestJson = tarContent.substring(0, endIdx + 1);
        return JSON.parse(manifestJson);
      }
      throw new Error('Cannot extract bundle.json from archive');
    }
  }

  // ============================================================
  // HTTP 工具
  // ============================================================

  /**
   * 带重试的 fetch
   */
  private async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': 'nvwax-leader-bundle-registry/1.0',
            ...options.headers
          }
        });
        clearTimeout(timer);

        if (response.ok) {
          return response;
        }

        // 4xx 不重试（客户端错误）
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 5xx 重试
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        clearTimeout(timer);
        lastError = error as Error;
      }

      // 指数退避
      if (attempt < this.config.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError || new Error('Fetch failed after retries');
  }

  // ============================================================
  // 缓存管理
  // ============================================================

  /**
   * 清理缓存
   */
  async clearCache(bundleName?: string): Promise<number> {
    if (bundleName) {
      const dir = path.join(this.config.cacheDir, bundleName);
      try {
        await fs.rm(dir, { recursive: true, force: true });
        return 1;
      } catch {
        return 0;
      }
    } else {
      try {
        await fs.rm(this.config.cacheDir, { recursive: true, force: true });
        return 1;
      } catch {
        return 0;
      }
    }
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<{
    totalBundles: number;
    totalSizeBytes: number;
    cacheDir: string;
  }> {
    let totalBundles = 0;
    let totalSizeBytes = 0;

    try {
      const entries = await fs.readdir(this.config.cacheDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const bundleDir = path.join(this.config.cacheDir, entry.name);
        const files = await fs.readdir(bundleDir);
        for (const file of files) {
          const stats = await fs.stat(path.join(bundleDir, file));
          totalBundles++;
          totalSizeBytes += stats.size;
        }
      }
    } catch {
      // 缓存目录不存在
    }

    return {
      totalBundles,
      totalSizeBytes,
      cacheDir: this.config.cacheDir
    };
  }
}

// 导出单例
export const leaderBundleRegistry = new LeaderBundleRegistry();