/**
 * Social Auth Controller
 * 
 * 处理社交登录（Facebook、微信等）的认证请求
 * 
 * 端点：
 * - POST /auth/facebook/login  - Facebook 登录
 * - POST /auth/google/login    - Google 登录
 * - POST /auth/wechat/login    - 微信登录（预留，返回未开通）
 * - GET  /auth/social/accounts - 获取当前用户绑定的社交账号
 * - POST /auth/social/bind     - 绑定社交账号到当前用户
 * - POST /auth/social/unbind   - 解绑社交账号
 */

import { Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { facebookOAuthService } from '../services/oauth/facebook-oauth.service.js';
import { googleOAuthService } from '../services/oauth/google-oauth.service.js';
import { weChatOAuthService } from '../services/oauth/wechat-oauth.service.js';

class SocialAuthController {
  /**
   * Facebook 登录
   * 
   * 流程：
   * 1. 接收前端传来的 Facebook access token
   * 2. 后端用 app_id|app_secret 验证 token 有效性
   * 3. 从 Facebook Graph API 获取用户基本信息
   * 4. 查询 social_accounts 表，判断用户是否存在
   * 5. 不存在则创建新用户，存在则返回已有用户
   * 6. 生成 JWT token 返回前端
   */
  async facebookLogin(req: Request, res: Response) {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'accessToken is required' }
        });
      }

      // 1. 验证 token 并获取用户信息
      const userInfo = await facebookOAuthService.verifyAndGetUserInfo(accessToken);

      // 2. 查找是否已有账号绑定
      const existing = await userService.findUserBySocialAccount('facebook', userInfo.providerUserId);

      if (existing) {
        // 已有账号，直接登录
        const token = userService['generateToken'](existing.user);
        const { password: _, ...userWithoutPassword } = existing.user;

        return res.json({
          success: true,
          data: {
            token,
            user: userWithoutPassword,
            isNewUser: false
          }
        });
      }

      // 3. 新用户，自动创建
      const result = await userService.createUserFromSocialAccount({
        provider: 'facebook',
        providerUserId: userInfo.providerUserId,
        email: userInfo.email,
        name: userInfo.name,
        avatarUrl: userInfo.avatarUrl,
        rawData: userInfo.rawData
      });

      return res.json({
        success: true,
        data: {
          token: result.token,
          user: result.user,
          isNewUser: true
        }
      });

    } catch (error: any) {
      console.error('[SocialAuth] Facebook login error:', error);
      const message = facebookOAuthService.formatErrorMessage(error);
      return res.status(401).json({
        success: false,
        error: { code: 'FACEBOOK_AUTH_FAILED', message }
      });
    }
  }

  /**
   * 微信登录（预留）
   * 
   * 微信开放平台认证开通前返回"即将上线"提示
   */
  async googleLogin(req: Request, res: Response) {
    try {
      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'credential is required' }
        });
      }

      // 1. 验证 credential (Google ID Token) 并获取用户信息
      const userInfo = await googleOAuthService.verifyAndGetUserInfo(credential);

      // 2. 查找是否已有账号绑定
      const existing = await userService.findUserBySocialAccount('google', userInfo.providerUserId);

      if (existing) {
        // 已有账号，直接登录
        const token = userService['generateToken'](existing.user);
        const { password: _, ...userWithoutPassword } = existing.user;

        return res.json({
          success: true,
          data: {
            token,
            user: userWithoutPassword,
            isNewUser: false
          }
        });
      }

      // 3. 新用户，自动创建
      const result = await userService.createUserFromSocialAccount({
        provider: 'google',
        providerUserId: userInfo.providerUserId,
        email: userInfo.email,
        name: userInfo.name,
        avatarUrl: userInfo.avatarUrl,
        rawData: userInfo.rawData
      });

      return res.json({
        success: true,
        data: {
          token: result.token,
          user: result.user,
          isNewUser: true
        }
      });

    } catch (error: any) {
      console.error('[SocialAuth] Google login error:', error);
      const message = googleOAuthService.formatErrorMessage(error);
      return res.status(401).json({
        success: false,
        error: { code: 'GOOGLE_AUTH_FAILED', message }
      });
    }
  }

  /**
   * 微信登录（预留）
   *
   * 微信开放平台认证开通前返回"即将上线"提示
   */
  async wechatLogin(req: Request, res: Response) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'FEATURE_NOT_AVAILABLE',
        message: '微信登录即将上线，敬请期待'
      }
    });
  }

  /**
   * 获取当前用户绑定的所有社交账号
   */
  async getSocialAccounts(req: Request, res: Response) {
    try {
      const userId = req.user?.id || req.currentUser?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '请先登录' }
        });
      }

      const accounts = await userService.getUserSocialAccounts(userId);
      return res.json({
        success: true,
        data: accounts.map(acc => ({
          id: acc.id,
          provider: acc.provider,
          providerUserId: acc.provider_user_id,
          providerEmail: acc.provider_email,
          displayName: acc.display_name,
          avatarUrl: acc.avatar_url,
          createdAt: acc.created_at
        }))
      });

    } catch (error) {
      console.error('[SocialAuth] Get social accounts error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '获取社交账号信息失败' }
      });
    }
  }

  /**
   * 绑定社交账号到当前用户
   */
  async bindSocialAccount(req: Request, res: Response) {
    try {
      const userId = req.user?.id || req.currentUser?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '请先登录' }
        });
      }

      const { provider, accessToken } = req.body;

      if (!provider || !accessToken) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'provider and accessToken are required' }
        });
      }

      // 根据 provider 验证 token 并获取用户信息
      let socialInfo;
      switch (provider) {
        case 'facebook':
          socialInfo = await facebookOAuthService.verifyAndGetUserInfo(accessToken);
          break;
        case 'google':
          socialInfo = await googleOAuthService.verifyAndGetUserInfo(accessToken);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_PROVIDER', message: `不支持的登录方式: ${provider}` }
          });
      }

      // 绑定到当前用户
      const socialAccount = await userService.bindSocialAccount(userId, {
        provider,
        providerUserId: socialInfo.providerUserId,
        email: socialInfo.email,
        name: socialInfo.name,
        avatarUrl: socialInfo.avatarUrl,
        rawData: socialInfo.rawData
      });

      return res.json({
        success: true,
        data: {
          id: socialAccount.id,
          provider: socialAccount.provider,
          displayName: socialAccount.display_name
        },
        message: '社交账号绑定成功'
      });

    } catch (error: any) {
      console.error('[SocialAuth] Bind social account error:', error);

      if (error.message?.includes('already bound to another user')) {
        return res.status(409).json({
          success: false,
          error: { code: 'ALREADY_BOUND', message: '该社交账号已被其他用户绑定' }
        });
      }

      return res.status(500).json({
        success: false,
        error: { code: 'BIND_FAILED', message: '绑定社交账号失败' }
      });
    }
  }

  /**
   * 解绑社交账号
   */
  async unbindSocialAccount(req: Request, res: Response) {
    try {
      const userId = req.user?.id || req.currentUser?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '请先登录' }
        });
      }

      const { provider, providerUserId } = req.body;

      if (!provider || !providerUserId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'provider and providerUserId are required' }
        });
      }

      const result = await userService.unbindSocialAccount(userId, provider, providerUserId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '未找到该社交账号绑定' }
        });
      }

      return res.json({
        success: true,
        message: '社交账号解绑成功'
      });

    } catch (error: any) {
      console.error('[SocialAuth] Unbind social account error:', error);

      if (error.message?.includes('Cannot unbind the only login method')) {
        return res.status(400).json({
          success: false,
          error: { code: 'LAST_LOGIN_METHOD', message: '这是唯一的登录方式，请先设置密码后再解绑' }
        });
      }

      return res.status(500).json({
        success: false,
        error: { code: 'UNBIND_FAILED', message: '解绑社交账号失败' }
      });
    }
  }
}

export const socialAuthController = new SocialAuthController();
