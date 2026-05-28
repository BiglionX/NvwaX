/**
 * Facebook OAuth 服务
 * 
 * 通过 Facebook Graph API 验证 access token 并获取用户信息
 * 
 * 使用方式：
 * 1. 前端通过 Facebook SDK (FB.login) 获取短期 access token
 * 2. 后端接收 access token，调用 Graph API 验证并获取用户信息
 * 3. 将 access token 换取长期 token (60天) 供后续使用
 */

import axios from 'axios';
import { BaseOAuthService } from './oauth-service.js';
import { OAuthProvider } from '../../types/oauth.types.js';

// Facebook Graph API 基础 URL
const FB_GRAPH_API = 'https://graph.facebook.com/v19.0';

export class FacebookOAuthService extends BaseOAuthService {
  readonly provider: OAuthProvider = 'facebook';

  private readonly appId: string;
  private readonly appSecret: string;

  constructor() {
    super();
    this.appId = process.env.FACEBOOK_APP_ID || '';
    this.appSecret = process.env.FACEBOOK_APP_SECRET || '';

    if (!this.appId || !this.appSecret) {
      console.warn('[FacebookOAuth] FACEBOOK_APP_ID or FACEBOOK_APP_SECRET not configured');
    }
  }

  /**
   * 验证 access token 并从 Facebook 获取用户信息
   * 
   * 流程：
   * 1. 使用 app_id|app_secret 作为 token 验证 access_token 的有效性
   * 2. 如有效，调用 /me 端点获取用户基本信息
   * 
   * @param accessToken 客户端 FB.login() 获取的短期 token
   * @returns 标准化的用户信息
   */
  async verifyAndGetUserInfo(accessToken: string): Promise<{
    providerUserId: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    rawData: Record<string, any>;
  }> {
    // 1. 验证 access token 的有效性
    const debugResult = await this.debugToken(accessToken);
    
    if (!debugResult.data.is_valid) {
      throw new Error('Facebook access token is invalid or expired');
    }

    // 2. 检查 token 对应的 App ID 是否匹配
    if (debugResult.data.app_id !== this.appId) {
      throw new Error('Facebook access token does not match the configured app');
    }

    // 3. 获取用户基本信息
    const userResponse = await axios.get(`${FB_GRAPH_API}/me`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,email,picture.width(400).height(400)'
      }
    });

    const userData = userResponse.data;

    if (!userData || !userData.id) {
      throw new Error('Failed to get user info from Facebook');
    }

    return {
      providerUserId: userData.id,
      email: userData.email || undefined,
      name: userData.name || undefined,
      avatarUrl: userData.picture?.data?.url || undefined,
      rawData: userData
    };
  }

  /**
   * 验证 Facebook access token 的有效性
   */
  private async debugToken(accessToken: string): Promise<any> {
    try {
      const appToken = `${this.appId}|${this.appSecret}`;
      const response = await axios.get(`${FB_GRAPH_API}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: appToken
        }
      });
      return response.data;
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error.message || 'Token verification failed';
      throw new Error(`Facebook token verification failed: ${message}`);
    }
  }

  /**
   * 获取用户头像 URL
   */
  async getUserAvatar(accessToken: string, userId: string): Promise<string | undefined> {
    try {
      const response = await axios.get(`${FB_GRAPH_API}/${userId}/picture`, {
        params: {
          access_token: accessToken,
          type: 'large',
          redirect: false
        }
      });
      return response.data?.data?.url;
    } catch {
      return undefined;
    }
  }

  /**
   * 格式化 Facebook 错误为可读消息
   */
  formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes('invalid')) {
        return 'Facebook 登录凭证无效，请重试';
      }
      if (message.includes('expired')) {
        return 'Facebook 登录已过期，请重新授权';
      }
      if (message.includes('not configured')) {
        return 'Facebook 登录暂未配置，请联系管理员';
      }
    }
    return 'Facebook 登录失败，请稍后重试';
  }
}

export const facebookOAuthService = new FacebookOAuthService();
