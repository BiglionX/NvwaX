/**
 * OAuth 服务抽象基类
 * 
 * 定义第三方 OAuth 登录的标准流程：
 * 1. 验证 access token 的有效性
 * 2. 从第三方平台获取用户基本信息
 * 3. 返回标准化的用户信息
 */

import { OAuthProvider, IOAuthService } from '../../types/oauth.types.js';

export abstract class BaseOAuthService implements IOAuthService {
  abstract readonly provider: OAuthProvider;

  /**
   * 验证 access token 并从第三方平台获取用户信息
   * @param accessToken 客户端获取的 access token
   * @returns 标准化用户信息
   */
  abstract verifyAndGetUserInfo(accessToken: string): Promise<{
    providerUserId: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    rawData: Record<string, any>;
  }>;

  /**
   * 从错误中提取可读的错误消息
   * @param error 捕获的异常
   * @returns 用户友好的错误消息
   */
  abstract formatErrorMessage(error: unknown): string;
}
