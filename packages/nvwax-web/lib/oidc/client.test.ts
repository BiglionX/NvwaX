/**
 * OIDC Client 单测（Sprint 2.2）
 *
 * 覆盖：
 * - loadOidcConfig：env 缺失抛错 / scope 默认 / postLogoutRedirectUri 回退
 * - discoverMetadata：缓存命中 / 跨 issuer 不复用 / 错误处理
 * - buildAuthorizationUrl：8 个 query 参数 + returnTo 编码 + 自定义 method
 * - exchangeCodeForTokens：body 不含 client_secret / 4xx 转 OidcClientError
 * - refreshTokens：body 含 grant_type=refresh_token
 * - fetchUserInfo：Bearer 头 / 401 抛错
 * - revokeRefreshToken：未传 token body 不含 / 失败仅 warn
 * - buildEndSessionUrl：id_token_hint + post_logout_redirect_uri
 * - OidcClientError：error / httpStatus / name
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadOidcConfig,
  discoverMetadata,
  clearMetadataCache,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshTokens,
  fetchUserInfo,
  revokeRefreshToken,
  buildEndSessionUrl,
  OidcClientError,
} from './client';
import type { OidcDiscovery } from './types';

const DISCOVERY: OidcDiscovery = {
  issuer: 'https://idp.test',
  authorization_endpoint: 'https://idp.test/oauth/authorize',
  token_endpoint: 'https://idp.test/oauth/token',
  userinfo_endpoint: 'https://idp.test/oauth/userinfo',
  jwks_uri: 'https://idp.test/.well-known/jwks.json',
  end_session_endpoint: 'https://idp.test/oauth/logout',
  response_types_supported: ['code'],
  subject_types_supported: ['public'],
  id_token_signing_alg_values_supported: ['RS256'],
  token_endpoint_auth_methods_supported: ['none'],
  scopes_supported: ['openid', 'profile', 'email'],
  claims_supported: ['sub', 'email', 'name'],
  code_challenge_methods_supported: ['S256'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
};

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

beforeEach(() => {
  clearMetadataCache();
  process.env.NEXT_PUBLIC_OIDC_ISSUER = 'https://idp.test';
  process.env.NEXT_PUBLIC_OIDC_CLIENT_ID = 'nvwax-web';
  process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI = 'https://app.test/oauth/callback';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://app.test';
  delete process.env.NEXT_PUBLIC_OIDC_SCOPE;
  delete process.env.NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OIDC Client: loadOidcConfig', () => {
  it('NEXT_PUBLIC_OIDC_ISSUER 缺失抛错', () => {
    delete process.env.NEXT_PUBLIC_OIDC_ISSUER;
    expect(() => loadOidcConfig()).toThrow(/NEXT_PUBLIC_OIDC_ISSUER is not set/);
  });

  it('NEXT_PUBLIC_OIDC_CLIENT_ID 缺失抛错', () => {
    delete process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
    expect(() => loadOidcConfig()).toThrow(/NEXT_PUBLIC_OIDC_CLIENT_ID is not set/);
  });

  it('NEXT_PUBLIC_OIDC_REDIRECT_URI 缺失抛错', () => {
    delete process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI;
    expect(() => loadOidcConfig()).toThrow(/NEXT_PUBLIC_OIDC_REDIRECT_URI is not set/);
  });

  it('scope 默认为 "openid profile email"', () => {
    const cfg = loadOidcConfig();
    expect(cfg.scope).toBe('openid profile email');
  });

  it('NEXT_PUBLIC_OIDC_SCOPE 显式设置时使用设置值', () => {
    process.env.NEXT_PUBLIC_OIDC_SCOPE = 'openid';
    const cfg = loadOidcConfig();
    expect(cfg.scope).toBe('openid');
  });

  it('OIDC_POST_LOGOUT_REDIRECT_URI 回退到 NEXT_PUBLIC_SITE_URL', () => {
    const cfg = loadOidcConfig();
    expect(cfg.postLogoutRedirectUri).toBe('https://app.test');
  });

  it('NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI 优先', () => {
    process.env.NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI = 'https://app.test/goodbye';
    const cfg = loadOidcConfig();
    expect(cfg.postLogoutRedirectUri).toBe('https://app.test/goodbye');
  });

  it('issuer 尾部 "/" 被剥除', () => {
    process.env.NEXT_PUBLIC_OIDC_ISSUER = 'https://idp.test/';
    const cfg = loadOidcConfig();
    expect(cfg.issuer).toBe('https://idp.test');
  });
});

describe('OIDC Client: discoverMetadata', () => {
  it('拉取并返回 discovery 文档', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(DISCOVERY));
    const meta = await discoverMetadata(undefined, fetchMock as unknown as typeof fetch);
    expect(meta).toEqual(DISCOVERY);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://idp.test/.well-known/openid-configuration',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('第二次调用命中缓存（不再发 fetch）', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(DISCOVERY));
    await discoverMetadata(undefined, fetchMock as unknown as typeof fetch);
    await discoverMetadata(undefined, fetchMock as unknown as typeof fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('跨 issuer 不复用缓存', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(DISCOVERY));
    await discoverMetadata('https://idp.test', fetchMock as unknown as typeof fetch);
    await discoverMetadata('https://other.test', fetchMock as unknown as typeof fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('res.ok=false 转 OidcClientError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('Internal Server Error', { status: 500, statusText: 'Server Error' }),
    );
    await expect(discoverMetadata(undefined, fetchMock as unknown as typeof fetch)).rejects.toBeInstanceOf(
      OidcClientError,
    );
  });

  it('缺任一必需端点抛错', async () => {
    const incomplete: Partial<OidcDiscovery> = { ...DISCOVERY };
    delete incomplete.token_endpoint;
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(incomplete));
    await expect(discoverMetadata(undefined, fetchMock as unknown as typeof fetch)).rejects.toThrow(
      /missing required endpoint: token_endpoint/,
    );
  });

  it('clearMetadataCache 强制刷新', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(DISCOVERY));
    await discoverMetadata(undefined, fetchMock as unknown as typeof fetch);
    clearMetadataCache();
    await discoverMetadata(undefined, fetchMock as unknown as typeof fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('OIDC Client: buildAuthorizationUrl', () => {
  it('8 个 query 参数齐全', () => {
    const url = buildAuthorizationUrl({
      state: 'st',
      nonce: 'nc',
      codeChallenge: 'cc',
    });
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://idp.test/oauth/authorize');
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('state')).toBe('st');
    expect(u.searchParams.get('nonce')).toBe('nc');
    expect(u.searchParams.get('code_challenge')).toBe('cc');
    expect(u.searchParams.get('client_id')).toBe('nvwax-web');
    expect(u.searchParams.get('redirect_uri')).toBe('https://app.test/oauth/callback');
    expect(u.searchParams.get('scope')).toBe('openid profile email');
  });

  it('returnTo 被 encodeURIComponent 写入 return_to', () => {
    const url = buildAuthorizationUrl({
      state: 'st',
      nonce: 'nc',
      codeChallenge: 'cc',
      returnTo: '/dashboard?x=1',
    });
    const u = new URL(url);
    expect(u.searchParams.get('return_to')).toBe('%2Fdashboard%3Fx%3D1');
  });

  it('自定义 codeChallengeMethod 覆盖默认值', () => {
    const url = buildAuthorizationUrl({
      state: 'st',
      nonce: 'nc',
      codeChallenge: 'cc',
      codeChallengeMethod: 'S256',
    });
    const u = new URL(url);
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('自定义 scope 覆盖配置', () => {
    const url = buildAuthorizationUrl({
      state: 'st',
      nonce: 'nc',
      codeChallenge: 'cc',
      scope: 'openid',
    });
    const u = new URL(url);
    expect(u.searchParams.get('scope')).toBe('openid');
  });
});

describe('OIDC Client: exchangeCodeForTokens', () => {
  it('200 正常返回 tokens', async () => {
    const tokens = {
      access_token: 'at',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'rt',
      id_token: 'it',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockResolvedValueOnce(jsonResponse(tokens));
    const result = await exchangeCodeForTokens(
      { code: 'c', codeVerifier: 'v' },
      fetchMock as unknown as typeof fetch,
    );
    expect(result).toEqual(tokens);
  });

  it('body 不含 client_secret（public client）', async () => {
    let capturedBody = '';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockImplementationOnce(async (_url, init) => {
        capturedBody = String((init as RequestInit).body);
        return jsonResponse({ access_token: 'at', token_type: 'Bearer', expires_in: 60 });
      });
    await exchangeCodeForTokens(
      { code: 'c', codeVerifier: 'v' },
      fetchMock as unknown as typeof fetch,
    );
    expect(capturedBody).not.toContain('client_secret');
    expect(capturedBody).toContain('grant_type=authorization_code');
    expect(capturedBody).toContain('code=c');
    expect(capturedBody).toContain('code_verifier=v');
  });

  it('4xx 转 OidcClientError 含 error + httpStatus', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockResolvedValueOnce(
        jsonResponse(
          { error: 'invalid_grant', error_description: 'code expired' },
          { status: 400, statusText: 'Bad Request' },
        ),
      );
    await expect(
      exchangeCodeForTokens({ code: 'c', codeVerifier: 'v' }, fetchMock as unknown as typeof fetch),
    ).rejects.toMatchObject({
      name: 'OidcClientError',
      error: 'invalid_grant',
      httpStatus: 400,
    });
  });

  it('200 但 body 无 access_token 抛错', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockResolvedValueOnce(jsonResponse({ token_type: 'Bearer' }));
    await expect(
      exchangeCodeForTokens({ code: 'c', codeVerifier: 'v' }, fetchMock as unknown as typeof fetch),
    ).rejects.toThrow(/missing access_token/);
  });
});

describe('OIDC Client: refreshTokens', () => {
  it('body 含 grant_type=refresh_token', async () => {
    let capturedBody = '';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockImplementationOnce(async (_url, init) => {
        capturedBody = String((init as RequestInit).body);
        return jsonResponse({ access_token: 'at2', token_type: 'Bearer', expires_in: 60 });
      });
    await refreshTokens('rt-123', fetchMock as unknown as typeof fetch);
    expect(capturedBody).toContain('grant_type=refresh_token');
    expect(capturedBody).toContain('refresh_token=rt-123');
  });

  it('200 正常返回新 tokens', async () => {
    const newTokens = { access_token: 'at2', token_type: 'Bearer', expires_in: 60, refresh_token: 'rt2' };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockResolvedValueOnce(jsonResponse(newTokens));
    const r = await refreshTokens('rt-123', fetchMock as unknown as typeof fetch);
    expect(r).toEqual(newTokens);
  });
});

describe('OIDC Client: fetchUserInfo', () => {
  it('请求带 Authorization: Bearer', async () => {
    let capturedAuth = '';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockImplementationOnce(async (_url, init) => {
        const headers = (init as RequestInit).headers as Record<string, string> | undefined;
        capturedAuth = String(headers?.['Authorization'] ?? '');
        return jsonResponse({ sub: 'u-1', email: 'u@test' });
      });
    const u = await fetchUserInfo('access-token-1', fetchMock as unknown as typeof fetch);
    expect(capturedAuth).toBe('Bearer access-token-1');
    expect(u.sub).toBe('u-1');
  });

  it('401 转 OidcClientError', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockResolvedValueOnce(
        jsonResponse({ error: 'invalid_token' }, { status: 401, statusText: 'Unauthorized' }),
      );
    await expect(
      fetchUserInfo('bad-token', fetchMock as unknown as typeof fetch),
    ).rejects.toMatchObject({ name: 'OidcClientError', httpStatus: 401 });
  });
});

describe('OIDC Client: revokeRefreshToken', () => {
  it('未传 token 时 body 不含 refresh_token 字段', async () => {
    let capturedBody = '';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockImplementationOnce(async (_url, init) => {
        capturedBody = String((init as RequestInit).body);
        return new Response(null, { status: 200 });
      });
    await revokeRefreshToken(undefined, fetchMock as unknown as typeof fetch);
    expect(capturedBody).not.toContain('refresh_token');
  });

  it('传 token 时 body 含 refresh_token 字段', async () => {
    let capturedBody = '';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockImplementationOnce(async (_url, init) => {
        capturedBody = String((init as RequestInit).body);
        return new Response(null, { status: 200 });
      });
    await revokeRefreshToken('rt-xyz', fetchMock as unknown as typeof fetch);
    expect(capturedBody).toContain('refresh_token=rt-xyz');
  });

  it('失败仅 console.warn 不抛错', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockResolvedValueOnce(new Response('oops', { status: 500, statusText: 'Server Error' }));
    await expect(
      revokeRefreshToken('rt', fetchMock as unknown as typeof fetch),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('优先使用 end_session_endpoint', async () => {
    let calledUrl = '';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(DISCOVERY))
      .mockImplementationOnce(async (url) => {
        calledUrl = String(url);
        return new Response(null, { status: 200 });
      });
    await revokeRefreshToken('rt', fetchMock as unknown as typeof fetch);
    expect(calledUrl).toBe('https://idp.test/oauth/logout');
  });

  it('discovery 无 end_session_endpoint 时回退 ${issuer}/oauth/logout', async () => {
    const { end_session_endpoint, ...metaNoLogout } = DISCOVERY;
    void end_session_endpoint;
    let calledUrl = '';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(metaNoLogout))
      .mockImplementationOnce(async (url) => {
        calledUrl = String(url);
        return new Response(null, { status: 200 });
      });
    await revokeRefreshToken('rt', fetchMock as unknown as typeof fetch);
    expect(calledUrl).toBe('https://idp.test/oauth/logout');
  });
});

describe('OIDC Client: buildEndSessionUrl', () => {
  it('含 id_token_hint + post_logout_redirect_uri', () => {
    const url = buildEndSessionUrl('id-token-hint-1');
    const u = new URL(url);
    expect(u.searchParams.get('id_token_hint')).toBe('id-token-hint-1');
    expect(u.searchParams.get('post_logout_redirect_uri')).toBe('https://app.test');
  });

  it('未传 idToken 时不写入 id_token_hint', () => {
    const url = buildEndSessionUrl();
    const u = new URL(url);
    expect(u.searchParams.has('id_token_hint')).toBe(false);
  });
});

describe('OIDC Client: OidcClientError', () => {
  it('字段 error / httpStatus / name 正确', () => {
    const e = new OidcClientError('invalid_request', 'oops', 400);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('OidcClientError');
    expect(e.error).toBe('invalid_request');
    expect(e.httpStatus).toBe(400);
    expect(e.message).toBe('oops');
  });

  it('无 httpStatus 时为 undefined', () => {
    const e = new OidcClientError('server_error', 'oops');
    expect(e.httpStatus).toBeUndefined();
  });
});
