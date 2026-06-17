/**
 * add-rp CLI（Sprint 2.9）
 *
 * 用法：
 *   pnpm --filter nvwax-server add-rp \
 *     --name "proclaw_desktop" \
 *     --redirect "http://127.0.0.1:7842/callback" \
 *     --redirect "http://127.0.0.1:3000/callback" \
 *     --scopes "openid profile email" \
 *     [--issuer "https://account.proclaw.cc"] \
 *     [--admin-user "..."] [--admin-password "..."]
 *
 * 流程：
 *   1. 解析 CLI 参数 + 环境变量 fallback
 *   2. POST /api/admin/login  → 拿 admin JWT
 *   3. POST /api/admin/oidc/clients 带 Bearer token
 *   4. **一次性**打印 client_id + client_secret 明文 + 警告
 *
 * 退出码：0=成功，1=参数/网络/API 错误
 */

import dotenv from 'dotenv';
dotenv.config();

// ──────────── CLI 参数解析（极简自实现，避免 commander/yargs 依赖）────────────

interface CliArgs {
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  issuer: string;
  adminUser?: string;
  adminPassword?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    name: '',
    redirect_uris: [],
    allowed_scopes: ['openid', 'profile', 'email'],
    issuer: process.env.NVWAX_ISSUER || process.env.OIDC_ISSUER || 'http://localhost:3001',
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    switch (a) {
      case '--name':
        if (!next) throw new Error('--name requires a value');
        args.name = next;
        i++;
        break;
      case '--redirect':
        if (!next) throw new Error('--redirect requires a value');
        args.redirect_uris.push(next);
        i++;
        break;
      case '--scopes':
        if (!next) throw new Error('--scopes requires a value');
        // 支持空格或逗号分隔（兼容 shell 转义差异）
        args.allowed_scopes = next.split(/[\s,]+/).filter(Boolean);
        i++;
        break;
      case '--issuer':
        if (!next) throw new Error('--issuer requires a value');
        args.issuer = next.replace(/\/+$/, ''); // 去尾斜杠
        i++;
        break;
      case '--admin-user':
        if (!next) throw new Error('--admin-user requires a value');
        args.adminUser = next;
        i++;
        break;
      case '--admin-password':
        if (!next) throw new Error('--admin-password requires a value');
        args.adminPassword = next;
        i++;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        // eslint-disable-next-line no-unreachable
        break;
      default:
        throw new Error(`unknown argument: ${a}`);
    }
  }

  // 凭据 fallback：CLI 参数 > 环境变量 > 交互提示（不实现，避免阻塞 CI）
  args.adminUser = args.adminUser || process.env.NVWAX_ADMIN_USER || process.env.ADMIN_USERNAME;
  args.adminPassword =
    args.adminPassword || process.env.NVWAX_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  return args;
}

function printUsage(): void {
  console.log(`add-rp — Register an OIDC Relying Party client (Sprint 2.9)

用法:
  pnpm --filter nvwax-server add-rp --name <NAME> [--redirect <URI>...] [--scopes "openid profile email"] [options]

必填:
  --name <NAME>             RP 名称（例如 "proclaw_desktop"）

可重复:
  --redirect <URI>          允许的回调 URI（至少 1 个；可多次）

可选:
  --scopes "<SPACE-SEPARATED>"   默认 "openid profile email"
  --issuer <URL>            IdP base URL（默认 http://localhost:3001）
  --admin-user <USER>       admin 用户名（fallback: \$NVWAX_ADMIN_USER / \$ADMIN_USERNAME）
  --admin-password <PASS>   admin 密码（fallback: \$NVWAX_ADMIN_PASSWORD / \$ADMIN_PASSWORD）

示例:
  add-rp --name "proclaw_web" \\
         --redirect "https://app.proclaw.cc/auth/callback" \\
         --redirect "http://localhost:3000/oauth/callback" \\
         --scopes "openid profile email"
`);
}

// ──────────── API 调用 ────────────

interface AdminLoginResponse {
  data?: {
    token?: string;
    admin?: { id?: string; email?: string };
  };
}

interface AdminLoginResult {
  token: string;
  adminId?: string;
}

async function adminLogin(issuer: string, username: string, password: string): Promise<AdminLoginResult> {
  const url = `${issuer}/api/admin/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  let body: AdminLoginResponse | null = null;
  try {
    body = (await res.json()) as AdminLoginResponse;
  } catch {
    // 忽略 JSON 解析错误，统一按 HTTP 状态处理
  }

  if (res.status !== 200 || !body?.data?.token) {
    const msg = body && (body as any).error || (body as any)?.message || `HTTP ${res.status}`;
    throw new Error(`admin login failed: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
  return { token: body.data.token, adminId: body.data.admin?.id };
}

interface RegisterRPResponse {
  success?: boolean;
  data?: {
    client_id?: string;
    client_secret?: string;
    name?: string;
    redirect_uris?: string[];
    allowed_scopes?: string[];
    allowed_grant_types?: string[];
    require_pkce?: boolean;
    token_endpoint_auth_method?: string;
    is_active?: boolean;
    created_at?: string;
  };
  warning?: string;
  error?: { code?: string; message?: string };
}

