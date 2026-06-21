/**
 * GitHub OAuth 服务
 *
 * GitHub OAuth App Code 流程（GitHub 没有 ID Token，必须走 OAuth Code）：
 *   1. 后端生成 authorize URL，前端跳转 → GitHub 授权页
 *   2. 用户授权后 GitHub 302 回 callback URL（带 ?code=...&state=...）
 *   3. 后端用 code 调 https://github.com/login/oauth/access_token 换 access_token
 *   4. 后端用 access_token 调 https://api.github.com/user 拿用户信息
 *   5. 必要时调 https://api.github.com/user/emails 拿主邮箱（用户可能设置 email 私有）
 *
 * 文档：https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
 */

import axios from 'axios';
import * as crypto from 'node:crypto';
import { BaseOAuthService } from './oauth-service.js';
import { OAuthProvider } from '../../types/oauth.types.js';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

export class GitHubOAuthService extends BaseOAuthService {
  readonly provider: OAuthProvider = 'github';

  private readonly clientId: string;
  private readonly clientSecret: string;
  // state -> { codeVerifier, redirectTo, createdAt }，用于 PKCE + 防 CSRF
  // 简单实现：state 自身是随机串，redirectTo 编码进 state（base64url）
  // 这里仅做最简版：state 是后端签发的随机串，redirectTo 通过 cookie 或 query 透传

  constructor() {
    super();
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('[GitHubOAuth] GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not configured');
    } else {
      console.log('[GitHubOAuth] GITHUB_CLIENT_ID configured, length:', this.clientId.length);
    }
  }

  /**
   * 生成 GitHub OAuth authorize URL
   * @param state 随机串（防 CSRF），可包含 redirectTo 的 base64url 编码
   * @param scopes GitHub OAuth scopes，默认 'read:user user:email'
   */
  getAuthorizeUrl(state: string, scopes: string[] = ['read:user', 'user:email']): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: '', // 由调用方注入（不同环境 redirect_uri 不同）
      scope: scopes.join(' '),
      state,
      allow_signup: 'true',
    });
    return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * 用授权 code 换 GitHub access_token
   * @param code GitHub 回调里的 code
   * @param redirectUri 注册时填的 callback URL，必须跟 authorize 时一致
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('GitHub OAuth is not configured');
    }

    const response = await axios.post(
      GITHUB_TOKEN_URL,
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      },
      {
        headers: {
          Accept: 'application/json', // 必须用 json，否则 GitHub 默认返回 urlencoded
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );

    if (response.data.error) {
      throw new Error(`GitHub token exchange failed: ${response.data.error_description || response.data.error}`);
    }

    if (!response.data.access_token) {
      throw new Error('GitHub token exchange returned no access_token');
    }

    return response.data.access_token;
  }

  /**
   * 用 access_token 拿用户基本信息
   */
  async verifyAndGetUserInfo(accessToken: string): Promise<{
    providerUserId: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    rawData: Record<string, any>;
  }> {
    // 1. 拉用户基本信息
    const userResponse = await axios.get(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'nvwax-account-portal',
      },
      timeout: 10000,
    });

    const userData = userResponse.data;
    if (!userData || !userData.id) {
      throw new Error('Failed to get user info from GitHub');
    }

    // 2. 邮箱：优先用 user.email，如果空（用户设置私有）则拉 /user/emails 找主邮箱
    let email: string | undefined = userData.email || undefined;
    if (!email) {
      try {
        const emailsResponse = await axios.get(GITHUB_EMAILS_URL, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'nvwax-account-portal',
          },
          timeout: 10000,
        });
        const primaryEmail = (emailsResponse.data as Array<{ email: string; primary: boolean; verified: boolean }>)
          .find((e) => e.primary && e.verified);
        if (primaryEmail) {
          email = primaryEmail.email;
        } else {
          // 兜底：第一个 verified 邮箱
          const anyVerified = (emailsResponse.data as Array<{ email: string; verified: boolean }>)
            .find((e) => e.verified);
          if (anyVerified) {
            email = anyVerified.email;
          }
        }
      } catch {
        // 拉邮箱失败不阻塞主流程
      }
    }

    return {
      providerUserId: String(userData.id),
      email,
      name: userData.name || userData.login || undefined,
      avatarUrl: userData.avatar_url || undefined,
      rawData: userData,
    };
  }

  /**
   * 格式化 GitHub OAuth 错误为可读消息
   */
  formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('Bad verification code')) {
        return 'GitHub 授权码无效或已过期，请重新登录';
      }
      if (message.includes('bad_credentials')) {
        return 'GitHub 凭证配置错误，请联系管理员';
      }
      if (message.includes('not configured')) {
        return 'GitHub 登录暂未配置，请联系管理员';
      }
      if (message.includes('rate limit')) {
        return 'GitHub 登录请求过于频繁，请稍后再试';
      }
    }
    return 'GitHub 登录失败，请稍后重试';
  }

  /**
   * 生成 state 随机串（32 字节 → base64url）
   */
  generateState(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * 检查 client 是否已配置
   */
  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }
}

export const githubOAuthService = new GitHubOAuthService();