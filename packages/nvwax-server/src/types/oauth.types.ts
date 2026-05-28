/**
 * OAuth 认证相关类型定义
 * 
 * 支持 Facebook 登录、微信登录（预留）等第三方社交登录
 */

// 支持的第三方登录提供商
export type OAuthProvider = 'facebook' | 'wechat' | 'github' | 'google';

// 社交账号记录（对应 social_accounts 表）
export interface SocialAccount {
  id: string;
  user_id: string;
  provider: OAuthProvider;
  provider_user_id: string;
  provider_email?: string;
  display_name?: string;
  avatar_url?: string;
  raw_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Facebook 用户信息（从 Facebook Graph API 获取）
export interface FacebookUserInfo {
  id: string;
  name?: string;
  email?: string;
  picture?: {
    data: {
      height: number;
      is_silhouette: boolean;
      url: string;
      width: number;
    };
  };
}

// 微信用户信息（预留，从微信 API 获取）
export interface WeChatUserInfo {
  openid: string;
  nickname?: string;
  sex?: number;
  province?: string;
  city?: string;
  country?: string;
  headimgurl?: string;
  unionid?: string;
  privilege?: string[];
}

// OAuth 登录请求参数
export interface OAuthLoginRequest {
  accessToken: string;
}

// OAuth 登录响应
export interface OAuthLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    isNewUser: boolean;
  };
}

// 社交账号绑定请求
export interface SocialBindRequest {
  provider: OAuthProvider;
  providerUserId: string;
  accessToken: string;
}

// 社交账号解绑请求
export interface SocialUnbindRequest {
  provider: OAuthProvider;
  providerUserId: string;
}

// 第三方 OAuth 服务接口
export interface IOAuthService {
  readonly provider: OAuthProvider;
  verifyAndGetUserInfo(accessToken: string): Promise<{
    providerUserId: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    rawData: Record<string, any>;
  }>;
}
