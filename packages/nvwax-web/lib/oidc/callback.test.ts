/**
 * OIDC 回调处理单测（Sprint 2.2）
 *
 * 覆盖：
 * - error 分支
 * - 缺 code/state 抛 invalid_request
 * - 无 pending PKCE 抛 invalid_request
 * - state 不匹配抛 invalid_request
 * - 正常路径：exchangeCodeForTokens → fetchUserInfo → POST /api/auth/session
 * - exchangeCodeForTokens 抛 OidcClientError / 非 OidcClientError
 * - fetchUserInfo 抛错
 * - session POST 500 转 server_error
 * - returnTo 优先级（params.returnTo > pending.returnTo > '/'）+ 不安全回退 '/'
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleOidcCallback } from './callback';
import { clearMetadataCache } from './client';
import { PKCE_STORAGE_KEY } from './login';

// 让 callback.ts 内部模块用同一份 sessionStorage
function setPending(state: string, returnTo: string) {
  sessionStorage.setItem(
    PKCE_STORAGE_KEY,
    JSON.stringify({
      codeVerifier: 'cv-1234567890',
      state,
      nonce: 'nc-1234567890',
      returnTo,
      createdAt: Date.now(),
    }),
  );
}

beforeEach(() => {
  sessionStorage.clear();
  clearMetadataCache();
  // happy-dom 默认 fetch 没实现，需要 mock
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('OIDC callback: error / invalid_request 分支', () => {
  it('params.error = "access_denied" → ok:false + error:"access_denied"', async () => {
    const r = await handleOidcCallback({
      code: '',
      state: '',
      error: 'access_denied',
      errorDescription: 'user denied',
    });
    expect(r).toEqual({
      ok: false,
      returnTo: '/login',
      error: 'access_denied',
      errorDescription: 'user denied',
    });
  });

  it('缺 code 抛 invalid_request', async () => {
    const r = await handleOidcCallback({ code: '', state: 's' });
    expect(r).toMatchObject({ ok: false, error: 'invalid_request' });
  });

  it('缺 state 抛 invalid_request', async () => {
    const r = await handleOidcCallback({ code: 'c', state: '' });
    expect(r).toMatchObject({ ok: false, error: 'invalid_request' });
  });

  it('无 pending PKCE → invalid_request + "no pending PKCE state"', async () => {
    const r = await handleOidcCallback({ code: 'c', state: 's' });
    expect(r).toMatchObject({ ok: false, error: 'invalid_request' });
    expect(r.errorDescription).toMatch(/no pending PKCE state/);
  });

  it('state 不匹配 → invalid_request + "state mismatch"', async () => {
    setPending('correct-state', '/');
    const r = await handleOidcCallback({ code: 'c', state: 'wrong-state' });
    expect(r).toMatchObject({ ok: false, error: 'invalid_request' });
    expect(r.errorDescription).toMatch(/state mismatch/);
  });
});

describe('OIDC callback: 正常路径', () => {
  it('exchangeCodeForTokens 200 + fetchUserInfo 200 + session POST 200 → ok:true', async () => {
    setPending('st', '/dashboard');
    const fetchMock = vi
      .fn()
      // exchangeCodeForTokens 内：先 discoverMetadata
      .mockResolvedValueOnce(
        jsonResponse({
          issuer: 'https://idp.test',
          authorization_endpoint: 'https://idp.test/oauth/authorize',
          token_endpoint: 'https://idp.test/oauth/token',
          userinfo_endpoint: 'https://idp.test/oauth/userinfo',
          jwks_uri: 'https://idp.test/.well-known/jwks.json',
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['none'],
          scopes_supported: ['openid'],
          claims_supported: ['sub'],
          code_challenge_methods_supported: ['S256'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
        }),
      )
      // exchangeCodeForTokens token
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'at',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'rt',
          id_token: 'it',
        }),
      )
      // fetchUserInfo
      .mockResolvedValueOnce(jsonResponse({ sub: 'u-1', email: 'u@test' }))
      // POST /api/auth/session
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    const r = await handleOidcCallback({ code: 'c', state: 'st' });
    expect(r).toEqual({ ok: true, returnTo: '/dashboard' });
  });
});

describe('OIDC callback: 错误处理', () => {
  it('exchangeCodeForTokens 抛 OidcClientError → result 含 error', async () => {
    setPending('st', '/');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          issuer: 'https://idp.test',
          authorization_endpoint: 'https://idp.test/oauth/authorize',
          token_endpoint: 'https://idp.test/oauth/token',
          userinfo_endpoint: 'https://idp.test/oauth/userinfo',
          jwks_uri: 'https://idp.test/.well-known/jwks.json',
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['none'],
          scopes_supported: ['openid'],
          claims_supported: ['sub'],
          code_challenge_methods_supported: ['S256'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { error: 'invalid_grant', error_description: 'expired' },
          { status: 400, statusText: 'Bad Request' },
        ),
      );
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    const r = await handleOidcCallback({ code: 'c', state: 'st' });
    expect(r).toMatchObject({ ok: false, error: 'invalid_grant' });
    expect(r.errorDescription).toMatch(/expired/);
  });

  it('exchangeCodeForTokens 抛非 OidcClientError → error: "server_error"', async () => {
    setPending('st', '/');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          issuer: 'https://idp.test',
          authorization_endpoint: 'https://idp.test/oauth/authorize',
          token_endpoint: 'https://idp.test/oauth/token',
          userinfo_endpoint: 'https://idp.test/oauth/userinfo',
          jwks_uri: 'https://idp.test/.well-known/jwks.json',
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['none'],
          scopes_supported: ['openid'],
          claims_supported: ['sub'],
          code_challenge_methods_supported: ['S256'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
        }),
      )
      .mockRejectedValueOnce(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    const r = await handleOidcCallback({ code: 'c', state: 'st' });
    expect(r).toMatchObject({ ok: false, error: 'server_error' });
    expect(r.errorDescription).toMatch(/network down/);
  });

  it('fetchUserInfo 抛 → 走 errorResultFromException', async () => {
    setPending('st', '/');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          issuer: 'https://idp.test',
          authorization_endpoint: 'https://idp.test/oauth/authorize',
          token_endpoint: 'https://idp.test/oauth/token',
          userinfo_endpoint: 'https://idp.test/oauth/userinfo',
          jwks_uri: 'https://idp.test/.well-known/jwks.json',
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['none'],
          scopes_supported: ['openid'],
          claims_supported: ['sub'],
          code_challenge_methods_supported: ['S256'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ access_token: 'at', token_type: 'Bearer', expires_in: 60 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: 'invalid_token' }, { status: 401, statusText: 'Unauthorized' }),
      );
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    const r = await handleOidcCallback({ code: 'c', state: 'st' });
    expect(r).toMatchObject({ ok: false, error: 'invalid_token' });
  });

  it('POST /api/auth/session 500 → error: "server_error"', async () => {
    setPending('st', '/');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          issuer: 'https://idp.test',
          authorization_endpoint: 'https://idp.test/oauth/authorize',
          token_endpoint: 'https://idp.test/oauth/token',
          userinfo_endpoint: 'https://idp.test/oauth/userinfo',
          jwks_uri: 'https://idp.test/.well-known/jwks.json',
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['none'],
          scopes_supported: ['openid'],
          claims_supported: ['sub'],
          code_challenge_methods_supported: ['S256'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ access_token: 'at', token_type: 'Bearer', expires_in: 60 }),
      )
      .mockResolvedValueOnce(jsonResponse({ sub: 'u-1' }))
      .mockResolvedValueOnce(new Response('fail', { status: 500, statusText: 'Server Error' }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    const r = await handleOidcCallback({ code: 'c', state: 'st' });
    expect(r).toMatchObject({ ok: false, error: 'server_error' });
    expect(r.errorDescription).toMatch(/500/);
  });
});

describe('OIDC callback: returnTo 优先级', () => {
  async function setupFetchOk() {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          issuer: 'https://idp.test',
          authorization_endpoint: 'https://idp.test/oauth/authorize',
          token_endpoint: 'https://idp.test/oauth/token',
          userinfo_endpoint: 'https://idp.test/oauth/userinfo',
          jwks_uri: 'https://idp.test/.well-known/jwks.json',
          response_types_supported: ['code'],
          subject_types_supported: ['public'],
          id_token_signing_alg_values_supported: ['RS256'],
          token_endpoint_auth_methods_supported: ['none'],
          scopes_supported: ['openid'],
          claims_supported: ['sub'],
          code_challenge_methods_supported: ['S256'],
          grant_types_supported: ['authorization_code', 'refresh_token'],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ access_token: 'at', token_type: 'Bearer', expires_in: 60 }),
      )
      .mockResolvedValueOnce(jsonResponse({ sub: 'u-1' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    return fetchMock;
  }

  it('params.returnTo 优先于 pending.returnTo', async () => {
    setPending('st', '/pending');
    await setupFetchOk();
    const r = await handleOidcCallback({ code: 'c', state: 'st', returnTo: '/explicit' });
    expect(r).toMatchObject({ ok: true, returnTo: '/explicit' });
  });

  it('无 params.returnTo 时回退到 pending.returnTo', async () => {
    setPending('st', '/pending');
    await setupFetchOk();
    const r = await handleOidcCallback({ code: 'c', state: 'st' });
    expect(r).toMatchObject({ ok: true, returnTo: '/pending' });
  });

  it('params.returnTo 与 pending 都不存在时回退 "/"', async () => {
    setPending('st', '/');
    await setupFetchOk();
    const r = await handleOidcCallback({ code: 'c', state: 'st' });
    expect(r).toMatchObject({ ok: true, returnTo: '/' });
  });

  it('params.returnTo 不安全时回退到 "/"（覆盖 pending.returnTo）', async () => {
    setPending('st', '/dashboard');
    await setupFetchOk();
    const r = await handleOidcCallback({ code: 'c', state: 'st', returnTo: '//evil.com' });
    // params.returnTo='//evil.com' 优先但被判为不安全 → 整段 rawReturn 退回 '/'
    expect(r).toMatchObject({ ok: true, returnTo: '/' });
  });

  it('params.returnTo 不安全且 pending.returnTo 不安全时回退 "/"', async () => {
    setPending('st', '//evil-pending');
    await setupFetchOk();
    const r = await handleOidcCallback({ code: 'c', state: 'st', returnTo: 'http://evil.com' });
    expect(r).toMatchObject({ ok: true, returnTo: '/' });
  });
});
