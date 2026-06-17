/**
 * OIDC 回调路由（Sprint 2.2）
 *
 * - 顶级路径 /oauth/callback（不挂 /[locale] 前缀，与 IdP 注册的 redirect_uri 完全一致）
 * - 接收 IdP 302 回来的 ?code=&state=&return_to=&error=&error_description=
 * - 调 handleOidcCallback 完成 token exchange + session 持久化
 * - 跳回 returnTo（成功）或 /login?error=...（失败）
 */

import type { Metadata } from 'next';
import CallbackClient from './CallbackClient';

export const metadata: Metadata = {
  title: '正在完成登录…',
  description: '正在通过 ProClaw 账户完成登录',
  robots: { index: false, follow: false },
};

export default function OidcCallbackPage() {
  return <CallbackClient />;
}
