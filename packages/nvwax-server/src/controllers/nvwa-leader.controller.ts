import { Request, Response } from 'express';
import { NvwaLeaderService } from '../services/nvwa-leader.service.js';
import { databaseService } from '../services/database.service.js';

const nvwaLeaderService = new NvwaLeaderService(databaseService.getPool());

export class NvwaLeaderController {
  /**
   * 从 Nvwa 需求生成团队配置
   * POST /api/nvwa/generate-team
   */
  async generateTeam(req: Request, res: Response) {
    try {
      const { description, dataSources, outputs, implementation, skills } = req.body;
      
      // 验证必填字段
      if (!description) {
        return res.status(400).json({ 
          success: false,
          error: 'Description is required' 
        });
      }

      const teamConfig = await nvwaLeaderService.generateTeamFromNvwa({
        description,
        dataSources: dataSources || [],
        outputs: outputs || [],
        implementation: implementation || '',
        skills: skills || []
      });

      res.json({ 
        success: true, 
        data: teamConfig 
      });
    } catch (error) {
      console.error('Error generating team from Nvwa:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate team configuration' 
      });
    }
  }

  /**
   * 保存团队配置到项目
   * POST /api/nvwa/save-to-project
   */
  async saveToProject(req: Request, res: Response) {
    try {
      const { projectId, teamConfig } = req.body;
      
      // TODO: 从认证中间件获取用户 ID
      const userId = (req as any).user?.id || 'user-123';

      if (!projectId || !teamConfig) {
        return res.status(400).json({ 
          success: false,
          error: 'projectId and teamConfig are required' 
        });
      }

      const result = await nvwaLeaderService.saveTeamToProject(
        projectId,
        teamConfig,
        userId
      );

      res.json({ 
        success: true, 
        data: result 
      });
    } catch (error) {
      console.error('Error saving team to project:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save team to project' 
      });
    }
  }

  /**
   * 完整的 Nvwa 到项目流程（生成 + 保存）
   * POST /api/nvwa/create-and-save
   */
  async createAndSave(req: Request, res: Response) {
    try {
      const { 
        projectId, 
        description, 
        dataSources, 
        outputs, 
        implementation, 
        skills 
      } = req.body;
      
      // TODO: 从认证中间件获取用户 ID
      const userId = (req as any).user?.id || 'user-123';

      if (!projectId || !description) {
        return res.status(400).json({ 
          success: false,
          error: 'projectId and description are required' 
        });
      }

      // Step 1: 生成团队配置
      const teamConfig = await nvwaLeaderService.generateTeamFromNvwa({
        description,
        dataSources: dataSources || [],
        outputs: outputs || [],
        implementation: implementation || '',
        skills: skills || []
      });

      // Step 2: 保存到项目
      const result = await nvwaLeaderService.saveTeamToProject(
        projectId,
        teamConfig,
        userId
      );

      res.json({ 
        success: true, 
        data: {
          ...result,
          teamConfig
        }
      });
    } catch (error) {
      console.error('Error in create and save flow:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create and save team' 
      });
    }
  }

  /**
   * 创建 AiTeam（自然语言创建 AI 团队）
   * POST /api/nvwa/create-aiteam
   * 
   * 请求体:
   * {
   *   description: string,      // 需求描述（必填）
   *   dataSources?: string[],   // 数据源
   *   outputs?: string[],       // 期望产出
   *   implementation?: string,  // 实现方式
   *   skills?: string[],        // 所需技能
   *   isPublic?: boolean        // 是否公开到市场（默认 true）
   * }
   */
  async createAiTeam(req: Request, res: Response) {
    try {
      const { 
        description, 
        dataSources, 
        outputs, 
        implementation, 
        skills,
        isPublic = true
      } = req.body;
      
      // 从认证中间件获取用户 ID
      const userId = (req as any).user?.id || 'user-123';

      if (!description) {
        return res.status(400).json({ 
          success: false,
          error: '需求描述不能为空' 
        });
      }

      // Step 1: 生成 AiTeam 团队配置
      console.log(' Creating AiTeam from Nvwa data...');
      const teamConfig = await nvwaLeaderService.generateTeamFromNvwa({
        description,
        dataSources: dataSources || [],
        outputs: outputs || [],
        implementation: implementation || '',
        skills: skills || []
      }, true);

      // Step 2: 保存到 team_skills 表（公开到市场）
      const result = await nvwaLeaderService.saveTeamToProject(
        null, // 不关联到项目，只保存到市场
        teamConfig,
        userId,
        isPublic
      );

      console.log(`✅ AiTeam created: ${result.teamName} (ID: ${result.teamSkillId})`);

      res.status(201).json({ 
        success: true, 
        data: {
          teamSkillId: result.teamSkillId,
          teamName: result.teamName,
          teamConfig
        }
      });
    } catch (error) {
      console.error('Error creating AiTeam:', error);
      res.status(500).json({ 
        success: false, 
        error: '创建 AiTeam 失败' 
      });
    }
  }
}

export const nvwaLeaderController = new NvwaLeaderController();
