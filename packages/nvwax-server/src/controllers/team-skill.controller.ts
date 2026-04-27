import { Request, Response } from 'express';
import { TeamSkillService } from '../services/team-skill.service.js';
import { TeamSkillPackageService } from '../services/team-skill-package.service.js';
import { databaseService } from '../services/database.service.js';

const teamSkillService = new TeamSkillService(databaseService.getPool());
const teamSkillPackageService = new TeamSkillPackageService(databaseService.getPool());

export class TeamSkillController {
  /**
   * 创建 Team Skill
   * POST /api/team-skills
   */
  async createTeamSkill(req: Request, res: Response) {
    try {
      const { name, description, category, leaderConfig, roles, workflow, bindingRules, version, isPublic } = req.body;
      
      // 验证必填字段
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // TODO: 从认证中间件获取用户 ID
      const authorId = req.user?.id || null;

      const teamSkill = await teamSkillService.createTeamSkill({
        name,
        description,
        category,
        leaderConfig,
        roles,
        workflow,
        bindingRules,
        authorId,
        version,
        isPublic
      });

      res.status(201).json({ success: true, data: teamSkill });
    } catch (error) {
      console.error('Error creating team skill:', error);
      res.status(500).json({ success: false, error: 'Failed to create team skill' });
    }
  }

  /**
   * 搜索 Team Skills
   * GET /api/team-skills
   */
  async searchTeamSkills(req: Request, res: Response) {
    try {
      const { q, category, isPublic, authorId, page = 1, limit = 20 } = req.query;

      const result = await teamSkillService.searchTeamSkills({
        query: q as string,
        category: category as string,
        isPublic: isPublic === 'true' ? true : isPublic === 'false' ? false : undefined,
        authorId: authorId as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error searching team skills:', error);
      res.status(500).json({ success: false, error: 'Failed to search team skills' });
    }
  }

  /**
   * 获取 Team Skill 详情
   * GET /api/team-skills/:id
   */
  async getTeamSkillById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const teamSkillId = Array.isArray(id) ? id[0] : id;
      
      const teamSkill = await teamSkillService.getTeamSkillById(teamSkillId);
      
      if (!teamSkill) {
        return res.status(404).json({ success: false, error: 'Team skill not found' });
      }

      res.json({ success: true, data: teamSkill });
    } catch (error) {
      console.error('Error fetching team skill:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch team skill' });
    }
  }

  /**
   * 更新 Team Skill
   * PUT /api/team-skills/:id
   */
  async updateTeamSkill(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const teamSkillId = Array.isArray(id) ? id[0] : id;
      const updateData = req.body;

      // TODO: 添加权限检查（只有作者或管理员可以更新）
      
      const teamSkill = await teamSkillService.updateTeamSkill(teamSkillId, updateData);
      
      if (!teamSkill) {
        return res.status(404).json({ success: false, error: 'Team skill not found' });
      }

      res.json({ success: true, data: teamSkill });
    } catch (error) {
      console.error('Error updating team skill:', error);
      res.status(500).json({ success: false, error: 'Failed to update team skill' });
    }
  }

  /**
   * 删除 Team Skill
   * DELETE /api/team-skills/:id
   */
  async deleteTeamSkill(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const teamSkillId = Array.isArray(id) ? id[0] : id;

      // TODO: 添加权限检查（只有作者或管理员可以删除）
      
      const deleted = await teamSkillService.deleteTeamSkill(teamSkillId);
      
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Team skill not found' });
      }

      res.json({ success: true, message: 'Team skill deleted successfully' });
    } catch (error) {
      console.error('Error deleting team skill:', error);
      res.status(500).json({ success: false, error: 'Failed to delete team skill' });
    }
  }

  /**
   * 获取公开的 Team Skills（市场展示）
   * GET /api/team-skills/marketplace?category=virtual-company
   */
  async getMarketplaceTeamSkills(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, category } = req.query;

      let result;
      if (category) {
        // 按分类筛选
        result = await teamSkillService.getTeamSkillsByCategory(
          category as string,
          parseInt(page as string),
          parseInt(limit as string)
        );
      } else {
        // 获取所有公开的
        result = await teamSkillService.getPublicTeamSkills(
          parseInt(page as string),
          parseInt(limit as string)
        );
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error fetching marketplace team skills:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch marketplace team skills' });
    }
  }

  /**
   * 按类别获取 Team Skills
   * GET /api/team-skills/category/:category
   */
  async getTeamSkillsByCategory(req: Request, res: Response) {
    try {
      const { category } = req.params;
      const categoryId = Array.isArray(category) ? category[0] : category;
      const { page = 1, limit = 20 } = req.query;

      const result = await teamSkillService.getTeamSkillsByCategory(
        categoryId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error fetching team skills by category:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch team skills by category' });
    }
  }

  /**
   * 获取用户的 Team Skills
   * GET /api/team-skills/user/:userId
   */
  async getUserTeamSkills(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const uid = Array.isArray(userId) ? userId[0] : userId;
      const { page = 1, limit = 20 } = req.query;

      const result = await teamSkillService.getUserTeamSkills(
        uid,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error fetching user team skills:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch user team skills' });
    }
  }

  /**
   * 获取 Team Skill 打包信息
   * GET /api/team-skills/:id/package-info
   */
  async getPackageInfo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const teamSkillId = Array.isArray(id) ? id[0] : id;
      
      const teamSkill = await teamSkillService.getTeamSkillById(teamSkillId);
      if (!teamSkill) {
        return res.status(404).json({ success: false, error: 'Team Skill not found' });
      }

      // 计算预估大小（简单估算）
      const rolesCount = teamSkill.roles?.length || 0;
      const workflowSteps = teamSkill.workflow?.steps?.length || 0;
      const estimatedSize = Math.max(50, rolesCount * 10 + workflowSteps * 5); // MB

      res.json({
        success: true,
        data: {
          teamName: teamSkill.name,
          description: teamSkill.description,
          category: teamSkill.category,
          rolesCount,
          workflowSteps,
          estimatedSize
        }
      });
    } catch (error) {
      console.error('Error fetching package info:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch package info' });
    }
  }

  /**
   * 触发 Team Skill 打包
   * POST /api/team-skills/:id/build-package
   */
  async buildPackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const teamSkillId = Array.isArray(id) ? id[0] : id;
      const { platform = 'windows', includeExamples = false } = req.body;

      // 验证平台参数
      if (!['windows', 'macos', 'linux'].includes(platform)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid platform. Must be windows, macos, or linux' 
        });
      }

      // 验证 Team Skill 是否存在
      const teamSkill = await teamSkillService.getTeamSkillById(teamSkillId);
      if (!teamSkill) {
        return res.status(404).json({ success: false, error: 'Team Skill not found' });
      }

      // 触发打包任务
      const jobId = await teamSkillPackageService.triggerBuild(teamSkillId, {
        platform,
        includeExamples
      });

      res.json({
        success: true,
        data: {
          jobId,
          estimatedTime: '5-10 minutes'
        }
      });
    } catch (error) {
      console.error('Error triggering build:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to trigger build' 
      });
    }
  }

  /**
   * 获取打包任务状态
   * GET /api/team-skill-builds/:jobId
   */
  async getBuildStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const buildJobId = Array.isArray(jobId) ? jobId[0] : jobId;
      
      const job = teamSkillPackageService.getJobStatus(buildJobId);
      
      if (!job) {
        return res.status(404).json({ success: false, error: 'Build job not found' });
      }

      res.json({ success: true, data: job });
    } catch (error) {
      console.error('Error fetching build status:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch build status' });
    }
  }
}

export const teamSkillController = new TeamSkillController();
