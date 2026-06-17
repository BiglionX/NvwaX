/**
 * Sprint 2.2.2 — Mock 验证：nvwax-server user-auth.middleware 接受 OIDC RS256 token
 *
 * 流程：
 *   1. 启动 mini Express（不连 DB / Redis）
 *   2. oidcTokenService.initialize()（自动生成 dev RSA 密钥对）
 *   3. 签一个 access_token（sub=mock-user-001, client_id=proclaw-web）
 *   4. 用 userAuthMiddleware 保护 /api/test-me
 *   5. fetch /api/test-me 带 Authorization: Bearer <oidc-token>
 *   6. 断言 200 + userId=mock-user-001
 *
 * 跑法：cd packages/nvwax-server && pnpm tsx scripts/test-oidc-rp-auth.ts
 */

// ── env 设置必须在 import 之前（ESM top-level 限制） ──
// 用 dynamic import 让 userService 顶层执行时已经看到 JWT_SECRET
process.env.NODE_ENV = 'development';
// 32 bytes mock secrets —— user.service.ts 构造函数强制校验
process.env.JWT_SECRET = process.env.JWT_SECRET || 'mock-jwt-secret-for-rp-auth-test-only-32bytes';
process.env.CROSS_AUTH_SECRET = process.env.CROSS_AUTH_SECRET || 'mock-cross-auth-secret-for-rp-auth-test-only-32bytes';
process.env.OIDC_ISSUER = 'http://localhost:3999';
// 不设 OIDC_PRIVATE_KEY_PATH → initialize() 会自动生成到 data/oidc-dev-keys/

async function main(): Promise<void> {
  const [
    { default: express },
    expressTypes,
    { oidcTokenService },
    { userAuthMiddleware },
  ] = await Promise.all([
    import('express'),
    import('express') as any, // 占位
    import('../src/services/oidc/oidc-token.service.js'),
    import('../src/middleware/user-auth.middleware.js'),
  ]);
  type Request = expressTypes.Request;
  type Response = expressTypes.Response;

  console.log('▶ Initializing OIDC token service (dev auto-generates RSA keypair)...');
  await oidcTokenService.initialize();
  console.log('  ✓ RSA keypair ready');

  const MOCK_USER_ID = 'mock-user-001';
  const MOCK_CLIENT_ID = 'proclaw-web';

  // 签一个 access_token（模拟 OIDC IdP 颁发）
  const accessToken = await oidcTokenService.signAccessToken({
    sub: MOCK_USER_ID,
    aud: MOCK_CLIENT_ID,
    scope: 'openid profile email',
    client_id: MOCK_CLIENT_ID,
  });
  console.log('  ✓ Signed access_token (first 60 chars):', accessToken.slice(0, 60) + '...');

  // 启 mini Express
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  // 受 user-auth.middleware 保护的端点
  app.get('/api/test-me', userAuthMiddleware, (req: Request, res: Response) => {
    res.json({
      userId: req.user?.id,
      email: req.user?.email,
      authed: true,
    });
  });

  // 不带 token 时 401
  app.get('/api/should-401', userAuthMiddleware, (_req: Request, res: Response) => {
    res.json({ unexpected: true });
  });

  const PORT = 3999;
  const server = app.listen(PORT, async () => {
    console.log(`\n▶ Test server listening on http://localhost:${PORT}`);

    let failed = 0;
    let passed = 0;

    // ── Test 1: 无 token → 401 ──
    {
      const res = await fetch(`http://localhost:${PORT}/api/should-401`);
      if (res.status === 401) {
        console.log('  ✓ Test 1 PASS: no token → 401');
        passed++;
      } else {
        console.error(`  ✗ Test 1 FAIL: no token expected 401, got ${res.status}`);
        failed++;
      }
    }

    // ── Test 2: OIDC token → 200 + userId=mock-user-001 ──
    {
      const res = await fetch(`http://localhost:${PORT}/api/test-me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = (await res.json()) as { userId?: string; email?: string; authed?: boolean };
      if (res.status === 200 && body.userId === MOCK_USER_ID && body.authed === true) {
        console.log(`  ✓ Test 2 PASS: OIDC token → 200, userId=${body.userId}, email="${body.email}"`);
        passed++;
      } else {
        console.error(`  ✗ Test 2 FAIL: expected 200 + userId=${MOCK_USER_ID}, got ${res.status}`, body);
        failed++;
      }
    }

    // ── Test 3: 乱码 token → 401 ──
    {
      const res = await fetch(`http://localhost:${PORT}/api/test-me`, {
        headers: { Authorization: 'Bearer not.a.valid.jwt' },
      });
      if (res.status === 401) {
        console.log('  ✓ Test 3 PASS: invalid token → 401');
        passed++;
      } else {
        console.error(`  ✗ Test 3 FAIL: invalid token expected 401, got ${res.status}`);
        failed++;
      }
    }

    // ── Test 4: HS256 fallback (业务老 token) → 200 ──
    {
      // signToken 不存在；generateToken 是 private；直接用 jsonwebtoken 模拟老 token
      const jwt = (await import('jsonwebtoken')).default;
      const hsToken = jwt.sign(
        { userId: 'legacy-user-001', email: 'legacy@example.com' },
        process.env.JWT_SECRET as string,
        { expiresIn: '1h' },
      );
      const res = await fetch(`http://localhost:${PORT}/api/test-me`, {
        headers: { Authorization: `Bearer ${hsToken}` },
      });
      const body = (await res.json()) as { userId?: string; email?: string };
      if (res.status === 200 && body.userId === 'legacy-user-001') {
        console.log(`  ✓ Test 4 PASS: HS256 fallback token → 200, userId=${body.userId}`);
        passed++;
      } else {
        console.error(`  ✗ Test 4 FAIL: HS256 fallback expected 200 + userId=legacy-user-001, got ${res.status}`, body);
        failed++;
      }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Result: ${passed} passed, ${failed} failed`);

    server.close(() => {
      process.exit(failed === 0 ? 0 : 1);
    });
  });
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
