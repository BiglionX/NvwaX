'use client';

import { useEffect } from 'react';

/**
 * Sprint 2.11 — Legacy /portal/login/ entry.
 *
 * Backend OIDC authorizeGet still issues 302 Location: /portal/login/?redirectTo=...
 * (see packages/nvwax-server/src/controllers/oidc.controller.ts). We redirect
 * client-side to the SPA at /portal/?mode=login&..., preserving all query params
 * so `redirectTo` is not lost.
 *
 * If the caller already passed ?mode=register (deep link from an external page),
 * we honor that instead of forcing login.
 */
export default function LoginPage() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const incomingMode = p.get('mode');
    p.set('mode', incomingMode === 'register' || incomingMode === 'forgot' ? incomingMode : 'login');
    const qs = p.toString();
    window.location.replace(`/portal/?${qs}`);
  }, []);
  return null;
}