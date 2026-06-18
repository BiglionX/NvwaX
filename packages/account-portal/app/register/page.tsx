'use client';

import { useEffect } from 'react';

/**
 * Sprint 2.11 — Legacy /portal/register/ entry.
 *
 * Mirrors the LoginPage client-side redirect to the unified SPA at /portal/,
 * forcing mode=register. All other query params (e.g. ?redirectTo=...) are
 * preserved verbatim.
 */
export default function RegisterPage() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    p.set('mode', 'register');
    const qs = p.toString();
    window.location.replace(`/portal/?${qs}`);
  }, []);
  return null;
}