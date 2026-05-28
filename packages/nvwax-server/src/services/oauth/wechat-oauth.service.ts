/**
 * 微信 OAuth 服务（预留）
 * 
 * 微信开放平台网站应用扫码登录，需要：
 * - 已认证的微信开放平台账号（300元/年认证费）
 * - 已备案的国内域名
 * 
 * 当前状态：基础设施已准备，待开通后激活实际功能
 */

import { BaseOAuthService } from './oauth-service.js';
import { OAuthProvider } from '../../types/oauth.types.js';

export class WeChatOAuthService extends BaseOAuthService {
  readonly provider: OAuthProvider = 'wechat';

  private readonly appId: string;
  private readonly appSecret: string;

  constructor() {
    super();
    this.appId = process.env.WECHAT_APP_ID || '';
    this.appSecret = process.env.WECHAT_APP_SECRET || '';
  }

  get isConfigured(): boolean {
    return !!(this.appId && this.appSecret);
  }

  /**
   * 微信登录尚未开通
   */
  async verifyAndGetUserInfo(_accessToken: string): Promise<{
    providerUserId: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    rawData: Record<string, any>;
  }> {
    throw new Error('WeChat login is not yet available. Please wait for the feature to be activated.');
  }

  formatErrorMessage(_error: unknown): string {
    return '微信登录即将上线，敬请期待';
  }
}

export const weChatOAuthService = new WeChatOAuthService();
