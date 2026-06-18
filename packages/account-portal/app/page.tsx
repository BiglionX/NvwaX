'use client';

import { AuthPortalClient } from '@/components/AuthPortalClient';

/**
 * Sprint 2.11 — Single SPA entry for /portal/.
 *
 * Renders the unified auth portal (login / register / forgot tabs) directly,
 * removing the legacy two-hop redirect chain (root → /portal/login/ → SPA).
 *
 * The legacy /portal/login/ and /portal/register/ routes still exist and
 * client-side redirect here to preserve OIDC compatibility
 * (backend authorizeGet issues 302 Location: /portal/login/?redirectTo=...).
 */
export default function PortalRoot() {
  return <AuthPortalClient />;
}