interface RegisterRPResult {
  client_id: string;
  client_secret: string;
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  allowed_grant_types: string[];
  require_pkce: boolean;
  token_endpoint_auth_method: string;
  is_active: boolean;
  created_at: string;
}

async function registerRP(
  issuer: string,
  token: string,
  input: {
    name: string;
    redirect_uris: string[];
    allowed_scopes: string[];
  },
): Promise<RegisterRPResult> {
  const url = `${issuer}/api/admin/oidc/clients`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  let body: RegisterRPResponse | null = null;
  try {
    body = (await res.json()) as RegisterRPResponse;
  } catch {
    // ignore
  }

  if (res.status !== 201 || !body?.success || !body?.data?.client_id || !body?.data?.client_secret) {
    const errMsg =
      body?.error?.message ||
      (body as any)?.message ||
      `HTTP ${res.status}`;
    const errCode = body?.error?.code || 'REGISTER_FAILED';
    throw new Error(`register RP failed (${errCode}): ${errMsg}`);
  }

  return {
    client_id: body.data.client_id,
    client_secret: body.data.client_secret,
    name: body.data.name || input.name,
    redirect_uris: body.data.redirect_uris || input.redirect_uris,
    allowed_scopes: body.data.allowed_scopes || input.allowed_scopes,
    allowed_grant_types: body.data.allowed_grant_types || [],
    require_pkce: body.data.require_pkce ?? true,
    token_endpoint_auth_method: body.data.token_endpoint_auth_method || 'client_secret_post',
    is_active: body.data.is_active ?? true,
    created_at: body.data.created_at || new Date().toISOString(),
  };
}

// ──────────── 入口 ────────────

async function main(): Promise<void> {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`✗ 参数错误: ${(err as Error).message}\n`);
    printUsage();
    process.exit(1);
    return; // 让 TS 满足控制流分析
  }

  // 必填校验
  if (!args.name) {
    console.error('✗ 缺少必填参数 --name\n');
    printUsage();
    process.exit(1);
    return;
  }
  if (args.redirect_uris.length === 0) {
    console.error('✗ 至少需要一个 --redirect\n');
    printUsage();
    process.exit(1);
    return;
  }
  if (!args.allowed_scopes.includes('openid')) {
    console.error("✗ --scopes 必须包含 'openid'");
    process.exit(1);
    return;
  }
  if (!args.adminUser || !args.adminPassword) {
    console.error(
      '✗ 缺少 admin 凭据：传 --admin-user / --admin-password，或设置环境变量 NVWAX_ADMIN_USER / NVWAX_ADMIN_PASSWORD',
    );
    process.exit(1);
    return;
  }

  console.log(`▶ add-rp: 准备在 ${args.issuer} 注册 RP "${args.name}"`);
  console.log(`  redirect_uris = ${JSON.stringify(args.redirect_uris)}`);
  console.log(`  allowed_scopes = ${JSON.stringify(args.allowed_scopes)}`);

  // 1. admin login
  let loginResult: AdminLoginResult;
  try {
    console.log('▶ Step 1/2: POST /api/admin/login ...');
    loginResult = await adminLogin(args.issuer, args.adminUser, args.adminPassword);
    console.log('  ✓ admin 登录成功');
  } catch (err) {
    console.error(`  ✗ ${(err as Error).message}`);
    process.exit(1);
    return;
  }

  // 2. register RP
  let rp: RegisterRPResult;
  try {
    console.log('▶ Step 2/2: POST /api/admin/oidc/clients ...');
    rp = await registerRP(args.issuer, loginResult.token, {
      name: args.name,
      redirect_uris: args.redirect_uris,
      allowed_scopes: args.allowed_scopes,
    });
  } catch (err) {
    console.error(`  ✗ ${(err as Error).message}`);
    process.exit(1);
    return;
  }

  // 3. **一次性**输出（注意：不要在这里打印 token / 日志，避免 secret 进入日志系统）
  const divider = '─'.repeat(72);
  console.log('');
  console.log(divider);
  console.log('✓ RP registered successfully');
  console.log(divider);
  console.log(`  client_id               = ${rp.client_id}`);
  console.log(`  client_secret           = ${rp.client_secret}`);
  console.log(`  name                    = ${rp.name}`);
  console.log(`  redirect_uris           = ${JSON.stringify(rp.redirect_uris)}`);
  console.log(`  allowed_scopes          = ${JSON.stringify(rp.allowed_scopes)}`);
  console.log(`  allowed_grant_types     = ${JSON.stringify(rp.allowed_grant_types)}`);
  console.log(`  require_pkce            = ${rp.require_pkce}`);
  console.log(`  token_endpoint_auth_meth= ${rp.token_endpoint_auth_method}`);
  console.log(`  is_active               = ${rp.is_active}`);
  console.log(`  created_at              = ${rp.created_at}`);
  console.log(divider);
  console.log('⚠  请立即保存 client_secret 到团队 vault / 1Password。');
  console.log('⚠  本脚本不再打印该值，下次查看需走 rotate-secret。');
  console.log(divider);
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});