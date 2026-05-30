/**
 * MicroBiz API 模块
 * 小商家经营 AI Team 套件 API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

export interface MicroBizTeam {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string | null;
  color: string;
  leaderConfig: JsonValue;
  workflow: JsonValue;
  accountBindingsTemplate: JsonValue[];
  notificationConfig: JsonValue;
  dataSources: JsonValue[];
  agents?: MicroBizAgent[];
}

export interface MicroBizAgent {
  id: string;
  teamId: string;
  name: string;
  description: string;
  role: string;
  capabilities: string[];
  inputSchema: JsonValue;
  outputSchema: JsonValue;
  apiBindings: JsonValue[];
  modelConfig: JsonValue;
  systemPrompt: string | null;
}

export interface MicroBizInstallation {
  id: string;
  userId: string;
  status: 'installing' | 'active' | 'paused' | 'uninstalled';
  selectedTeams: string[];
  accountBindings: Record<string, JsonValue>;
  preferences: Record<string, JsonValue>;
  agentStatus: Record<string, JsonValue>;
}

export const microbizApi = {
  /**
   * 获取所有 MicroBiz 团队
   */
  async getTeams(category?: string): Promise<{ success: boolean; data: MicroBizTeam[] }> {
    const params = category ? `?category=${category}` : '';
    const res = await fetch(`${API_URL}/microbiz/teams${params}`);
    return res.json();
  },

  /**
   * 获取团队详情
   */
  async getTeamById(id: string): Promise<{ success: boolean; data: MicroBizTeam }> {
    const res = await fetch(`${API_URL}/microbiz/teams/${id}`);
    return res.json();
  },

  /**
   * 获取团队下的 Agent
   */
  async getTeamAgents(teamId: string): Promise<{ success: boolean; data: MicroBizAgent[] }> {
    const res = await fetch(`${API_URL}/microbiz/teams/${teamId}/agents`);
    return res.json();
  },

  /**
   * 安装 MicroBiz 套件
   */
  async install(
    selectedTeams: string[],
    accountBindings?: Record<string, JsonValue>,
    preferences?: Record<string, JsonValue>,
    token?: string
  ): Promise<{ success: boolean; data: MicroBizInstallation; message: string }> {
    const res = await fetch(`${API_URL}/microbiz/install`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ selectedTeams, accountBindings, preferences })
    });
    return res.json();
  },

  /**
   * 获取用户的安装记录
   */
  async getInstallation(token?: string): Promise<{ success: boolean; data: MicroBizInstallation | null }> {
    const res = await fetch(`${API_URL}/microbiz/installations`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return res.json();
  },

  /**
   * 更新账号绑定
   */
  async updateBindings(
    platform: string,
    bindingData: Record<string, JsonValue>,
    token?: string
  ): Promise<{ success: boolean; data: MicroBizInstallation }> {
    const res = await fetch(`${API_URL}/microbiz/installations/bindings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ platform, bindingData })
    });
    return res.json();
  },

  /**
   * 更新运营偏好
   */
  async updatePreferences(
    preferences: Record<string, JsonValue>,
    token?: string
  ): Promise<{ success: boolean; data: MicroBizInstallation }> {
    const res = await fetch(`${API_URL}/microbiz/installations/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ preferences })
    });
    return res.json();
  },

  /**
   * 更新安装状态（暂停/恢复/卸载）
   */
  async updateStatus(
    status: 'active' | 'paused' | 'uninstalled',
    token?: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_URL}/microbiz/installations/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ status })
    });
    return res.json();
  }
};
