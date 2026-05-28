import { CompatibilityScore } from './agent-compatibility.service.js';
import { AgentService } from './agent.service.js';
import { NvwaLeaderService } from './nvwa-leader.service.js';
import { AiTeamCreationService } from './aiteam-creation.service.js';

/**
 * Agent 复用决策结果
 */
export interface AgentReuseDecision {
  roleName: string;
  decision: 'reuse' | 'create_new';
  reason: string;
  reusedAgent?: {
    agentId: string;
    agentName: string;
    source: string;
    compatibilityScore: number;
  };
  newAgentConfig?: {
    name: string;
    description: string;
    responsibilities: string[];
    skills: string[];
  };
}

/**
 * 角色 Agent 配置
 */
export interface RoleAgentConfig {
  roleName: string;
  description: string;
  responsibilities: string[];
  requiredSkills?: string[];
  matchedAgents: CompatibilityScore[];
}

/**
 * Agent 复用决策服务
 * 
 * 实现决策树逻辑：
 * - 高匹配度 → 展示给用户确认 → 用户同意则复用
 * - 低匹配度或用户拒绝 → 创建新 Agent
 */
export class AgentReuseService {
  private creationService: AiTeamCreationService;

  constructor() {
    this.creationService = new AiTeamCreationService();
  }

  /**
   * 为所有角色做出复用决策
   */
  async makeReuseDecisions(
    sessionId: string,
    roleConfigs: RoleAgentConfig[],
    userId: string
  ): Promise<AgentReuseDecision[]> {
    try {
      console.log(`🤖 Making reuse decisions for ${roleConfigs.length} roles`);

      const decisions: AgentReuseDecision[] = [];

      // 更新状态
      await this.creationService.updateStatus(sessionId, 'confirming');
      await this.creationService.updateStepStatus(sessionId, 5, 'in_progress', '正在确认 Agent 配置...');

      // 为每个角色做决策
      for (const roleConfig of roleConfigs) {
        const decision = await this.makeDecisionForRole(roleConfig, userId);
        decisions.push(decision);

        console.log(`✅ Decision for ${roleConfig.roleName}: ${decision.decision}`);
      }

      // 保存决策结果
      await this.saveDecisions(sessionId, decisions);

      // 更新进度
      await this.creationService.updateStepStatus(sessionId, 5, 'completed', 'Agent 配置已确认');

      return decisions;
    } catch (error) {
      console.error('Error in makeReuseDecisions:', error);
      throw error;
    }
  }

  /**
   * 为单个角色做决策
   */
  private async makeDecisionForRole(
    roleConfig: RoleAgentConfig,
    userId: string
  ): Promise<AgentReuseDecision> {
    const { roleName, matchedAgents } = roleConfig;

    // 1. 检查是否有高匹配度的 Agent
    const highMatchAgents = matchedAgents.filter(a => a.overallScore >= 80);

    if (highMatchAgents.length > 0) {
      // 2. 选择最佳匹配的 Agent
      const bestAgent = highMatchAgents[0];

      // 3. 尝试复用（从 SkillHub 导入或记录引用）
      const reusedAgent = await this.reuseAgent(bestAgent, userId);

      if (reusedAgent) {
        return {
          roleName,
          decision: 'reuse',
          reason: `找到高匹配度 Agent (${bestAgent.overallScore}分)`,
          reusedAgent: {
            agentId: reusedAgent.id,
            agentName: reusedAgent.name,
            source: 'skillhub',
            compatibilityScore: bestAgent.overallScore
          }
        };
      }
    }

    // 4. 如果没有合适的 Agent，创建新的
    const newAgentConfig = await this.createNewAgentConfig(roleConfig, userId);

    return {
      roleName,
      decision: 'create_new',
      reason: '未找到合适 Agent 或匹配度低，需要创建新 Agent',
      newAgentConfig
    };
  }

  /**
   * 复用现有 Agent
   */
  private async reuseAgent(
    compatibilityScore: CompatibilityScore,
    userId: string
  ): Promise<{ id: string; name: string } | null> {
    try {
      console.log(`♻️ Reusing agent: ${compatibilityScore.agentName}`);

      // TODO: 检查是否已经存在于用户的 Agent 库中
      // TODO: 从 SkillHub 导入 Agent
      // 当前阶段：返回模拟数据，实际实现在后续阶段完成
      console.log('⚠️ Agent reuse logic to be implemented in next phase');

      return {
        id: `external-${compatibilityScore.agentId}`,
        name: compatibilityScore.agentName
      };
    } catch (error) {
      console.error('Error reusing agent:', error);
      return null;
    }
  }

