import { Pool } from 'pg';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

/**
 * 虚拟公司导出包结构
 * 对应 docs/integration/virtual-company-package.schema.json (schemaVersion 1.0.0)
 * 必须与 ProClaw 端 schema 保持同步
 */
export interface VirtualCompanyPackage {
  schemaVersion: string;
  packageId: string;
  exportedAt: string;
  checksum: string;
  source: {
    platform: 'nvwax';
    sessionId: string;
    userId?: string;
    aiteamId?: string;
  };
  team: {
    id: string;
    name: string;
    description?: string;
    industry?: string;
    tags?: string[];
    ceoConfig?: Record<string, unknown>;
    workflow?: Array<Record<string, unknown>>;
    bindingRules?: Array<Record<string, unknown>>;
  };
  agents: VirtualCompanyAgent[];
  skills?: VirtualCompanySkill[];
  metadata?: Record<string, unknown>;
}

export interface VirtualCompanyAgent {
  id: string;
  name: string;
  description?: string;
  role: string;
  avatarUrl?: string;
  capabilities?: string[];
  permissions?: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  modelConfig?: Record<string, unknown>;
  systemPrompt?: string;
}

export interface VirtualCompanySkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  content?: string;
}

export interface ProClawExportResult {
  success: boolean;
  proClawAppId?: string;
  downloadUrl?: string;
  message?: string;
  packageId?: string;
  checksum?: string;
}

/** 当前支持的 schema 版本，与 ProClaw 端保持同步 */
const SCHEMA_VERSION = '1.0.0';

