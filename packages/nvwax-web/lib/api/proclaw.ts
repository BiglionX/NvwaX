import axios from 'axios';

const PROCLAW_API_BASE = process.env.NEXT_PUBLIC_PROCLAW_API_URL || 'https://api.proclaw.cc/v1';

export interface ProClawTeamConfig {
  teamName: string;
  teamConfig: Record<string, unknown>;
  metadata?: {
    source: string;
    createdAt: string;
    [key: string]: unknown;
  };
}

export interface ProClawExportResult {
  success: boolean;
  proClawAppId?: string;
  downloadUrl?: string;
  message?: string;
}

export class ProClawService {
  private token: string | null = null;

  constructor(token?: string) {
    this.token = token || null;
  }

  setToken(token: string) {
    this.token = token;
  }

  /**
   * 导出虚拟公司到 ProClaw
   */
  async exportToProClaw(config: ProClawTeamConfig): Promise<ProClawExportResult> {
    if (!this.token) {
      throw new Error('ProClaw authentication token is required');
    }

    try {
      const response = await axios.post(
        `${PROCLAW_API_BASE}/import-team`,
        config,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        proClawAppId: response.data.appId,
        downloadUrl: response.data.downloadUrl,
        message: response.data.message
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Failed to export to ProClaw:', error);
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to export to ProClaw'
      };
    }
  }

  /**
   * 获取 ProClaw OAuth 登录 URL
   */
  getLoginUrl(redirectUri: string): string {
    const clientId = process.env.NEXT_PUBLIC_PROCLAW_CLIENT_ID;
    if (!clientId) {
      throw new Error('ProClaw Client ID is not configured');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'team:write'
    });

    return `${PROCLAW_API_BASE}/oauth/authorize?${params.toString()}`;
  }

  /**
   * 通过授权码交换访问令牌
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    const clientId = process.env.NEXT_PUBLIC_PROCLAW_CLIENT_ID;
    const clientSecret = process.env.PROCLAW_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('ProClaw credentials are not configured');
    }

    try {
      const response = await axios.post(
        `${PROCLAW_API_BASE}/oauth/token`,
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret
        }
      );

      this.token = response.data.access_token;
      return response.data.access_token;
    } catch (error: unknown) {
      console.error('Failed to exchange code for token:', error);
      throw new Error('Failed to authenticate with ProClaw');
    }
  }
}

export const proClawService = new ProClawService();
