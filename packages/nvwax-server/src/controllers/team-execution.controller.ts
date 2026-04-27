import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '../services/database.service.js';
import axios from 'axios';

export class TeamExecutionController {
  /**
   * 启动团队执行
   * POST /api/teams/:teamId/execute
   */
  async executeTeam(req: Request, res: Response) {
    try {
      const { teamId } = req.params;
      const { requirement, workspace } = req.body;

      if (!requirement) {
        return res.status(400).json({ 
          success: false,
          error: 'Requirement is required' 
        });
      }

      // 1. 获取 Agent Team 信息
      const agentTeamResult = await databaseService.getPool().query(
        'SELECT * FROM agent_teams WHERE team_id = $1 LIMIT 1',
        [teamId]
      );

      if (agentTeamResult.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Agent team not found' 
        });
      }

      const agentTeam = agentTeamResult.rows[0];
      const agentsConfig = typeof agentTeam.agents === 'string' 
        ? JSON.parse(agentTeam.agents) 
        : agentTeam.agents;

      // 2. 创建执行记录
      const executionId = uuidv4();
      await databaseService.getPool().query(
        `INSERT INTO agent_team_executions 
          (id, agent_team_id, status, started_at) 
         VALUES ($1, $2, 'running', NOW())`,
        [executionId, agentTeam.id]
      );

      // 3. 异步执行团队任务（通过 API 调用 skillhub-workflow）
      this.executeTeamAsync(executionId, agentTeam.id, agentsConfig, requirement, workspace);

      res.json({ 
        success: true, 
        data: {
          executionId,
          status: 'running',
          message: 'Team execution started'
        }
      });
    } catch (error) {
      console.error('Error starting team execution:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to start team execution' 
      });
    }
  }

  /**
   * 异步执行团队任务
   */
  private async executeTeamAsync(
    executionId: string,
    agentTeamId: string,
    agentsConfig: any,
    requirement: string,
    workspace?: any
  ) {
    try {
      console.log(`🚀 Starting async execution ${executionId}`);

      // 调用 skillhub-workflow 的 Leader Agent API
      const workflowApiUrl = process.env.WORKFLOW_API_URL || 'http://localhost:3002/api';
      
      const response = await axios.post(`${workflowApiUrl}/orchestrate/leader`, {
        requirement,
        workspace: workspace || {}
      });

      const result = response.data;

      // 更新执行记录为完成
      await databaseService.getPool().query(
        `UPDATE agent_team_executions 
         SET status = 'completed', 
             results = $1, 
             completed_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(result), executionId]
      );

      console.log(`✅ Execution ${executionId} completed successfully`);
    } catch (error) {
      console.error(`❌ Execution ${executionId} failed:`, error);

      // 更新执行记录为失败
      await databaseService.getPool().query(
        `UPDATE agent_team_executions 
         SET status = 'failed', 
             error_message = $1, 
             completed_at = NOW()
         WHERE id = $2`,
        [error instanceof Error ? error.message : 'Unknown error', executionId]
      );
    }
  }

  /**
   * 获取执行历史
   * GET /api/agent-teams/:agentTeamId/executions
   */
  async getExecutionHistory(req: Request, res: Response) {
    try {
      const { agentTeamId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const result = await databaseService.getPool().query(
        `SELECT * FROM agent_team_executions 
         WHERE agent_team_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [agentTeamId, limit, offset]
      );

      const countResult = await databaseService.getPool().query(
        'SELECT COUNT(*) as total FROM agent_team_executions WHERE agent_team_id = $1',
        [agentTeamId]
      );

      const executions = result.rows.map(row => ({
        ...row,
        results: typeof row.results === 'string' ? JSON.parse(row.results) : row.results,
        progress: typeof row.progress === 'string' ? JSON.parse(row.progress) : row.progress
      }));

      res.json({ 
        success: true, 
        data: {
          executions,
          total: parseInt(countResult.rows[0].total),
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      });
    } catch (error) {
      console.error('Error fetching execution history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch execution history' 
      });
    }
  }

  /**
   * 获取执行详情
   * GET /api/executions/:executionId
   */
  async getExecutionDetails(req: Request, res: Response) {
    try {
      const { executionId } = req.params;

      const result = await databaseService.getPool().query(
        'SELECT * FROM agent_team_executions WHERE id = $1',
        [executionId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Execution not found' 
        });
      }

      const execution = result.rows[0];
      execution.results = typeof execution.results === 'string' 
        ? JSON.parse(execution.results) 
        : execution.results;
      execution.progress = typeof execution.progress === 'string' 
        ? JSON.parse(execution.progress) 
        : execution.progress;

      res.json({ 
        success: true, 
        data: execution 
      });
    } catch (error) {
      console.error('Error fetching execution details:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch execution details' 
      });
    }
  }

  /**
   * 取消执行
   * POST /api/executions/:executionId/cancel
   */
  async cancelExecution(req: Request, res: Response) {
    try {
      const { executionId } = req.params;

      await databaseService.getPool().query(
        `UPDATE agent_team_executions 
         SET status = 'cancelled', completed_at = NOW()
         WHERE id = $1 AND status = 'running'`,
        [executionId]
      );

      res.json({ 
        success: true, 
        message: 'Execution cancelled' 
      });
    } catch (error) {
      console.error('Error cancelling execution:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to cancel execution' 
      });
    }
  }
}

export const teamExecutionController = new TeamExecutionController();
