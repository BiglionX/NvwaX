import apiClient from './client';

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiTeam {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
}

export interface AgentTeam {
  id: string;
  teamId: string;
  name: string;
  agents?: unknown[];
  createdAt: string;
}

export interface PackageInfo {
  teamName: string;
  projectName: string;
  teammatesCount: number;
  skillsCount: number;
  estimatedSize: number;
}

export interface BuildJob {
  id: string;
  agentTeamId: string;
  platform: 'windows' | 'macos' | 'linux';
  status: 'queued' | 'building' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BuildOptions {
  platform: 'windows' | 'macos' | 'linux';
  includeSkills?: boolean;
  includeExamples?: boolean;
}

export const projectApi = {
  // Projects
  createProject: async (userId: string, name: string, description?: string) => {
    const response = await apiClient.post('/projects', { userId, name, description });
    return response.data;
  },

  getProjects: async (userId: string, page = 1, limit = 20) => {
    const response = await apiClient.get('/projects', {
      params: { userId, page, limit }
    });
    return response.data;
  },

  getProject: async (id: string) => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  updateProject: async (id: string, name?: string, description?: string) => {
    const response = await apiClient.put(`/projects/${id}`, { name, description });
    return response.data;
  },

  deleteProject: async (id: string) => {
    const response = await apiClient.delete(`/projects/${id}`);
    return response.data;
  },

  // AiTeams
  createAiTeam: async (projectId: string, name: string) => {
    const response = await apiClient.post('/teams', { projectId, name });
    return response.data;
  },

  getAiTeams: async (projectId: string) => {
    const response = await apiClient.get(`/projects/${projectId}/teams`);
    return response.data;
  },

  updateAiTeam: async (id: string, name: string) => {
    const response = await apiClient.put(`/teams/${id}`, { name });
    return response.data;
  },

  deleteAiTeam: async (id: string) => {
    const response = await apiClient.delete(`/teams/${id}`);
    return response.data;
  },

  // Agent Teams
  createAgentTeam: async (teamId: string, name: string, agents?: unknown[]) => {
    const response = await apiClient.post('/agent-teams', { teamId, name, agents });
    return response.data;
  },

  getAgentTeams: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/agent-teams`);
    return response.data;
  },

  updateAgentTeam: async (id: string, name?: string, agents?: unknown[]) => {
    const response = await apiClient.put(`/agent-teams/${id}`, { name, agents });
    return response.data;
  },

  deleteAgentTeam: async (id: string) => {
    const response = await apiClient.delete(`/agent-teams/${id}`);
    return response.data;
  },

  // Package Export
  getPackageInfo: async (agentTeamId: string): Promise<PackageInfo> => {
    const response = await apiClient.get(`/agent-teams/${agentTeamId}/package-info`);
    return response.data;
  },

  exportAgentTeam: async (agentTeamId: string) => {
    const response = await apiClient.post(`/agent-teams/${agentTeamId}/export`);
    return response.data;
  },

  // Package Build
  buildPackage: async (agentTeamId: string, options: BuildOptions) => {
    const response = await apiClient.post(
      `/agent-teams/${agentTeamId}/build-package`,
      options
    );
    return response.data;
  },

  getBuildStatus: async (jobId: string): Promise<BuildJob> => {
    const response = await apiClient.get(`/package-builds/${jobId}`);
    return response.data;
  }
};