  /**
   * 创建新 Agent 配置
   */
  private async createNewAgentConfig(
    roleConfig: RoleAgentConfig,
    userId: string
  ): Promise<AgentReuseDecision['newAgentConfig']> {
    try {
      console.log(`🆕 Creating new agent config for: ${roleConfig.roleName}`);

      // TODO: 使用 Nvwa Leader Service 生成 Agent 配置
      // TODO: 保存到用户的 Agent 库
      // 当前阶段：返回基础配置，实际实现在后续阶段完成
      console.log('⚠️ Agent creation logic to be implemented in next phase');

      return {
        name: roleConfig.roleName,
        description: roleConfig.description,
        responsibilities: roleConfig.responsibilities,
        skills: roleConfig.requiredSkills || []
      };
    } catch (error) {
      console.error('Error creating new agent config:', error);
      
      // 降级：使用基础配置
      return {
        name: roleConfig.roleName,
        description: roleConfig.description,
        responsibilities: roleConfig.responsibilities,
        skills: roleConfig.requiredSkills || []
      };
    }
  }

  /**
   * 保存决策结果到会话
   */
  private async saveDecisions(
    sessionId: string,
    decisions: AgentReuseDecision[]
  ): Promise<void> {
    try {
      const session = await this.creationService.getSessionById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // 将决策结果添加到 requirements
      const updatedRequirements = {
        ...session.requirements,
        agentReuseDecisions: decisions
      };

      await this.creationService.updateRequirements(sessionId, updatedRequirements);

      console.log('✅ Decisions saved to session');
    } catch (error) {
      console.error('Error saving decisions:', error);
      throw error;
    }
  }

  /**
   * 用户手动确认决策（前端调用）
   */
  async confirmDecision(
    sessionId: string,
    roleName: string,
    decision: 'reuse' | 'create_new',
    userId: string
  ): Promise<AgentReuseDecision> {
    try {
      const session = await this.creationService.getSessionById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const roleConfig = (session.requirements as any).selectedRoles?.find(
        (r: any) => r.roleName === roleName
      );

      if (!roleConfig) {
        throw new Error(`Role ${roleName} not found`);
      }

      let result: AgentReuseDecision;

      if (decision === 'reuse') {
        // 查找匹配的 Agent
        const matchedAgents = (session.requirements as any).agentSearchResults?.[roleName] || [];
        const bestAgent = matchedAgents[0];

        if (bestAgent) {
          const reusedAgent = await this.reuseAgent(bestAgent, userId);
          result = {
            roleName,
            decision: 'reuse',
            reason: '用户选择复用现有 Agent',
            reusedAgent: reusedAgent ? {
              agentId: reusedAgent.id,
              agentName: reusedAgent.name,
              source: 'skillhub',
              compatibilityScore: bestAgent.overallScore
            } : undefined
          };
        } else {
          throw new Error('No matched agents found');
        }
      } else {
        // 创建新 Agent
        const newAgentConfig = await this.createNewAgentConfig(roleConfig, userId);
        result = {
          roleName,
          decision: 'create_new',
          reason: '用户选择创建新 Agent',
          newAgentConfig
        };
      }

      // 更新决策结果
      const decisions: AgentReuseDecision[] = (session.requirements as any).agentReuseDecisions || [];
      const existingIndex = decisions.findIndex((d: AgentReuseDecision) => d.roleName === roleName);

      if (existingIndex >= 0) {
        decisions[existingIndex] = result;
      } else {
        decisions.push(result);
      }

      const updatedRequirements = {
        ...session.requirements,
        agentReuseDecisions: decisions
      };

      await this.creationService.updateRequirements(sessionId, updatedRequirements);

      return result;
    } catch (error) {
      console.error('Error confirming decision:', error);
      throw error;
    }
  }

  /**
   * 获取所有角色的决策摘要
   */
  async getDecisionSummary(sessionId: string): Promise<{
    total: number;
    reuseCount: number;
    createNewCount: number;
    decisions: AgentReuseDecision[];
  }> {
    try {
      const session = await this.creationService.getSessionById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const decisions: AgentReuseDecision[] = (session.requirements as any).agentReuseDecisions || [];

      return {
        total: decisions.length,
        reuseCount: decisions.filter(d => d.decision === 'reuse').length,
        createNewCount: decisions.filter(d => d.decision === 'create_new').length,
        decisions
      };
    } catch (error) {
      console.error('Error getting decision summary:', error);
      throw error;
    }
  }
}

// 导出单例
export const agentReuseService = new AgentReuseService();
