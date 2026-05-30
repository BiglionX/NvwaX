/**
 * MicroBiz Package Builder Service
 * 
 * 将已安装的 MicroBiz 配置打包为可导出到 ProClaw-Light 的格式
 * 导出结构: config.json (团队+账号+偏好) + agents/ (各Agent定义)
 */

import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './database.service.js';

export interface MicroBizPackage {
  id: string;
  installationId: string;
  userId: string;
  status: 'building' | 'completed' | 'failed';
  packagePath?: string;
  fileSize?: number;
  exportUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface PackageExportConfig {
  metadata: {
    packageId: string;
    packageName: string;
    version: string;
    exportedAt: string;
    source: string;
  };
  teams: PackageTeamConfig[];
  accountBindings: Record<string, any>;
  preferences: Record<string, any>;
}

export interface PackageTeamConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  agents: PackageAgentConfig[];
  workflow: any;
  notificationConfig: any;
}

export interface PackageAgentConfig {
  id: string;
  name: string;
  description: string;
  role: string;
  capabilities: string[];
  systemPrompt: string | null;
  modelConfig: any;
  inputSchema: any;
  outputSchema: any;
}

export class MicroBizPackageService {
  private pool: Pool;
  private packages: Map<string, MicroBizPackage> = new Map();

  constructor(pool?: Pool) {
    this.pool = pool || databaseService.getPool();
  }

  /**
   * 获取包信息预览
   */
  async getPackageInfo(installationId: string): Promise<PackageExportConfig | null> {
    try {
      // 获取安装记录
      const installResult = await this.pool.query(
        'SELECT * FROM microbiz_installations WHERE id = $1',
        [installationId]
      );

      if (!installResult.rows[0]) return null;
      const installation = installResult.rows[0];

      const selectedTeams = typeof installation.selected_teams === 'string'
        ? JSON.parse(installation.selected_teams)
        : installation.selected_teams;

      const accountBindings = typeof installation.account_bindings === 'string'
        ? JSON.parse(installation.account_bindings)
        : installation.account_bindings;

      const preferences = typeof installation.preferences === 'string'
        ? JSON.parse(installation.preferences)
        : installation.preferences;

      // 获取所选团队及其 Agent 定义
      const teamConfigs: PackageTeamConfig[] = [];
      for (const teamId of selectedTeams) {
        const teamResult = await this.pool.query(
          'SELECT * FROM microbiz_teams WHERE id = $1',
          [teamId]
        );

        if (!teamResult.rows[0]) continue;
        const team = teamResult.rows[0];

        const agentsResult = await this.pool.query(
          'SELECT * FROM microbiz_agents WHERE team_id = $1 ORDER BY sort_order ASC',
          [teamId]
        );

        const agents: PackageAgentConfig[] = agentsResult.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          role: row.role,
          capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
          systemPrompt: row.system_prompt,
          modelConfig: typeof row.model_config === 'string' ? JSON.parse(row.model_config) : row.model_config,
          inputSchema: typeof row.input_schema === 'string' ? JSON.parse(row.input_schema) : row.input_schema,
          outputSchema: typeof row.output_schema === 'string' ? JSON.parse(row.output_schema) : row.output_schema
        }));

