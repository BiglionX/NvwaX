/**
 * Portal Social Auth Controller (Sprint 2.12)
 *
 * 统一登录模块 - account IdP 专用 social login 端点
 *
 * 与现有 /api/auth/google/login 的区别：
 *   - 现有端点：返回 JWT token（用于 nvwax 主应用）
 *   - portal 端点：签发 pc_session cookie + 返回 redirectTo（用于 OIDC IdP）
 *
 * 端点：
 *   - POST /api/portal/social/google      { credential, redirectTo? } → 签 pc_session + 200
 *   - GET  /api/portal/social/github/start?redirectTo=X → 302 GitHub
 *   - GET  /api/portal/social/github/callback?code=X&state=X → 签 pc_session + 302 redirectTo
 *
 * 共用 userService.findUserBySocialAccount / createUserFromSocialAccount / bindSocialAccount
 */

import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { googleOAuthService } from '../services/oauth/google-oauth.service.js';
import { githubOAuthService } from '../services/oauth/github-oauth.service.js';
import { pcSessionService } from '../middleware/pc-session.middleware.js';

const SAFE_REDIRECT = (rd: unknown): string => {
  if (typeof rd !== 'string') return '/portal/';
  // 只允许站内路径，避免 open redirect
  if (rd.startsWith('/') && !rd.startsWith('//')) return rd;
  return '/portal/';
};

// state 里 base64url 编码 { r: redirectTo, n: nonce, e: expiresAt }
// 简化版：仅透传 redirectTo，不做严格防重放（生产可加 Redis 校验 nonce）
const encodeState = (redirectTo: string, nonce: string): string => {
  const payload = JSON.stringify({ r: redirectTo, n: nonce, e: Date.now() + 600_000 });
  return Buffer.from(payload, 'utf8').toString('base64url');
};

const decodeState = (state: string): { redirectTo: string; nonce: string } | null => {
  try {
    const payload = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if (typeof payload.r !== 'string') return null;
    if (typeof payload.e !== 'number' || Date.now() > payload.e) return null;
    return { redirectTo: payload.r, nonce: payload.n };
  } catch {
    return null;
  }
};

// 共用的"找到或创建用户 → 签 pc_session"流程
async function signInSocialUser(res: Response, provider: 'google' | 'github', userInfo: {
  providerUserId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  rawData: Record<string, any>;
}): Promise<{ ok: true; isNewUser: boolean; userId: string } | { ok: false; status: number; code: string; message: string }> {
  try {
    const existing = await userService.findUserBySocialAccount(provider, userInfo.providerUserId);
    let userId: string;
    let isNewUser = false;

    if (existing) {
      userId = existing.user.id;
    } else {
      const created = await userService.createUserFromSocialAccount({
        provider,
        providerUserId: userInfo.providerUserId,
        email: userInfo.email,
        name: userInfo.name,
        avatarUrl: userInfo.avatarUrl,
        rawData: userInfo.rawData,
      });
      userId = created.user.id;
      isNewUser = true;
    }

    // 关键：签发 pc_session cookie，与邮箱密码登录等价
    await pcSessionService.issue(res, userId);
    return { ok: true, isNewUser, userId };
  } catch (err: any) {
    console.error(`[PortalSocialAuth] ${provider} sign-in failed:`, err);
    return {
      ok: false,
      status: 500,
      code: 'INTERNAL_ERROR',
      message: err?.message || 'social sign-in failed',
    };
  }
}

class PortalSocialAuthController {
  /**
   * POST /api/portal/social/google
   * 入参：{ credential: string, redirectTo?: string }
   * 流程：前端 GIS SDK 拿 credential → 后端验 ID Token → 签 pc_session
   */
  async google(req: Request, res: Response) {
    const { credential, redirectTo } = req.body ?? {};
    if (typeof credential !== 'string' || credential.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'credential is required' },
      });
    }

    let userInfo;
    try {
      userInfo = await googleOAuthService.verifyAndGetUserInfo(credential);
    } catch (err) {
      const message = googleOAuthService.formatErrorMessage(err);
      return res.status(401).json({
        success: false,
        error: { code: 'GOOGLE_AUTH_FAILED', message },
      });
    }

    const result = await signInSocialUser(res, 'google', userInfo);
    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    return res.json({
      success: true,
      data: {
        ok: true,
        redirectTo: SAFE_REDIRECT(redirectTo),
        isNewUser: result.isNewUser,
        provider: 'google',
      },
    });
  }

  /**
   * GET /api/portal/social/github/start?redirectTo=X
   * 流程：生成 state → 302 跳 GitHub authorize URL
   */
  async githubStart(req: Request, res: Response) {
    if (!githubOAuthService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'GitHub OAuth is not configured' },
      });
    }

    const redirectTo = SAFE_REDIRECT(req.query.redirectTo);
    const nonce = githubOAuthService.generateState();
    const state = encodeState(redirectTo, nonce);

    // base URL 必须跟 GitHub OAuth App "Authorization callback URL" 完全一致
    const callbackUrl = `${req.protocol}://${req.get('host')}/api/portal/social/github/callback`;

    const authorizeUrl = githubOAuthService.getAuthorizeUrl(state);
    // 把 redirect_uri 注入（getAuthorizeUrl 占位了空字符串）
    const url = authorizeUrl + (authorizeUrl.includes('redirect_uri=') ? '&' : '&') +
      `redirect_uri=${encodeURIComponent(callbackUrl)}`;

    return res.redirect(302, url);
  }

  /**
   * GET /api/portal/social/github/callback?code=X&state=Y
   * 流程：解码 state → code 换 token → 拿 user info → 签 pc_session → 302 回 redirectTo
   */
  async githubCallback(req: Request, res: Response) {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      // 用户在 GitHub 拒绝授权，回到 portal 主页
      console.warn(`[PortalSocialAuth] GitHub OAuth error: ${oauthError}`);
      return res.redirect(302, '/portal/?social_error=github_denied');
    }

    if (typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'code and state are required' },
      });
    }

    const decoded = decodeState(state);
    if (!decoded) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'state invalid or expired' },
      });
    }
    const redirectTo = SAFE_REDIRECT(decoded.redirectTo);

    let accessToken: string;
    let userInfo;
    try {
      const callbackUrl = `${req.protocol}://${req.get('host')}/api/portal/social/github/callback`;
      accessToken = await githubOAuthService.exchangeCodeForToken(code, callbackUrl);
      userInfo = await githubOAuthService.verifyAndGetUserInfo(accessToken);
    } catch (err) {
      const message = githubOAuthService.formatErrorMessage(err);
      return res.redirect(302, `${redirectTo}?social_error=github_failed&message=${encodeURIComponent(message)}`);
    }

    const result = await signInSocialUser(res, 'github', userInfo);
    if (!result.ok) {
      return res.redirect(302, `${redirectTo}?social_error=internal&message=${encodeURIComponent(result.message)}`);
    }

    // 成功：跳回 redirectTo，附加 social_success 参数让前端展示提示
    const sep = redirectTo.includes('?') ? '&' : '?';
    return res.redirect(302, `${redirectTo}${sep}social_success=${result.isNewUser ? 'github_new' : 'github_existing'}`);
  }
}

export const portalSocialAuthController = new PortalSocialAuthController();