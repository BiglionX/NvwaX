import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { Pool } from 'pg';
import { TeamSkillService } from './team-skill.service.js';

export interface TeamSkillBuildJob {
  id: string;
  teamSkillId: string;
  platform: 'windows' | 'macos' | 'linux';
  status: 'queued' | 'building' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface TeamSkillBuildOptions {
  platform: 'windows' | 'macos' | 'linux';
  includeExamples?: boolean;
}

/**
 * Team Skill 打包服务
 * 
 * 将团队技能模板转换为可执行包
 */
export class TeamSkillPackageService {
  private jobQueue: Map<string, TeamSkillBuildJob> = new Map();
  private teamSkillService: TeamSkillService;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.teamSkillService = new TeamSkillService(pool);
  }

  /**
   * 触发 Team Skill 打包任务
   */
  async triggerBuild(teamSkillId: string, options: TeamSkillBuildOptions): Promise<string> {
    const jobId = uuidv4();

    // 验证 Team Skill 是否存在
    const teamSkill = await this.teamSkillService.getTeamSkillById(teamSkillId);
    if (!teamSkill) {
      throw new Error(`Team Skill not found: ${teamSkillId}`);
    }

    // 创建任务记录
    const job: TeamSkillBuildJob = {
      id: jobId,
      teamSkillId,
      platform: options.platform,
      status: 'queued',
      progress: 0,
      createdAt: new Date()
    };

    this.jobQueue.set(jobId, job);

    // 异步执行打包
    this.executeBuild(job).catch(error => {
      console.error(`Team Skill build job ${jobId} failed:`, error);
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
    });

    return jobId;
  }

  /**
   * 获取任务状态
   */
  getJobStatus(jobId: string): TeamSkillBuildJob | undefined {
    return this.jobQueue.get(jobId);
  }

  /**
   * 获取所有任务列表
   */
  getAllJobs(): TeamSkillBuildJob[] {
    return Array.from(this.jobQueue.values());
  }

  /**
   * 清理已完成的任务（超过24小时）
   */
  cleanupOldJobs(): void {
    const now = new Date();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    for (const [jobId, job] of this.jobQueue.entries()) {
      if (job.completedAt && 
          (now.getTime() - job.completedAt.getTime()) > twentyFourHours) {
        this.jobQueue.delete(jobId);
        console.log(`Cleaned up old job: ${jobId}`);
      }
    }
  }

