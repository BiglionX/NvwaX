import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from './database.service.js';
import { sseProgressService } from './sse-progress.service.js';

/**
 * AiTeam 创建会话类型定义
 */
export interface AiTeamSession {
  id: string;
  userId: string;
  status: SessionStatus;
  conversationHistory: ConversationMessage[];
  requirements: UserRequirements;
  selectedRoles: SelectedRole[];
  teamDesign?: any;
  progress: CreationProgress;
  finalTeamSkillId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type SessionStatus = 
  | 'initiated'
  | 'requirements_gathering'
  | 'role_selection'
  | 'agent_searching'
  | 'skill_matching'
  | 'confirming'
  | 'building'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ConversationMessage {
  role: 'user' | 'ceo_agent';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UserRequirements {
  companyType?: string;
  description?: string;
  mainResponsibilities?: string[];
  expectedOutputs?: string[];
  dataSources?: string[];
  outputs?: string[];
  skills?: string[];
  industry?: string;
  teamSize?: number | 'small' | 'medium' | 'large';
  budget?: string;
  specialRequirements?: string[];
}

export interface SelectedRole {
  role: string;
  specialty: string;
  agentType: string;
  responsibilities: string[];
  sourceAgentId?: string;
  isNewlyCreated?: boolean;
  compatibilityScore?: number;
  customizedName?: string;
  customizedDescription?: string;
  customizedResponsibilities?: string[];
  requiredSkills?: string[];
  priority?: 'high' | 'medium' | 'low';
  isLeader?: boolean;
}

export interface CreationProgress {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  steps: ProgressStep[];
}

export interface ProgressStep {
  stepNumber: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
  details?: string;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * AiTeam 创建服务
 * 
 * 负责管理 AiTeam 创建的完整流程：
 * 1. 会话管理（创建、更新、查询）
 * 2. 需求收集和分析
 * 3. 角色推荐和选择
 * 4. Agent 搜索和复用
 * 5. Skill 采集和匹配
 * 6. 进度追踪
 * 7. 最终团队生成
 */
export class AiTeamCreationService {
  private pool: Pool;

  constructor() {
    this.pool = databaseService.getPool();
  }

  /**
   * 创建新的 AiTeam 创建会话
   */
  async createSession(userId: string): Promise<AiTeamSession> {
    const id = uuidv4();
    const now = new Date();

    // 初始化进度步骤
    const initialProgress: CreationProgress = {
      currentStep: 0,
      totalSteps: 7,
      percentage: 0,
      steps: [
        { stepNumber: 1, name: '需求分析', status: 'pending', message: '等待开始' },
        { stepNumber: 2, name: '角色推荐', status: 'pending', message: '等待开始' },
        { stepNumber: 3, name: 'Agent 搜索', status: 'pending', message: '等待开始' },
        { stepNumber: 4, name: 'Skill 匹配', status: 'pending', message: '等待开始' },
        { stepNumber: 5, name: '需求确认', status: 'pending', message: '等待开始' },
        { stepNumber: 6, name: '团队构建', status: 'pending', message: '等待开始' },
        { stepNumber: 7, name: '保存配置', status: 'pending', message: '等待开始' }
      ]
    };

    await this.pool.query(
      `INSERT INTO aiteam_creation_sessions 
        (id, user_id, status, conversation_history, requirements, selected_roles, progress, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        userId,
        'initiated',
        JSON.stringify([]),
        JSON.stringify({}),
        JSON.stringify([]),
        JSON.stringify(initialProgress),
        now,
        now
      ]
    );

    console.log(`✅ Created aiteam creation session: ${id} for user ${userId}`);

    const session = await this.getSessionById(id);
    if (!session) {
      throw new Error('Failed to create session');
    }
    return session;
  }

  /**
   * 获取会话详情
   */
  async getSessionById(sessionId: string): Promise<AiTeamSession | null> {
    const result = await this.pool.query(
      'SELECT * FROM aiteam_creation_sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToSession(result.rows[0]);
  }

  /**
   * 获取用户的所有会话
   */
  async getUserSessions(userId: string, limit: number = 10, offset: number = 0): Promise<AiTeamSession[]> {
    const result = await this.pool.query(
      `SELECT * FROM aiteam_creation_sessions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(row => this.mapRowToSession(row));
  }

  /**
   * 添加对话消息
   */
  async addMessage(sessionId: string, role: 'user' | 'ceo_agent', content: string, metadata?: Record<string, any>): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
      metadata
    };

    const updatedHistory = [...session.conversationHistory, message];

    await this.pool.query(
      `UPDATE aiteam_creation_sessions 
       SET conversation_history = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [JSON.stringify(updatedHistory), sessionId]
    );
  }

  /**
   * 更新需求信息
   */
  async updateRequirements(sessionId: string, requirements: Partial<UserRequirements>): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    const updatedRequirements = { ...session.requirements, ...requirements };

    await this.pool.query(
      `UPDATE aiteam_creation_sessions 
       SET requirements = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [JSON.stringify(updatedRequirements), sessionId]
    );
  }

  /**
   * 更新选定的角色列表
   */
  async updateSelectedRoles(sessionId: string, roles: SelectedRole[]): Promise<void> {
    await this.pool.query(
      `UPDATE aiteam_creation_sessions 
       SET selected_roles = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [JSON.stringify(roles), sessionId]
    );
  }

  /**
   * 更新会话状态
   */
  async updateStatus(sessionId: string, status: SessionStatus): Promise<void> {
    // 获取旧状态（用于广播）
    const session = await this.getSessionById(sessionId);
    const oldStatus = session?.status;

    const updates: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [status, sessionId];

    if (status === 'completed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }

    await this.pool.query(
      `UPDATE aiteam_creation_sessions 
       SET ${updates.join(', ')} 
       WHERE id = $${values.length}`,
      values
    );

    // 广播状态变更
    if (oldStatus && oldStatus !== status) {
      sseProgressService.broadcastStatusChanged(sessionId, oldStatus, status).catch(err => {
        console.error('Error broadcasting status change:', err);
      });
    }
  }

  /**
   * 更新进度
   */
  async updateProgress(sessionId: string, progress: Partial<CreationProgress>): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    const updatedProgress = { ...session.progress, ...progress };

    await this.pool.query(
      `UPDATE aiteam_creation_sessions 
       SET progress = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [JSON.stringify(updatedProgress), sessionId]
    );

    // 广播进度更新
    sseProgressService.broadcastProgress(sessionId).catch(err => {
      console.error('Error broadcasting progress:', err);
    });
  }

  /**
   * 更新团队设计
   */
  async updateTeamDesign(sessionId: string, teamDesign: any): Promise<void> {
    await this.pool.query(
      'UPDATE aiteam_creation_sessions SET team_design = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(teamDesign), sessionId]
    );
    
    console.log(`💾 Team design saved for session ${sessionId}`);
  }

  /**
   * 更新单个步骤的状态
   */
  async updateStepStatus(
    sessionId: string, 
    stepNumber: number, 
    status: ProgressStep['status'],
    message?: string
  ): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    const updatedSteps = session.progress.steps.map(step => {
      if (step.stepNumber === stepNumber) {
        return {
          ...step,
          status,
          message: message || step.message,
          startedAt: status === 'in_progress' ? new Date() : step.startedAt,
          completedAt: status === 'completed' || status === 'failed' ? new Date() : step.completedAt
        };
      }
      return step;
    });

    // 计算当前步骤和百分比
    const completedSteps = updatedSteps.filter(s => s.status === 'completed').length;
    const currentStep = updatedSteps.find(s => s.status === 'in_progress')?.stepNumber || completedSteps;
    const percentage = Math.round((completedSteps / updatedSteps.length) * 100);

    await this.updateProgress(sessionId, {
      currentStep,
      percentage,
      steps: updatedSteps
    });
  }

  /**
   * 关联最终的 Team Skill ID
   */
  async linkTeamSkill(sessionId: string, teamSkillId: string): Promise<void> {
    await this.pool.query(
      `UPDATE aiteam_creation_sessions 
       SET final_team_skill_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [teamSkillId, sessionId]
    );
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM aiteam_creation_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    return result.rowCount! > 0;
  }

  /**
   * 清理过期会话（超过 24 小时未完成）
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM aiteam_creation_sessions 
       WHERE status NOT IN ('completed', 'failed', 'cancelled')
         AND created_at < NOW() - INTERVAL '24 hours'`
    );

    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired aiteam creation sessions`);
    }

    return deletedCount;
  }

  /**
   * 将会话标记为失败
   */
  async markAsFailed(sessionId: string, errorMessage: string): Promise<void> {
    await this.updateStatus(sessionId, 'failed');
    
    // 添加错误消息到对话历史
    await this.addMessage(sessionId, 'ceo_agent', `❌ 创建失败: ${errorMessage}`, {
      error: true
    });
  }

  /**
   * 将数据库行映射为会话对象
   */
  private mapRowToSession(row: any): AiTeamSession {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      conversationHistory: row.conversation_history || [],
      requirements: row.requirements || {},
      selectedRoles: row.selected_roles || [],
      teamDesign: row.team_design || null,
      progress: row.progress || {
        currentStep: 0,
        totalSteps: 7,
        percentage: 0,
        steps: []
      },
      finalTeamSkillId: row.final_team_skill_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }
}

// 导出单例实例
export const aiteamCreationService = new AiTeamCreationService();
