import apiClient from './client';

/**
 * Team Skill 角色定义
 */
export interface TeamSkillRole {
  role: string;
  specialty: string;
  responsibilities?: string[];
  agent_type?: string;
}

/**
 * Team Skill 工作流步骤
 */
export interface TeamSkillWorkflowStep {
  step: number;
  action: string;
  performed_by: string;
  output: string;
}

/**
 * Team Skill 配置
 */
export interface TeamSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  leaderConfig: {
    name: string;
    responsibilities: string[];
  };
  roles: TeamSkillRole[];
  workflow: {
    steps: TeamSkillWorkflowStep[];
  };
  bindingRules: {
    communication_protocol: string;
    conflict_resolution: string;
    quality_standards: string;
  };
  authorId?: string;
  version: string;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Team Skill 搜索结果
 */
export interface TeamSkillSearchResult {
  data: TeamSkill[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Leader Agent 执行结果
 */
export interface LeaderAgentExecutionResult {
  success: boolean;
  mode: string;
  teamName?: string;
  teamDescription?: string;
  category?: string;
  teammates?: Array<{
    role: string;
    specialty: string;
  }>;
  workflowSteps?: number;
  executionResult?: Record<string, unknown>;
  executionTime?: number;
  error?: string;
  timestamp: string;
}

/**
 * Team Skill API 客户端
 */
export const teamSkillApi = {
  /**
   * 创建 Team Skill
   */
  createTeamSkill: async (data: {
    name: string;
    description?: string;
    category?: string;
    leaderConfig?: Record<string, unknown>;
    roles?: TeamSkillRole[];
    workflow?: Record<string, unknown>;
    bindingRules?: Record<string, unknown>;
    version?: string;
    isPublic?: boolean;
  }) => {
    const response = await apiClient.post('/team-skills', data);
    return response.data;
  },

  /**
   * 搜索 Team Skills
   */
  searchTeamSkills: async (params: {
    query?: string;
    category?: string;
    isPublic?: boolean;
    authorId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: TeamSkillSearchResult }> => {
    const response = await apiClient.get('/team-skills', { params });
    return response.data;
  },

  /**
   * 获取 Team Skill 详情
   */
  getTeamSkillById: async (id: string): Promise<{ success: boolean; data: TeamSkill }> => {
    const response = await apiClient.get(`/team-skills/${id}`);
    return response.data;
  },

  /**
   * 更新 Team Skill
   */
  updateTeamSkill: async (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      category: string;
      leaderConfig: Record<string, unknown>;
      roles: TeamSkillRole[];
      workflow: Record<string, unknown>;
      bindingRules: Record<string, unknown>;
      version: string;
      isPublic: boolean;
    }>
  ) => {
    const response = await apiClient.put(`/team-skills/${id}`, data);
    return response.data;
  },

  /**
   * 删除 Team Skill
   */
  deleteTeamSkill: async (id: string) => {
    const response = await apiClient.delete(`/team-skills/${id}`);
    return response.data;
  },

  /**
   * 获取公开的 Team Skills（市场展示）
   */
  getMarketplaceTeamSkills: async (
    page = 1,
    limit = 20
  ): Promise<{ success: boolean; data: TeamSkillSearchResult }> => {
    const response = await apiClient.get('/team-skills/marketplace', {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * 按类别获取 Team Skills
   */
  getTeamSkillsByCategory: async (
    category: string,
    page = 1,
    limit = 20
  ): Promise<{ success: boolean; data: TeamSkillSearchResult }> => {
    const response = await apiClient.get(`/team-skills/category/${category}`, {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * 获取用户的 Team Skills
   */
  getUserTeamSkills: async (
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ success: boolean; data: TeamSkillSearchResult }> => {
    const response = await apiClient.get(`/team-skills/user/${userId}`, {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * 获取 Team Skill 打包信息
   */
  getPackageInfo: async (id: string) => {
    const response = await apiClient.get(`/team-skills/${id}/package-info`);
    return response.data.data;
  },

  /**
   * 触发 Team Skill 打包
   */
  buildPackage: async (
    id: string,
    options: {
      platform: 'windows' | 'macos' | 'linux';
      includeExamples?: boolean;
    }
  ) => {
    const response = await apiClient.post(`/team-skills/${id}/build-package`, options);
    return response.data.data;
  },

  /**
   * 获取打包任务状态
   */
  getBuildStatus: async (jobId: string) => {
    const response = await apiClient.get(`/team-skill-builds/${jobId}`);
    return response.data.data;
  }
};

/**
 * Leader Agent API 客户端
 */
export const leaderAgentApi = {
  /**
   * 使用 Leader Agent 进行智能团队编排
   */
  orchestrateWithLeader: async (
    requirement: string,
    workspace?: Record<string, unknown>
  ): Promise<LeaderAgentExecutionResult> => {
    // 注意：Leader Agent API 在 skillhub-workflow 服务上（端口 3002）
    const workflowApiUrl = process.env.NEXT_PUBLIC_WORKFLOW_API_URL || 'http://localhost:3002/api';
    
    const response = await fetch(`${workflowApiUrl}/orchestrate/leader`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requirement,
        workspace
      })
    });

    if (!response.ok) {
      throw new Error(`Leader Agent API error: ${response.statusText}`);
    }

    return response.json();
  }
};

/**
 * 团队执行 API 客户端
 */
export const teamExecutionApi = {
  /**
   * 启动团队执行
   */
  executeTeam: async (teamId: string, requirement: string) => {
    const response = await apiClient.post(`/teams/${teamId}/execute`, {
      requirement
    });
    return response.data;
  },

  /**
   * 获取执行历史
   */
  getExecutionHistory: async (agentTeamId: string) => {
    const response = await apiClient.get(`/agent-teams/${agentTeamId}/executions`);
    return response.data;
  },

  /**
   * 获取执行详情
   */
  getExecutionDetails: async (executionId: string) => {
    const response = await apiClient.get(`/executions/${executionId}`);
    return response.data;
  }
};
