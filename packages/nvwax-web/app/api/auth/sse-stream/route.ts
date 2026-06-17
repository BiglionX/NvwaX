/**
 * SSE Stream Proxy（Sprint 2.3）
 *
 * 解决 EventSource 不支持自定义 headers 的问题：
 * - 浏览器 EventSource 连接 → 本 Route（同源，cookie 自动携带）
 * - 本 Route 读 nvwax_oidc_session cookie → 解密 accessToken
 * - 以 Bearer token 连接上游 SSE → ReadableStream 透传回客户端
 *
 * GET /api/auth/sse-stream?sessionId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { decryptFromCookie } from '@/lib/oidc/cookie-crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'nvwax_oidc_session';
const UPSTREAM_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface SessionPayload {
  accessToken: string;
  expiresAt: number;
  userInfo: { sub: string; [key: string]: unknown };
}

async function readSession(req: NextRequest): Promise<SessionPayload | null> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const plain = await decryptFromCookie(cookie);
    return JSON.parse(plain) as SessionPayload;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  // 1. 鉴权
  const session = await readSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (Date.now() > session.expiresAt) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'access_token expired' },
      { status: 401 },
    );
  }

  // 2. 参数校验
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'sessionId is required (alphanumeric + _-)' },
      { status: 400 },
    );
  }

  // 3. 连接上游 SSE
  const upstreamUrl = `${UPSTREAM_BASE_URL}/aiteam-creation/sessions/${encodeURIComponent(sessionId)}/stream`;
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'text/event-stream',
      },
      cache: 'no-store',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'server_error', error_description: msg }, { status: 502 });
  }

  if (!upstreamRes.ok) {
    // 上游返回非 200，透传状态码和 body
    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
    });
  }

  // 4. 透传 SSE 流
  const respHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx 不缓冲 SSE
  });

  return new NextResponse(upstreamRes.body, {
    status: 200,
    headers: respHeaders,
  });
}

// 测试桥接
declare global {
  var __sseStreamTestHandler: typeof GET | undefined;
}
if (typeof process !== 'undefined' && process.env?.VITEST) {
  (globalThis as unknown as { __sseStreamTestHandler: typeof GET }).__sseStreamTestHandler = GET;
}
