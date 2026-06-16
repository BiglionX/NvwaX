/**
 * OIDC Controller（Sprint 1）
 *
 * 6 个端点：
 * - GET  /.well-known/openid-configuration  → OIDC Discovery 元数据
 * - GET  /.well-known/jwks.json              → 公开密钥集
 * - GET  /oauth/authorize                    → 渲染临时登录 form（仅 development）
 * - POST /oauth/authorize                    → 验证密码 + 签发 code + 302 redirect
 * - POST /oauth/token                        → authorization_code / refresh_token grant
 * - GET  /oauth/userinfo                     → Bearer 鉴权 + 返回用户信息
 * - POST /oauth/logout                       → 撤销 refresh token
 */

import { Request, Response } from 'express';
import { oidcTokenService } from '../services/oidc/oidc-token.service.js';
import { oidcService } from '../services/oidc/oidc.service.js';
import { OidcError } from '../services/oidc/oidc-error.js';
import { userService } from '../services/user.service.js';
import { databaseService } from '../services/database.service.js';
import { config } from '../config/index.js';

class OidcController {
  // ──────────── Discovery ────────────

  discovery = async (_req: Request, res: Response): Promise<void> => {
    const issuer = oidcTokenService.getIssuer();
    res.json({
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      userinfo_endpoint: `${issuer}/oauth/userinfo`,
      end_session_endpoint: `${issuer}/oauth/logout`,
      jwks_uri: `${issuer}/.well-known/jwks.json`,

      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],

      scopes_supported: ['openid', 'profile', 'email'],
      claims_supported: [
        'sub',
        'iss',
        'aud',
        'exp',
        'iat',
        'auth_time',
        'nonce',
        'email',
        'name',
        'picture',
      ],

      code_challenge_methods_supported: ['S256', 'plain'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
    });
  };

  // ──────────── JWKS ────────────

  jwks = async (_req: Request, res: Response): Promise<void> => {
    try {
      const jwks = await oidcTokenService.getJWKS();
      res.set('Cache-Control', 'public, max-age=3600');
      res.json(jwks);
    } catch (err: any) {
      res.status(500).json({ error: 'server_error', error_description: err.message });
    }
  };

  // ──────────── Authorize GET ────────────