  /**
   * 执行打包任务
   */
  private async executeBuild(job: TeamSkillBuildJob): Promise<void> {
    try {
      job.status = 'building';
      job.progress = 10;

      // Step 1: 导出 Team Skill 配置
      console.log(`[${job.id}] Step 1: Exporting team skill configuration...`);
      const exportPath = await this.exportTeamSkillConfig(job.teamSkillId);
      
      if (!exportPath) {
        throw new Error('Failed to export team skill configuration');
      }
      
      job.progress = 30;
      console.log(`[${job.id}] Export completed: ${exportPath}`);

      // Step 2: 调用 Python 打包脚本
      console.log(`[${job.id}] Step 2: Building executable...`);
      const pythonScript = path.join(
        process.cwd(),
        '..',
        'skillhub-workflow',
        'packager',
        'build-executable.py'
      );

      console.log(`[${job.id}] Python script path: ${pythonScript}`);
      console.log(`[${job.id}] Export path: ${exportPath}`);

      const outputDir = path.join(process.cwd(), 'exports', 'team-skills');
      await fs.mkdir(outputDir, { recursive: true });

      // 检查 Python 脚本是否存在
      try {
        await fs.access(pythonScript);
        console.log(`[${job.id}] ✅ Python script exists`);
      } catch (err) {
        throw new Error(`Python script not found: ${pythonScript}`);
      }

      // 使用 python3 或 python
      // Windows 用户使用自定义 Python 路径
      let pythonCommand = 'python';
      if (process.platform === 'win32') {
        // 尝试常见的 Python 安装路径
        const possiblePaths = [
          'D:\\Python\\Python314\\python.exe',
          'C:\\Python314\\python.exe',
          'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python314\\python.exe'
        ];
        
        for (const pyPath of possiblePaths) {
          try {
            await fs.access(pyPath);
            pythonCommand = pyPath;
            console.log(`[${job.id}] Found Python at: ${pyPath}`);
            break;
          } catch (err) {
            // 继续尝试下一个路径
          }
        }
      } else {
        pythonCommand = 'python3';
      }
      
      console.log(`[${job.id}] Using Python command: ${pythonCommand}`);

      const pythonProcess = spawn(pythonCommand, [
        pythonScript,
        exportPath,
        outputDir,
        job.platform
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`[${job.id}] Python stdout:`, data.toString().trim());
        
        // 根据输出更新进度
        if (stdout.includes('准备构建目录')) {
          job.progress = 40;
        } else if (stdout.includes('运行 PyInstaller')) {
          job.progress = 60;
        } else if (stdout.includes('创建分发包')) {
          job.progress = 80;
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`[${job.id}] Python stderr:`, data.toString().trim());
      });

      const exitCode = await new Promise<number>((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          console.log(`[${job.id}] Python process exited with code: ${code}`);
          resolve(code ?? 1);
        });
        pythonProcess.on('error', (err) => {
          console.error(`[${job.id}] Python process error:`, err);
          reject(err);
        });
      });

      if (exitCode !== 0) {
        const errorMsg = `Python script exited with code ${exitCode}\nStdout: ${stdout}\nStderr: ${stderr}`;
        console.error(`[${job.id}] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      job.progress = 90;
      console.log(`[${job.id}] Build completed successfully`);

      // Step 3: 查找生成的文件
      const files = await fs.readdir(outputDir);
      const packageFile = files.find(f => 
        f.endsWith('.exe') || f.endsWith('.dmg') || f.endsWith('.tar.gz') || f.endsWith('.zip')
      );

      if (!packageFile) {
        throw new Error('Package file not found in output directory');
      }

      const packagePath = path.join(outputDir, packageFile);
      const downloadUrl = `/api/downloads/team-skills/${packageFile}`;

      job.progress = 100;
      job.status = 'completed';
      job.downloadUrl = downloadUrl;
      job.completedAt = new Date();

      console.log(`[${job.id}] Package ready: ${downloadUrl}`);

    } catch (error) {
      console.error(`[${job.id}] Build failed:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
    }
  }

  /**
   * 导出 Team Skill 配置为临时目录
   */
  private async exportTeamSkillConfig(teamSkillId: string): Promise<string | null> {
    try {
      const teamSkill = await this.teamSkillService.getTeamSkillById(teamSkillId);
      if (!teamSkill) {
        return null;
      }

      // 创建临时导出目录
      const exportDir = path.join(
        process.cwd(),
        'exports',
        'team-skills',
        'temp',
        `${teamSkillId}-${Date.now()}`
      );

      await fs.mkdir(exportDir, { recursive: true });

      // 创建 config 子目录
      const configDir = path.join(exportDir, 'config');
      await fs.mkdir(configDir, { recursive: true });

      // 将 Team Skill 转换为 Agent Team 配置格式
      const agentTeamConfig = this.convertTeamSkillToAgentTeam(teamSkill);

      // 写入配置文件
      const configPath = path.join(configDir, 'team-config.json');
      await fs.writeFile(
        configPath,
        JSON.stringify(agentTeamConfig, null, 2),
        'utf-8'
      );

      console.log(`Exported team skill config to: ${configPath}`);
      return exportDir;

    } catch (error) {
      console.error('Failed to export team skill config:', error);
      return null;
    }
  }

  /**
   * 将 Team Skill 转换为 Agent Team 配置格式
   */
  private convertTeamSkillToAgentTeam(teamSkill: any) {
    return {
      metadata: {
        teamName: teamSkill.name,
        projectName: `Virtual Company - ${teamSkill.name}`,
        description: teamSkill.description,
        category: teamSkill.category,
        version: teamSkill.version || '1.0.0',
        exportedAt: new Date().toISOString(),
        sourceType: 'team-skill',
        sourceId: teamSkill.id
      },
      leader: {
        name: teamSkill.leaderConfig?.name || 'Team Leader',
        responsibilities: teamSkill.leaderConfig?.responsibilities || [],
        systemPrompt: this.generateLeaderPrompt(teamSkill)
      },
      teammates: (teamSkill.roles || []).map((role: any, index: number) => ({
        role: role.role,
        specialty: role.specialty,
        agentType: role.agent_type || 'general',
        responsibilities: role.responsibilities || [],
        order: index + 1
      })),
      workflow: {
        steps: (teamSkill.workflow?.steps || []).map((step: any) => ({
          step: step.step,
          action: step.action,
          performedBy: step.performed_by,
          output: step.output
        }))
      },
      collaboration: {
        communicationProtocol: teamSkill.bindingRules?.communication_protocol || '',
        conflictResolution: teamSkill.bindingRules?.conflict_resolution || '',
        qualityStandards: teamSkill.bindingRules?.quality_standards || ''
      }
    };
  }

  /**
   * 生成 Leader Agent 的系统提示
   */
  private generateLeaderPrompt(teamSkill: any): string {
    const roles = (teamSkill.roles || []).map((r: any) => r.role).join('、');
    return `你是"${teamSkill.name}"的团队领导者。

团队描述：${teamSkill.description}

团队成员包括：${roles}

协作规则：
- 沟通协议：${teamSkill.bindingRules?.communication_protocol || '标准协议'}
- 冲突解决：${teamSkill.bindingRules?.conflict_resolution || '领导者决策'}
- 质量标准：${teamSkill.bindingRules?.quality_standards || '高质量标准'}

你的职责是协调团队成员，按照工作流程完成任务。`;
  }
}
