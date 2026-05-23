import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { PackageExportService } from './package-export.service.js';
import { Pool } from 'pg';

export interface BuildJob {
  id: string;
  agentTeamId: string;
  platform: 'windows' | 'macos' | 'linux';
  status: 'queued' | 'building' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface BuildOptions {
  platform: 'windows' | 'macos' | 'linux';
  includeSkills?: boolean;
  includeExamples?: boolean;
}

export class PackageBuildService {
  private jobQueue: Map<string, BuildJob> = new Map();
  private exportService: PackageExportService;
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    this.exportService = new PackageExportService(pool);
  }

  /**
   * 触发打包任务
   */
  async triggerBuild(agentTeamId: string, options: BuildOptions): Promise<string> {
    const jobId = uuidv4();

    // 创建任务记录
    const job: BuildJob = {
      id: jobId,
      agentTeamId,
      platform: options.platform,
      status: 'queued',
      progress: 0,
      createdAt: new Date()
    };

    this.jobQueue.set(jobId, job);

    // 异步执行打包
    this.executeBuild(job).catch(error => {
      console.error(`Build job ${jobId} failed:`, error);
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
    });

    return jobId;
  }

  /**
   * 获取任务状态
   */
  getJobStatus(jobId: string): BuildJob | undefined {
    return this.jobQueue.get(jobId);
  }

  /**
   * 获取所有任务列表
   */
  getAllJobs(): BuildJob[] {
    return Array.from(this.jobQueue.values());
  }

  /**
   * 执行打包任务
   */
  private async executeBuild(job: BuildJob): Promise<void> {
    try {
      job.status = 'building';
      job.progress = 10;

      // Step 1: 导出团队配置
      console.log(`[${job.id}] Step 1: Exporting team configuration...`);
      const exportResult = await this.exportService.exportAgentTeam(job.agentTeamId);
      
      if (!exportResult.success || !exportResult.exportPath) {
        throw new Error(exportResult.error || 'Failed to export team configuration');
      }
      
      job.progress = 30;
      console.log(`[${job.id}] Export completed: ${exportResult.exportPath}`);

      // Step 2: 调用 Python 打包脚本
      console.log(`[${job.id}] Step 2: Building executable...`);
      const pythonScript = path.join(
        __dirname, 
        '../../../skillhub-workflow/packager/build-executable.py'
      );
      
      const outputDir = path.join(process.cwd(), 'packages', 'downloads');
      await fs.mkdir(outputDir, { recursive: true });

      const executablePath = await this.runPythonScript(
        pythonScript,
        [
          exportResult.exportPath,
          outputDir,
          job.platform
        ]
      );

      job.progress = 80;
      console.log(`[${job.id}] Build completed: ${executablePath}`);

      // Step 3: 生成下载链接
      const fileName = path.basename(executablePath);
      job.downloadUrl = `/api/downloads/${fileName}`;
      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date();

      console.log(`[${job.id}] Job completed successfully`);

    } catch (error) {
      console.error(`[${job.id}] Build failed:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
    }
  }

  /**
   * 运行 Python 脚本
   */
  private runPythonScript(scriptPath: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [scriptPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`[Python] ${data.toString().trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`[Python Error] ${data.toString().trim()}`);
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          // 从输出中提取可执行文件路径
          const match = stdout.match(/📦 输出: (.+)/);
          if (match && match[1]) {
            resolve(match[1].trim());
          } else {
            reject(new Error('Could not find executable path in output'));
          }
        } else {
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 清理过期任务(超过24小时的已完成任务)
   */
  cleanupExpiredJobs(): void {
    const now = new Date();
    const expiredHours = 24;

    for (const [jobId, job] of this.jobQueue.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        const hoursSinceCompletion = 
          (now.getTime() - (job.completedAt?.getTime() || job.createdAt.getTime())) / 
          (1000 * 60 * 60);

        if (hoursSinceCompletion > expiredHours) {
          this.jobQueue.delete(jobId);
          console.log(`Cleaned up expired job: ${jobId}`);
        }
      }
    }
  }
}
