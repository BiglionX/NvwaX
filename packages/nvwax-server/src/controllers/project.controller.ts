import { Request, Response } from 'express';
import { projectService } from '../services/project.service.js';
import { PackageExportService } from '../services/package-export.service.js';
import { PackageBuildService } from '../services/package-build.service.js';
import { databaseService } from '../services/database.service.js';

export class ProjectController {
  // Project methods
  async createProject(req: Request, res: Response) {
    try {
      const { userId, name, description } = req.body;
      
      if (!userId || !name) {
        return res.status(400).json({ error: 'userId and name are required' });
      }

      const project = await projectService.createProject(userId, name, description);
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }

  async getProjects(req: Request, res: Response) {
    try {
      const { userId } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const result = await projectService.getProjects(userId as string, page, limit);
      res.json(result);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  async getProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await projectService.getProjectById(id as string);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }

  async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const project = await projectService.updateProject(id as string, name, description);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }

  async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await projectService.deleteProject(id as string);

      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }

  // AiTeam methods
  async createAiTeam(req: Request, res: Response) {
    try {
      const { projectId, name } = req.body;

      if (!projectId || !name) {
        return res.status(400).json({ error: 'projectId and name are required' });
      }

      const team = await projectService.createAiTeam(projectId, name);
      res.status(201).json(team);
    } catch (error) {
      console.error('Error creating AiTeam:', error);
      res.status(500).json({ error: 'Failed to create AiTeam' });
    }
  }

  async getAiTeams(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const teams = await projectService.getAiTeams(projectId as string);
      res.json(teams);
    } catch (error) {
      console.error('Error fetching AiTeams:', error);
      res.status(500).json({ error: 'Failed to fetch AiTeams' });
    }
  }

  async updateAiTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const team = await projectService.updateAiTeam(id as string, name);

      if (!team) {
        return res.status(404).json({ error: 'AiTeam not found' });
      }

      res.json(team);
    } catch (error) {
      console.error('Error updating AiTeam:', error);
      res.status(500).json({ error: 'Failed to update AiTeam' });
    }
  }

  async deleteAiTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await projectService.deleteAiTeam(id as string);

      if (!success) {
        return res.status(404).json({ error: 'AiTeam not found' });
      }

      res.json({ message: 'AiTeam deleted successfully' });
    } catch (error) {
      console.error('Error deleting AiTeam:', error);
      res.status(500).json({ error: 'Failed to delete AiTeam' });
    }
  }

  // Agent Team methods
  async createAgentTeam(req: Request, res: Response) {
    try {
      const { teamId, name, agents } = req.body;

      if (!teamId || !name) {
        return res.status(400).json({ error: 'teamId and name are required' });
      }

      const agentTeam = await projectService.createAgentTeam(teamId, name, agents);
      res.status(201).json(agentTeam);
    } catch (error) {
      console.error('Error creating AgentTeam:', error);
      res.status(500).json({ error: 'Failed to create AgentTeam' });
    }
  }

  async getAgentTeams(req: Request, res: Response) {
    try {
      const { teamId } = req.params;
      const teams = await projectService.getAgentTeams(teamId as string);
      res.json(teams);
    } catch (error) {
      console.error('Error fetching AgentTeams:', error);
      res.status(500).json({ error: 'Failed to fetch AgentTeams' });
    }
  }

  async updateAgentTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, agents } = req.body;

      const team = await projectService.updateAgentTeam(id as string, name, agents);

      if (!team) {
        return res.status(404).json({ error: 'AgentTeam not found' });
      }

      res.json(team);
    } catch (error) {
      console.error('Error updating AgentTeam:', error);
      res.status(500).json({ error: 'Failed to update AgentTeam' });
    }
  }

  async deleteAgentTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await projectService.deleteAgentTeam(id as string);

      if (!success) {
        return res.status(404).json({ error: 'AgentTeam not found' });
      }

      res.json({ message: 'AgentTeam deleted successfully' });
    } catch (error) {
      console.error('Error deleting AgentTeam:', error);
      res.status(500).json({ error: 'Failed to delete AgentTeam' });
    }
  }

  // Package Export methods
  async exportAgentTeam(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const pool = databaseService.getPool();
      const exportService = new PackageExportService(pool);
      const result = await exportService.exportAgentTeam(id as string);

      if (!result.success) {
        return res.status(400).json({ 
          success: false,
          error: result.error 
        });
      }

      res.json({ 
        success: true,
        exportPath: result.exportPath
      });
    } catch (error) {
      console.error('Error exporting agent team:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to export agent team' 
      });
    }
  }

  async getPackageInfo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const pool = databaseService.getPool();
      const exportService = new PackageExportService(pool);
      const info = await exportService.getPackageInfo(id as string);

      if (!info) {
        return res.status(404).json({ error: 'Agent Team not found' });
      }

      res.json(info);
    } catch (error) {
      console.error('Error getting package info:', error);
      res.status(500).json({ error: 'Failed to get package info' });
    }
  }

  // Package Build methods
  async buildPackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { platform, includeSkills, includeExamples } = req.body;

      if (!platform || !['windows', 'macos', 'linux'].includes(platform)) {
        return res.status(400).json({ 
          error: 'Invalid platform. Must be windows, macos, or linux' 
        });
      }

      const pool = databaseService.getPool();
      const buildService = new PackageBuildService(pool);
      
      const jobId = await buildService.triggerBuild(id as string, {
        platform,
        includeSkills: includeSkills !== false, // 默认为 true
        includeExamples: includeExamples === true // 默认为 false
      });

      res.json({ 
        success: true,
        jobId,
        estimatedTime: '5-10 minutes'
      });
    } catch (error) {
      console.error('Error triggering build:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to trigger build' 
      });
    }
  }

  async getBuildStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      
      const pool = databaseService.getPool();
      const buildService = new PackageBuildService(pool);
      const job = buildService.getJobStatus(jobId as string);

      if (!job) {
        return res.status(404).json({ error: 'Build job not found' });
      }

      res.json(job);
    } catch (error) {
      console.error('Error getting build status:', error);
      res.status(500).json({ error: 'Failed to get build status' });
    }
  }
}

export const projectController = new ProjectController();