  authorizeGet = async (req: Request, res: Response): Promise<void> => {
    // 生产环境不暴露临时登录页（Sprint 2 接 account-portal）
    if (config.nodeEnv === 'production') {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const params = this.parseAuthorizeParams(req);
    if (params instanceof OidcError) {
      res.status(params.httpStatus).json(params.toJson());
      return;
    }

    // 校验 client_id
    const client = await oidcService.getClient(params.client_id);
    if (!client) {
      res.status(400).json({ error: 'invalid_client', error_description: 'unknown client_id' });
      return;
    }
    if (!client.redirect_uris.includes(params.redirect_uri)) {
      res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri not registered' });
      return;
    }

    // Sprint 2 — 优先查 pc_session cookie；命中则直接签 code 跳转（SSO 体验）
    // req.sessionUser 由 pcSessionService.middleware() 写入
    const sessionUser = req.sessionUser;
    if (sessionUser && sessionUser.id) {
      try {
        const effectiveScope = oidcService.verifyScope(params.scope || 'openid', client.allowed_scopes);
        const code = await oidcService.issueAuthorizationCode({
          userId: sessionUser.id,
          clientId: params.client_id,
          redirectUri: params.redirect_uri,
          scope: effectiveScope,
          codeChallenge: params.code_challenge,
          codeChallengeMethod: params.code_challenge_method,
          nonce: params.nonce,
        });
        const sep = params.redirect_uri.includes('?') ? '&' : '?';
        const location = `${params.redirect_uri}${sep}code=${encodeURIComponent(code)}${
          params.state ? `&state=${encodeURIComponent(params.state)}` : ''
        }`;
        res.redirect(302, location);
        return;
      } catch (err) {
        if (err instanceof OidcError) {
          res.status(err.httpStatus).json(err.toJson());
          return;
        }
        // Fall through to login form on unexpected error
      }
    }

    // 渲染最简 HTML form
    const html = this.renderLoginForm({
      action: '/oauth/authorize',
      hidden: {
        client_id: params.client_id,
        redirect_uri: params.redirect_uri,
        scope: params.scope,
        state: params.state,
        code_challenge: params.code_challenge,
        code_challenge_method: params.code_challenge_method,
        nonce: params.nonce,
      },
      error: req.query.error as string | undefined,
    });
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  };

  // ──────────── Authorize POST ────────────

  authorizePost = async (req: Request, res: Response): Promise<void> => {
    if (config.nodeEnv === 'production') {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const {
      email,
      password,
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      nonce,
    } = req.body || {};

    if (!email || !password) {
      this.renderLoginError(res, req.body, 'email and password are required');
      return;
    }
    if (!client_id || !redirect_uri || !code_challenge) {
      res.status(400).json({ error: 'invalid_request', error_description: 'missing required parameters' });
      return;
    }

    // 客户端 + redirect_uri 校验
    const client = await oidcService.getClient(client_id);
    if (!client) {
      res.status(400).json({ error: 'invalid_client', error_description: 'unknown client_id' });
      return;
    }
    if (!client.redirect_uris.includes(redirect_uri)) {
      res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri not registered' });
      return;
    }

    // 密码验证（复用 userService.login；忽略返回的 HS256 token）
    const result = await userService.login(email, password);
    if (!result) {
      this.renderLoginError(res, req.body, 'invalid email or password');
      return;
    }

    // scope 校验
    let effectiveScope: string;
    try {
      effectiveScope = oidcService.verifyScope(scope ?? 'openid', client.allowed_scopes);
    } catch (err) {
      if (err instanceof OidcError) {
        res.status(err.httpStatus).json(err.toJson());
        return;
      }
      throw err;
    }

    // 签发 authorization code
    const code = await oidcService.issueAuthorizationCode({
      userId: result.user.id,
      clientId: client_id,
      redirectUri: redirect_uri,
      scope: effectiveScope,
      codeChallenge: code_challenge,
      codeChallengeMethod: (code_challenge_method as 'S256' | 'plain') || 'S256',
      nonce: nonce || undefined,
    });

    // 302 redirect
    const sep = redirect_uri.includes('?') ? '&' : '?';
    const location = `${redirect_uri}${sep}code=${encodeURIComponent(code)}${
      state ? `&state=${encodeURIComponent(state)}` : ''
    }`;
    res.redirect(302, location);
  };

  // ──────────── Token ────────────

  token = async (req: Request, res: Response): Promise<void> => {
    try {
      const grantType = (req.body?.grant_type || '').toString();
      const clientId = (req.body?.client_id || '').toString();

      if (!grantType) {
        throw new OidcError('invalid_request', 'grant_type is required');
      }
      if (!clientId) {
        throw new OidcError('invalid_client', 'client_id is required');
      }

      // 客户端校验
      const client = await oidcService.getClient(clientId);
      if (!client) {
        throw new OidcError('invalid_client', 'unknown client_id');
      }
      if (!client.allowed_grant_types.includes(grantType)) {
        throw new OidcError('unauthorized_client', `grant_type ${grantType} not allowed`);
      }

      if (grantType === 'authorization_code') {
        await this.handleAuthorizationCodeGrant(req, res, clientId, client);
      } else if (grantType === 'refresh_token') {
        await this.handleRefreshTokenGrant(req, res, clientId, client);
      } else {
        throw new OidcError('unsupported_grant_type', `grant_type ${grantType} is not supported`);
      }
    } catch (err) {
      this.sendOidcError(res, err);
    }
  };

  private async handleAuthorizationCodeGrant(
    req: Request,
    res: Response,
    clientId: string,
    _client: any,
  ): Promise<void> {
    const { code, redirect_uri, code_verifier } = req.body || {};
    if (!code || !redirect_uri || !code_verifier) {
      throw new OidcError(
        'invalid_request',
        'code, redirect_uri, and code_verifier are required',
      );
    }

    const consumed = await oidcService.consumeAuthorizationCode(
      code,
      clientId,
      redirect_uri,
      code_verifier,
    );

    // 查用户信息（拼 id_token claims）
    const user = await userService.getUserById(consumed.userId);
    if (!user) {
      throw new OidcError('invalid_grant', 'user not found');
    }

    // 签发三件套
    const now = Math.floor(Date.now() / 1000);
    const accessToken = await oidcTokenService.signAccessToken({
      sub: user.id,
      aud: clientId,
      scope: consumed.scope,
      client_id: clientId,
    });
    const idToken = await oidcTokenService.signIdToken({
      sub: user.id,
      aud: clientId,
      email: user.email,
      name: user.name ?? undefined,
      nonce: consumed.nonce ?? undefined,
      auth_time: now,
    });
    const refresh = await oidcService.issueRefreshToken(
      user.id,
      clientId,
      consumed.scope,
    );

    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    res.json({
      access_token: accessToken,
      id_token: idToken,
      token_type: 'Bearer',
      expires_in: oidcTokenService.getAccessTokenTtl(),
      refresh_token: refresh.token,
      scope: consumed.scope,
    });
  }

  private async handleRefreshTokenGrant(
    req: Request,
    res: Response,
    clientId: string,
    _client: any,
  ): Promise<void> {
    const { refresh_token } = req.body || {};
    if (!refresh_token) {
      throw new OidcError('invalid_request', 'refresh_token is required');
    }

    const rotated = await oidcService.rotateRefreshToken(refresh_token, clientId);
    const user = await userService.getUserById(rotated.userId);
    if (!user) {
      throw new OidcError('invalid_grant', 'user not found');
    }

    const now = Math.floor(Date.now() / 1000);
    const accessToken = await oidcTokenService.signAccessToken({
      sub: user.id,
      aud: clientId,
      scope: rotated.scope,
      client_id: clientId,
    });
    const idToken = await oidcTokenService.signIdToken({
      sub: user.id,
      aud: clientId,
      email: user.email,
      name: user.name ?? undefined,
      auth_time: now,
    });

    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    res.json({
      access_token: accessToken,
      id_token: idToken,
      token_type: 'Bearer',
      expires_in: oidcTokenService.getAccessTokenTtl(),
      refresh_token: rotated.token,
      scope: rotated.scope,
    });
  }

  // ──────────── UserInfo ────────────

  userinfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) {
        throw new OidcError('invalid_request', 'Bearer access_token is required');
      }
      const token = auth.slice('Bearer '.length).trim();

      let payload;
      try {
        payload = await oidcTokenService.verifyAccessToken(token);
      } catch {
        throw new OidcError('invalid_grant', 'invalid or expired access_token');
      }

      const sub = (payload.sub as string) || '';
      if (!sub) {
        throw new OidcError('invalid_grant', 'access_token missing sub');
      }

      const user = await userService.getUserById(sub);
      if (!user) {
        throw new OidcError('invalid_grant', 'user not found');
      }

      const scope = ((payload as any).scope as string) || 'openid';
      const responseJson: Record<string, any> = { sub: user.id };
      if (scope.includes('email')) {
        responseJson.email = user.email;
      }
      if (scope.includes('profile')) {
        if (user.name) responseJson.name = user.name;
        if (user.avatar) responseJson.picture = user.avatar;
      }

      res.set('Cache-Control', 'no-store');
      res.json(responseJson);
    } catch (err) {
      this.sendOidcError(res, err);
    }
  };

  // ──────────── Logout ────────────

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const refreshToken =
        (req.body?.refresh_token as string | undefined) ||
        (req.query?.refresh_token as string | undefined);

      if (!refreshToken) {
        // logout 不强制要求 refresh_token；前端可能只清本地态
        res.json({ ok: true });
        return;
      }

      await oidcService.revokeRefreshToken(refreshToken);
      res.json({ ok: true });
    } catch (err) {
      this.sendOidcError(res, err);
    }
  };

  // ──────────── 工具 ────────────

  private parseAuthorizeParams(req: Request):
    | {
        client_id: string;
        redirect_uri: string;
        scope: string;
        state: string;
        code_challenge: string;
        code_challenge_method: 'S256' | 'plain';
        nonce?: string;
      }
    | OidcError {
    const q = req.query as Record<string, string>;
    const { response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method, nonce } = q;

    if (response_type !== 'code') {
      return new OidcError('invalid_request', "response_type must be 'code'");
    }
    if (!client_id) return new OidcError('invalid_request', 'client_id is required');
    if (!redirect_uri) return new OidcError('invalid_request', 'redirect_uri is required');
    if (!code_challenge) return new OidcError('invalid_request', 'code_challenge is required (PKCE)');
    if (!code_challenge_method) {
      return new OidcError('invalid_request', 'code_challenge_method is required');
    }
    if (code_challenge_method !== 'S256' && code_challenge_method !== 'plain') {
      return new OidcError('invalid_request', 'code_challenge_method must be S256 or plain');
    }

    return {
      client_id,
      redirect_uri,
      scope: scope || 'openid',
      state: state || '',
      code_challenge,
      code_challenge_method: code_challenge_method as 'S256' | 'plain',
      nonce,
    };
  }

  private renderLoginForm(opts: {
    action: string;
    hidden: Record<string, string | undefined>;
    error?: string;
  }): string {
    const hiddenFields = Object.entries(opts.hidden)
      .filter(([_, v]) => v != null && v !== '')
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${this.escapeHtml(v as string)}" />`)
      .join('\n      ');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>ProClaw 登录（开发模式）</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 360px; margin: 64px auto; padding: 24px; }
    h1 { font-size: 20px; margin: 0 0 16px; }
    label { display: block; margin: 12px 0 4px; font-size: 13px; color: #555; }
    input[type=email], input[type=password] { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
    button { margin-top: 16px; padding: 10px 16px; background: #2D7FF9; color: #fff; border: 0; border-radius: 4px; cursor: pointer; width: 100%; }
    .error { color: #c0392b; margin: 8px 0; font-size: 13px; }
    .hint { color: #999; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <h1>ProClaw 登录</h1>
  ${opts.error ? `<p class="error">${this.escapeHtml(opts.error)}</p>` : ''}
  <form method="POST" action="${opts.action}">
      ${hiddenFields}
    <label for="email">邮箱</label>
    <input type="email" id="email" name="email" required autofocus />
    <label for="password">密码</label>
    <input type="password" id="password" name="password" required />
    <button type="submit">登录</button>
  </form>
  <p class="hint">Sprint 1 临时登录页 — Sprint 2 替换为 account-portal 白标 UI</p>
</body>
</html>`;
  }

  private renderLoginError(res: Response, body: any, errorMsg: string): void {
    res.status(401);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(
      this.renderLoginForm({
        action: '/oauth/authorize',
        hidden: {
          client_id: body?.client_id,
          redirect_uri: body?.redirect_uri,
          scope: body?.scope,
          state: body?.state,
          code_challenge: body?.code_challenge,
          code_challenge_method: body?.code_challenge_method,
          nonce: body?.nonce,
        },
        error: errorMsg,
      }),
    );
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private sendOidcError(res: Response, err: unknown): void {
    if (err instanceof OidcError) {
      res.status(err.httpStatus).json(err.toJson());
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'server_error', error_description: message });
  }
}

export const oidcController = new OidcController();
