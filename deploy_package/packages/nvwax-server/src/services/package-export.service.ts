import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface ExportResult {
  success: boolean;
  exportPath?: string;
  error?: string;
}

export interface TeamConfig {
  metadata: {
    teamName: string;
    projectName: string;
    exportedAt: string;
    version: string;
    agentTeamId: string;
  };
  leaderConfig: any;
  teammates: any[];
  workflow: any;
  bindingRules: any;
}

export class PackageExportService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 导出 Agent Team 配置为独立目录结构
   */
  async exportAgentTeam(agentTeamId: string): Promise<ExportResult> {
    try {
      // 1. 从数据库获取 Agent Team 完整配置
      const agentTeam = await this.getAgentTeamWithDetails(agentTeamId);
      
      if (!agentTeam) {
        return {
          success: false,
          error: 'Agent Team not found'
        };
      }

      // 2. 获取关联的 AiTeam 和项目信息
      const aiTeam = await this.getAiTeamById(agentTeam.team_id);
      if (!aiTeam) {
        return {
          success: false,
          error: 'AiTeam not found'
        };
      }

      const project = await this.getProjectById(aiTeam.project_id);
      if (!project) {
        return {
          success: false,
          error: 'Project not found'
        };
      }

      // 3. 解析 agents JSON
      const agentsData = typeof agentTeam.agents === 'string' 
        ? JSON.parse(agentTeam.agents) 
        : agentTeam.agents;

      // 4. 构建团队配置
      const teamConfig: TeamConfig = {
        metadata: {
          teamName: agentTeam.name,
          projectName: project.name,
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          agentTeamId: agentTeam.id
        },
        leaderConfig: agentsData.leaderConfig || {},
        teammates: agentsData.teammates || [],
        workflow: agentsData.workflow || {},
        bindingRules: agentsData.bindingRules || {}
      };

      // 5. 收集所有依赖的 Skills
      const skills = await this.collectTeamSkills(agentsData);

      // 6. 生成独立目录结构
      const exportDir = await this.createExportDirectory({
        config: teamConfig,
        skills
      });

      return {
        success: true,
        exportPath: exportDir
      };
    } catch (error) {
      console.error('Failed to export agent team:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 获取 Agent Team 详细信息
   */
  private async getAgentTeamWithDetails(id: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM agent_teams WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * 获取 AiTeam 信息
   */
  private async getAiTeamById(id: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM ai_teams WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * 获取项目信息
   */
  private async getProjectById(id: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * 收集团队所需的所有 Skills
   */
  private async collectTeamSkills(agentsData: any): Promise<any[]> {
    const skills: any[] = [];
    
    // 从 teammates 中提取技能引用
    if (agentsData.teammates && Array.isArray(agentsData.teammates)) {
      for (const teammate of agentsData.teammates) {
        if (teammate.skills && Array.isArray(teammate.skills)) {
          for (const skillRef of teammate.skills) {
            const skill = await this.getSkillById(skillRef.id || skillRef);
            if (skill) {
              skills.push(skill);
            }
          }
        }
      }
    }

    return skills;
  }

  /**
   * 根据 ID 获取 Skill
   */
  private async getSkillById(id: string): Promise<any> {
    // 这里假设有一个 skills 表,实际需要根据你的数据库结构调整
    // 如果没有单独的 skills 表,可以返回空数组或从其他地方获取
    try {
      const result = await this.pool.query(
        'SELECT * FROM skills WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.warn('Skills table may not exist:', error);
      return null;
    }
  }

  /**
   * 创建导出目录结构
   */
  private async createExportDirectory(data: {
    config: TeamConfig;
    skills: any[];
  }): Promise<string> {
    const exportId = uuidv4();
    const exportDir = path.join(process.cwd(), 'exports', exportId);

    // 创建目录结构
    await fs.mkdir(exportDir, { recursive: true });
    await fs.mkdir(path.join(exportDir, 'config'), { recursive: true });
    await fs.mkdir(path.join(exportDir, 'skills'), { recursive: true });

    // 写入团队配置文件
    const configPath = path.join(exportDir, 'config', 'team-config.json');
    await fs.writeFile(
      configPath,
      JSON.stringify(data.config, null, 2),
      'utf-8'
    );

    // 写入 Skills 文件
    for (const skill of data.skills) {
      const skillFileName = `${skill.id || skill.name}.json`;
      const skillPath = path.join(exportDir, 'skills', skillFileName);
      await fs.writeFile(
        skillPath,
        JSON.stringify(skill, null, 2),
        'utf-8'
      );
    }

    // 创建 manifest 文件
    const manifest = {
      exportId,
      createdAt: new Date().toISOString(),
      teamName: data.config.metadata.teamName,
      projectName: data.config.metadata.projectName,
      skillsCount: data.skills.length,
      files: [
        'config/team-config.json',
        ...data.skills.map(s => `skills/${s.id || s.name}.json`)
      ]
    };

    const manifestPath = path.join(exportDir, 'manifest.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    return exportDir;
  }

  /**
   * 获取打包预览信息(不实际导出)
   */
  async getPackageInfo(agentTeamId: string): Promise<any> {
    try {
      const agentTeam = await this.getAgentTeamWithDetails(agentTeamId);
      
      if (!agentTeam) {
        return null;
      }

      const aiTeam = await this.getAiTeamById(agentTeam.team_id);
      const project = await this.getProjectById(aiTeam.project_id);

      const agentsData = typeof agentTeam.agents === 'string'
        ? JSON.parse(agentTeam.agents)
        : agentTeam.agents;

      const teammates = agentsData.teammates || [];
      const skillsCount = teammates.reduce((count: number, t: any) => 
        count + (t.skills?.length || 0), 0
      );

      return {
        teamName: agentTeam.name,
        projectName: project?.name || 'Unknown',
        teammatesCount: teammates.length,
        skillsCount,
        estimatedSize: this.estimatePackageSize(teammates.length, skillsCount)
      };
    } catch (error) {
      console.error('Failed to get package info:', error);
      return null;
    }
  }

  /**
   * 估算包大小(MB)
   */
  private estimatePackageSize(teammatesCount: number, skillsCount: number): number {
    // 基础运行时约 30MB,每个 teammate 约 5MB,每个 skill 约 2MB
    const baseSize = 30;
    const teammateSize = teammatesCount * 5;
    const skillSize = skillsCount * 2;
    return baseSize + teammateSize + skillSize;
  }
}