        teamConfigs.push({
          id: team.id,
          name: team.name,
          description: team.description,
          category: team.category,
          color: team.color,
          agents,
          workflow: typeof team.workflow === 'string' ? JSON.parse(team.workflow) : team.workflow,
          notificationConfig: typeof team.notification_config === 'string'
            ? JSON.parse(team.notification_config)
            : team.notification_config
        });
      }

      return {
        metadata: {
          packageId: '',
          packageName: 'MicroBiz AI Team Suite',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          source: 'NvwaX'
        },
        teams: teamConfigs,
        accountBindings,
        preferences
      };
    } catch (error) {
      console.error('Error getting MicroBiz package info:', error);
      return null;
    }
  }

  /**
   * 创建导出包
   */
  async createPackage(installationId: string): Promise<MicroBizPackage> {
    const packageId = uuidv4();
    const pkg: MicroBizPackage = {
      id: packageId,
      installationId,
      userId: '',
      status: 'building',
      createdAt: new Date().toISOString()
    };

    this.packages.set(packageId, pkg);

    try {
      const config = await this.getPackageInfo(installationId);
      if (!config) {
        throw new Error('Installation not found');
      }

      // 获取 userId
      const installResult = await this.pool.query(
        'SELECT user_id FROM microbiz_installations WHERE id = $1',
        [installationId]
      );
      pkg.userId = installResult.rows[0]?.user_id || '';

      // 创建导出目录
      const exportDir = path.join(process.cwd(), 'exports', 'microbiz', packageId);
      await fs.mkdir(exportDir, { recursive: true });
      await fs.mkdir(path.join(exportDir, 'agents'), { recursive: true });

      // 写入配置文件
      config.metadata.packageId = packageId;
      await fs.writeFile(
        path.join(exportDir, 'config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // 写入各Agent定义文件
      for (const team of config.teams) {
        for (const agent of team.agents) {
          await fs.writeFile(
            path.join(exportDir, 'agents', `${agent.id}.json`),
            JSON.stringify(agent, null, 2),
            'utf-8'
          );
        }
      }

      // 写入 manifest
      const manifest = {
        packageId,
        packageName: 'MicroBiz AI Team Suite',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        teams: config.teams.map(t => t.name),
        agentCount: config.teams.reduce((sum, t) => sum + t.agents.length, 0),
        files: [
          'config.json',
          ...config.teams.flatMap(t => t.agents.map(a => `agents/${a.id}.json`))
        ]
      };

      await fs.writeFile(
        path.join(exportDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf-8'
      );

      // 获取文件大小
      const stats = await fs.stat(path.join(exportDir, 'config.json'));

      pkg.status = 'completed';
      pkg.packagePath = exportDir;
      pkg.fileSize = stats.size;
      pkg.completedAt = new Date().toISOString();
      pkg.packagePath = exportDir;
    } catch (error) {
      pkg.status = 'failed';
      pkg.error = error instanceof Error ? error.message : 'Unknown error';
      pkg.completedAt = new Date().toISOString();
    }

    this.packages.set(packageId, pkg);
    return pkg;
  }

  /**
   * 导出到 ProClaw 云端
   */
  async exportToProClaw(installationId: string, proClawToken: string): Promise<{ success: boolean; exportUrl?: string; message: string }> {
    try {
      const config = await this.getPackageInfo(installationId);
      if (!config) {
        return { success: false, message: '安装记录不存在' };
      }

      // 模拟 ProClaw API 调用
      // 实际实现中，需要调用 ProClaw 的 API 将配置同步到桌面端
      const mockExportUrl = `https://proclaw.cc/microbiz/packages/${installationId}`;

      console.log(`[MicroBizPackage] Exporting to ProClaw: ${installationId}`);
      console.log(`[MicroBizPackage] ProClaw Token: ${proClawToken.substring(0, 8)}...`);
      console.log(`[MicroBizPackage] Teams: ${config.teams.map(t => t.name).join(', ')}`);

      // TODO: 实现真实的 ProClaw API 集成
      // const response = await fetch('https://api.proclaw.cc/v1/apps/sync', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${proClawToken}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ config })
      // });

      return {
        success: true,
        exportUrl: mockExportUrl,
        message: '已成功导出到 ProClaw，请在桌面端查看'
      };
    } catch (error) {
      console.error('Error exporting to ProClaw:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '导出到 ProClaw 失败'
      };
    }
  }

  /**
   * 获取打包状态
   */
  getPackageStatus(packageId: string): MicroBizPackage | undefined {
    return this.packages.get(packageId);
  }

  /**
   * 获取下载 URL
   */
  getDownloadUrl(packageId: string): string | null {
    const pkg = this.packages.get(packageId);
    if (!pkg || pkg.status !== 'completed' || !pkg.packagePath) return null;
    return `/downloads/microbiz/${packageId}/config.json`;
  }
}

// 导出单例
export const microbizPackageService = new MicroBizPackageService();