export class ProClawBackendService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 获取 AiTeam 配置用于导出到 ProClaw
   */
  async getAiTeamConfigForProClaw(teamSkillId: string): Promise<Record<string, unknown> | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM team_skills WHERE id = $1',
        [teamSkillId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const skill = result.rows[0];

      // 构建符合 ProClaw 要求的配置格式
      const config: Record<string, unknown> = {
        teamName: skill.name,
        description: skill.description,
        leaderConfig: typeof skill.leader_config === 'string' ? JSON.parse(skill.leader_config) : skill.leader_config,
        roles: typeof skill.roles === 'string' ? JSON.parse(skill.roles) : skill.roles,
        workflow: typeof skill.workflow === 'string' ? JSON.parse(skill.workflow) : skill.workflow,
        bindingRules: typeof skill.binding_rules === 'string' ? JSON.parse(skill.binding_rules) : skill.binding_rules,
        metadata: {
          source: 'nvwax',
          createdAt: new Date().toISOString(),
          version: skill.version,
          category: skill.category
        }
      };

      // 如果是行业插件，附带 agent 明细数据
      if (skill.category === 'industry-plugin') {
        const agentsResult = await this.pool.query(
          'SELECT * FROM industry_agents WHERE team_skill_id = $1 ORDER BY sort_order ASC',
          [teamSkillId]
        );

        config.agents = agentsResult.rows.map(row => ({
          id: row.proclaw_agent_id,
          name: row.name,
          description: row.description,
          role: row.role,
          capabilities: typeof row.capabilities === 'string' ? JSON.parse(row.capabilities) : row.capabilities,
          permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
          inputSchema: typeof row.input_schema === 'string' ? JSON.parse(row.input_schema) : row.input_schema,
          outputSchema: typeof row.output_schema === 'string' ? JSON.parse(row.output_schema) : row.output_schema,
          apiBindings: typeof row.api_bindings === 'string' ? JSON.parse(row.api_bindings) : row.api_bindings,
          modelConfig: typeof row.model_config === 'string' ? JSON.parse(row.model_config) : row.model_config,
          systemPrompt: row.system_prompt
        }));
      }

      return config;
    } catch (error) {
      console.error('Failed to get AiTeam config:', error);
      return null;
    }
  }

  /**
   * 将虚拟公司创建会话（aiteam_creation_sessions）转换为 ProClaw 导出包
   *
   * 这是 ProClaw 集成的主入口。会话表中已有完整的：
   * - team_design（团队设计：角色列表、协作流程）
   * - ceo_config（CEO Agent 配置）
   * - agent_matches（每个角色的 Agent 匹配）
   * - skill_matches（团队 Skill 匹配）
   *
   * 我们把这些数据组装成符合 schema 的 VirtualCompanyPackage。
   */
  async buildVirtualCompanyPackageFromSession(
    sessionId: string,
    userId: string
  ): Promise<VirtualCompanyPackage | null> {
    try {
      const result = await this.pool.query(
        `SELECT id, user_id, team_design, ceo_config, agent_matches, skill_matches,
                final_team_skill_id, requirements, selected_roles, status
         FROM aiteam_creation_sessions WHERE id = $1 AND user_id = $2`,
        [sessionId, userId]
      );

      if (result.rows.length === 0) {
        console.warn(`[ProClawExport] Session ${sessionId} not found for user ${userId}`);
        return null;
      }

      const row = result.rows[0];
      const teamDesign = row.team_design || {};
      const ceoConfig = row.ceo_config || {};
      const agentMatches = row.agent_matches || {};
      const skillMatches = row.skill_matches || {};
      const requirements = row.requirements || {};
      const selectedRoles = row.selected_roles || [];

      // 提取团队基本信息
      const teamId = row.final_team_skill_id || `team_${sessionId.slice(0, 12)}`;
      const teamName = teamDesign.name || teamDesign.teamName || requirements.businessName || '未命名虚拟公司';
      const teamDescription = teamDesign.description || teamDesign.teamDescription;
      const industry = teamDesign.industry || requirements.industry;

      // 提取 Agent 列表
      // 优先从 agent_matches 读取（已经过匹配决策），否则从 team_design.roles 构建
      const agents = this.extractAgents(agentMatches, teamDesign);

      // 提取 Skill 列表
      const skills = this.extractSkills(skillMatches);

      const pkg: VirtualCompanyPackage = {
        schemaVersion: SCHEMA_VERSION,
        packageId: crypto.randomUUID(),
        exportedAt: new Date().toISOString(),
        // checksum 在调用方填充
        checksum: '',
        source: {
          platform: 'nvwax',
          sessionId,
          userId,
          aiteamId: row.final_team_skill_id || undefined,
        },
        team: {
          id: teamId,
          name: teamName,
          description: teamDescription,
          industry,
          tags: Array.isArray(selectedRoles) ? selectedRoles.map((r: any) => r?.name || r?.role).filter(Boolean) : undefined,
          ceoConfig,
          workflow: teamDesign.workflow,
          bindingRules: teamDesign.bindingRules,
        },
        agents,
        skills,
        metadata: {
          sessionStatus: row.status,
          requirements,
          selectedRoles,
          generatedAt: new Date().toISOString(),
        },
      };

      // 计算 SHA-256 校验和
      pkg.checksum = this.computeChecksum(pkg);

      return pkg;
    } catch (error) {
      console.error('[ProClawExport] buildVirtualCompanyPackageFromSession failed:', error);
      return null;
    }
  }

  /**
   * 将导出包写入临时文件并返回下载 URL
   * 默认写到 {os.tmpdir()}/nvwax-vc-packages/{packageId}.nvwax-vc.json
   * 路由层需要额外提供 /api/aiteam-creation/packages/:id/download 端点
   */
  async writePackageToTempFile(pkg: VirtualCompanyPackage): Promise<{ path: string; downloadUrl: string }> {
    const dir = path.join(os.tmpdir(), 'nvwax-vc-packages');
    await fs.mkdir(dir, { recursive: true });
    const filename = `${pkg.packageId}.nvwax-vc.json`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, JSON.stringify(pkg, null, 2), 'utf-8');
    // 由调用方根据 PUBLIC_BASE_URL 拼出完整下载 URL
    const downloadUrl = `/api/aiteam-creation/packages/${pkg.packageId}/download`;
    return { path: filepath, downloadUrl };
  }

  /**
   * 从临时目录读取导出包（用于 download endpoint）
   */
  async readPackageFromTempFile(packageId: string): Promise<VirtualCompanyPackage | null> {
    // 路径安全校验：只允许 UUID
    if (!/^[0-9a-fA-F-]{36}$/.test(packageId)) {
      return null;
    }
    const filepath = path.join(os.tmpdir(), 'nvwax-vc-packages', `${packageId}.nvwax-vc.json`);
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content) as VirtualCompanyPackage;
    } catch (e) {
      return null;
    }
  }

  /**
   * 旧 API：将 AiTeam 集成到 ProClaw
   * 保留向后兼容：导出 team_skills 类型的团队（v1 API）
   */
  async integrateToProClaw(teamSkillId: string, options?: {
    inventoryModule?: boolean;
  }): Promise<ProClawExportResult> {
    // 旧逻辑：返回 ProClaw 下载链接（占位）
    console.log(`[ProClawExport] integrateToProClaw(teamSkillId) legacy path for ${teamSkillId}`);
    return {
      success: true,
      proClawAppId: `proclaw_team_${Date.now()}`,
      downloadUrl: `https://proclaw.cc/download?team=${teamSkillId}`,
      message: 'AiTeam 已导出，请在 ProClaw 桌面端中导入（功能开发中）',
    };
  }

  // =============== 私有辅助方法 ===============

  private extractAgents(agentMatches: any, teamDesign: any): VirtualCompanyAgent[] {
    const out: VirtualCompanyAgent[] = [];

    // 路径 1：从 agent_matches 读取（key 可能是 agent_id 或 role）
    if (agentMatches && typeof agentMatches === 'object') {
      for (const [key, value] of Object.entries(agentMatches)) {
        const m = value as any;
        if (!m) continue;
        out.push({
          id: m.id || m.agent_id || key,
          name: m.name || m.agent_name || key,
          role: m.role || key,
          description: m.description,
          avatarUrl: m.avatar_url || m.avatarUrl,
          capabilities: Array.isArray(m.capabilities) ? m.capabilities : undefined,
          permissions: Array.isArray(m.permissions) ? m.permissions : undefined,
          inputSchema: m.input_schema || m.inputSchema,
          outputSchema: m.output_schema || m.outputSchema,
          modelConfig: m.model_config || m.modelConfig,
          systemPrompt: m.system_prompt || m.systemPrompt,
        });
      }
    }

    // 路径 2：如果路径 1 没拿到，从 team_design.roles 兜底
    if (out.length === 0 && teamDesign?.roles && Array.isArray(teamDesign.roles)) {
      for (const role of teamDesign.roles) {
        out.push({
          id: `${role.id || role.name}-placeholder`,
          name: role.name || role.role,
          role: role.role || role.name,
          description: role.description,
          capabilities: Array.isArray(role.capabilities) ? role.capabilities : undefined,
        });
      }
    }

    return out;
  }

  private extractSkills(skillMatches: any): VirtualCompanySkill[] | undefined {
    if (!skillMatches || typeof skillMatches !== 'object') return undefined;
    const out: VirtualCompanySkill[] = [];
    for (const [key, value] of Object.entries(skillMatches)) {
      const s = value as any;
      if (!s) continue;
      out.push({
        id: s.id || key,
        name: s.name || key,
        description: s.description,
        tags: Array.isArray(s.tags) ? s.tags : undefined,
        content: s.content || s.skill_md,
      });
    }
    return out.length > 0 ? out : undefined;
  }

  private computeChecksum(pkg: VirtualCompanyPackage): string {
    // 只校验核心字段，避免 source.checksum 字段本身被算入
    const { checksum: _omit, ...core } = pkg;
    const serialized = JSON.stringify(core, Object.keys(core).sort());
    return 'sha256:' + crypto.createHash('sha256').update(serialized).digest('hex');
  }
}