/**
 * Sprint 2.2.1 Task 7 — dev 联调 quick smoke test
 * 直接打 nvwax-server 的 OIDC 端点（dev 已启动 port 3001）
 */
const ISSUER = 'http://localhost:3001';

async function main() {
  let failed = 0;

  // 1) Discovery
  {
    const res = await fetch(`${ISSUER}/.well-known/openid-configuration`);
    const body = await res.json();
    if (res.status === 200 && body.issuer === ISSUER) {
      console.log(`✓ discovery 200, issuer=${body.issuer}, auth=${body.authorization_endpoint}`);
    } else {
      console.error(`✗ discovery FAIL`, res.status, body);
      failed++;
    }
  }

  // 2) JWKS
  {
    const res = await fetch(`${ISSUER}/.well-known/jwks.json`);
    const body = await res.json();
    if (res.status === 200 && Array.isArray(body.keys) && body.keys.length > 0) {
      console.log(`✓ jwks 200, kid=${body.keys[0].kid}, alg=${body.keys[0].alg}`);
    } else {
      console.error(`✗ jwks FAIL`, res.status, body);
      failed++;
    }
  }

  // 3) Authorize GET (dev 应该返回 login form HTML)
  {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: 'proclaw-web',
      redirect_uri: 'http://localhost:3000/oauth/callback',
      scope: 'openid profile email',
      state: 'smoke-test-state-123',
      nonce: 'smoke-test-nonce-456',
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      code_challenge_method: 'S256',
    });
    const res = await fetch(`${ISSUER}/oauth/authorize?${params}`);
    const text = await res.text();
    const isHtml = text.startsWith('<!DOCTYPE html') || text.startsWith('<html');
    if (res.status === 200 && isHtml) {
      console.log(`✓ authorize GET 200, dev login form rendered (${text.length} bytes)`);
    } else {
      console.error(`✗ authorize FAIL`, res.status, text.slice(0, 200));
      failed++;
    }
  }

  console.log(`\n${failed === 0 ? '🎉' : '❌'} Smoke test: ${failed === 0 ? 'all passed' : failed + ' failed'}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});