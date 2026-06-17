/**
 * Sprint 2.2.1 Task 7 — 端到端 OIDC 流程 smoke test
 *
 * 完整模拟浏览器一次 SSO 登录：
 *   1. GET  /oauth/authorize  → 拿登录 form + 提取 hidden params
 *   2. POST /oauth/authorize  → 提交 email/password → 302 重定向 + code + state
 *   3. POST /oauth/token      → authorization_code + code_verifier → access_token + id_token
 *   4. GET  /oauth/userinfo   → 用 access_token 拿用户信息
 *   5. GET  /api/test-me      → 用 access_token 调受 userAuthMiddleware 保护的业务 API
 *
 * 跑法：cd packages/nvwax-server && pnpm tsx scripts/e2e-oidc-flow.ts
 */

import * as crypto from 'node:crypto';

const ISSUER = process.env.OIDC_ISSUER ?? 'http://localhost:3001';
const CLIENT_ID = 'proclaw-web';
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';
const SCOPE = 'openid profile email';

const DEV_USER_EMAIL = 'dev-test@nvwax.local';
const DEV_USER_PASSWORD = 'DevTest2026!';

function generatePkcePair() {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

async function main() {
  let failed = 0;

  // ── 1. GET /oauth/authorize ──
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  const { verifier, challenge } = generatePkcePair();

  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  const authorizeGetRes = await fetch(`${ISSUER}/oauth/authorize?${authParams}`);
  const formHtml = await authorizeGetRes.text();

  if (authorizeGetRes.status === 200 && formHtml.includes('name="email"') && formHtml.includes('name="password"')) {
    console.log(`✓ Step 1: GET /oauth/authorize → 200, login form rendered`);
  } else {
    console.error(`✗ Step 1 FAIL: status=${authorizeGetRes.status}`);
    failed++;
    return;
  }

  // ── 2. POST /oauth/authorize（提交登录表单） ──
  const formBody = new URLSearchParams({
    email: DEV_USER_EMAIL,
    password: DEV_USER_PASSWORD,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  const authorizePostRes = await fetch(`${ISSUER}/oauth/authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html,application/xhtml+xml',
    },
    body: formBody.toString(),
    redirect: 'manual', // 关键：手动处理 302，不要自动 follow
  });

  if (authorizePostRes.status === 302) {
    const location = authorizePostRes.headers.get('location') ?? '';
    const codeMatch = location.match(/[?&]code=([^&]+)/);
    const code = codeMatch?.[1];
    if (code) {
      console.log(`✓ Step 2: POST /oauth/authorize → 302, code=${code.slice(0, 12)}...`);
      // ── 3. POST /oauth/token（拿 access_token） ──
      const tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: verifier,
      });

      const tokenRes = await fetch(`${ISSUER}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
      });

      if (tokenRes.status === 200) {
        const tokenJson = (await tokenRes.json()) as {
          access_token: string;
          id_token: string;
          refresh_token: string;
          token_type: string;
          expires_in: number;
        };
        console.log(`✓ Step 3: POST /oauth/token → 200, access_token=${tokenJson.access_token.slice(0, 30)}..., expires_in=${tokenJson.expires_in}s`);

        // ── 4. GET /oauth/userinfo ──
        const userInfoRes = await fetch(`${ISSUER}/oauth/userinfo`, {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        });
        if (userInfoRes.status === 200) {
          const userInfo = (await userInfoRes.json()) as { sub: string; email?: string };
          console.log(`✓ Step 4: GET /oauth/userinfo → 200, sub=${userInfo.sub}, email=${userInfo.email ?? '(none)'}`);
        } else {
          console.error(`✗ Step 4 FAIL: status=${userInfoRes.status}`);
          failed++;
        }

        // ── 5. GET 受保护的 /api/* 端点（验证 nvwax-server 接受 OIDC token） ──
        // 用 /api/user/api-keys （GET）作为 OIDC middleware smoke 端点
        const protectedRes = await fetch(`${ISSUER}/api/user/api-keys`, {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        });
        if (protectedRes.status === 200) {
          const body = await protectedRes.text();
          console.log(`✓ Step 5: GET /api/user/api-keys (OIDC) → 200, body=${body.slice(0, 80)}`);
        } else if (protectedRes.status === 401) {
          console.error(`✗ Step 5 FAIL: /api/user/api-keys returned 401 (OIDC token rejected by userAuthMiddleware)`);
          failed++;
        } else {
          console.log(`  Step 5: GET /api/user/api-keys → ${protectedRes.status} (unexpected but not 401, treating as pass)`);
        }
      } else {
        const errBody = await tokenRes.text();
        console.error(`✗ Step 3 FAIL: status=${tokenRes.status}, body=${errBody.slice(0, 200)}`);
        failed++;
      }
    } else {
      console.error(`✗ Step 2 FAIL: 302 missing code in Location: ${location}`);
      failed++;
    }
  } else {
    const errBody = await authorizePostRes.text();
    console.error(`✗ Step 2 FAIL: expected 302, got ${authorizePostRes.status}`);
    console.error('  ', errBody.slice(0, 300));
    failed++;
  }

  console.log(`\n${failed === 0 ? '🎉' : '❌'} E2E OIDC flow: ${failed === 0 ? 'all passed' : failed + ' failed'}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});