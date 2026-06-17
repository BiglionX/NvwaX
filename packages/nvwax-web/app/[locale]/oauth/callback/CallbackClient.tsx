'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { handleOidcCallback } from '@/lib/oidc/callback';

/**
 * OIDC 回调客户端组件。
 * 挂载后立即读取 URL 参数并调 handleOidcCallback。
 */
export default function CallbackClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const code = searchParams.get('code') ?? '';
      const state = searchParams.get('state') ?? '';
      const returnTo = searchParams.get('return_to') ?? undefined;
      const error = searchParams.get('error') ?? undefined;
      const errorDescription = searchParams.get('error_description') ?? undefined;

      const result = await handleOidcCallback({
        code,
        state,
        returnTo,
        error,
        errorDescription,
      });

      if (cancelled) return;

      if (result.ok) {
        setStatus('success');
        // 用 hard navigate 触发 middleware 重新评估鉴权
        window.location.replace(result.returnTo);
      } else {
        setStatus('error');
        setErrorMsg(`${result.error}${result.errorDescription ? `: ${result.errorDescription}` : ''}`);
        // 3 秒后跳回 /login 携带错误码
        const loginUrl = `/login?error=${encodeURIComponent(result.error ?? 'server_error')}${
          result.errorDescription ? `&desc=${encodeURIComponent(result.errorDescription)}` : ''
        }`;
        setTimeout(() => {
          if (!cancelled) router.replace(loginUrl);
        }, 3000);
      }
    };

    run().catch((err) => {
      if (cancelled) return;
      setStatus('error');
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {status === 'processing' && (
        <>
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid #6D4AFF22',
              borderTopColor: '#6D4AFF',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: '#555', fontSize: 14 }}>正在完成登录…</p>
        </>
      )}
      {status === 'success' && <p style={{ color: '#22c55e' }}>登录成功，正在跳转…</p>}
      {status === 'error' && (
        <>
          <p style={{ color: '#dc2626', fontSize: 16, fontWeight: 600 }}>登录失败</p>
          <p style={{ color: '#666', fontSize: 13, maxWidth: 480 }}>{errorMsg}</p>
          <p style={{ color: '#999', fontSize: 12 }}>3 秒后自动跳回登录页…</p>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
