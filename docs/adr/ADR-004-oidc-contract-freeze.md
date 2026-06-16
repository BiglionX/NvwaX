# ADR-004: OIDC Protocol Contract Freeze (Sprint 2)

| Field    | Value |
|----------|-------|
| Status   | Accepted (Sprint 2 end) |
| Date     | Sprint 2 Day 10 |
| Deciders | NvwaX Identity WG, ProClaw 4 RP teams |
| Replaces | — |
| Superseded by | — |

## Context

Sprint 1 (commit `273fe6b`) shipped a **frozen** OIDC IdP contract — 6 endpoints, 6 error codes, JWT claims shape, issuer URL — that 4 Relying Party teams (`proclaw-desktop`, `proclaw-web`, `proclaw-mobile`, `skillhub-web`) are integrating against in parallel with Sprint 2.

Sprint 2 adds an end-user-facing account portal (white-label UI, registration, email activation, cross-subdomain cookie session). The risk is that the new endpoints either collide with the Sprint 1 contract (breaking 4 RP teams) or implicitly extend it (allowing drift in error codes / claim names).

## Decision

**Sprint 2 does NOT modify any Sprint 1 frozen artifact.** All new functionality lives under a separate URL prefix and uses a separate, parallel authentication mechanism (cookie session) that does not touch the OIDC bearer-token path.

### Frozen (Sprint 1) — UNCHANGED

| Artifact | Value |
|----------|-------|
| Discovery URL | `GET /.well-known/openid-configuration` |
| JWKS URL | `GET /.well-known/jwks.json` |
| Authorize URL | `GET /oauth/authorize` (still 200 + HTML in dev, 404 in prod) |
| Token URL | `POST /oauth/token` |
| UserInfo URL | `GET /oauth/userinfo` |
| Logout URL | `POST /oauth/logout` |
| Error codes | `invalid_request`, `invalid_client`, `invalid_grant`, `unauthorized_client`, `unsupported_grant_type`, `server_error` |
| id_token claims | `iss, sub, aud, exp, iat, auth_time, nonce, email, name` (10 fields) |
| access_token claims | `iss, sub, aud, exp, iat, scope, client_id` (7 fields) |
| Issuer | `https://account.proclaw.cc` (overridable via `OIDC_ISSUER` env in dev) |
| PKCE | Required (S256 or plain) for all grants |
| Token signing | RS256 (jose v5.10.0); JWKS published |

### New in Sprint 2

| Endpoint | Purpose | Affects Sprint 1 contract? |
|----------|---------|-----------------------------|
| `POST /api/portal/register` | Public registration (email + password) | No — new path |
| `POST /api/portal/activate/:token` | Consume activation token; set `pc_session` cookie | No — new path |
| `POST /api/portal/login` | Issue `pc_session` cookie | No — new path |
| `POST /api/portal/logout` | Clear `pc_session` cookie | No — new path |
| `GET  /api/portal/ping` | Liveness probe | No — new path |
| `GET  /portal/login/`, `/portal/register/`, `/portal/activate/[token]/`, `/portal/error/` | Static account portal UI | No — new path |

### Cookie session (NEW) — explicitly parallel

| Property | Value | Justification |
|----------|-------|---------------|
| Name | `pc_session` | Brand-agnostic, not OIDC-shaped |
| Domain | `.proclaw.cc` | Cross-subdomain SSO for all ProClaw apps |
| Path | `/` | Sent to all RP subdomains |
| HttpOnly | yes | Defense in depth vs. XSS |
| Secure | yes (prod) | Required for cross-site cookie sends |
| SameSite | `Lax` | Allows top-level cross-origin GET (RP callback flow) |
| Max-Age | 86400 (24h) | Re-login at least once a day |
| Signing | HS256 with `PC_SESSION_SECRET` (32-byte random, **not** shared with `JWT_SECRET`) | Independent rotation |
| Payload | `{ sub: userId, csrf: 16-byte hex, iat, exp }` | Minimal: no PII in cookie |

## Consequences

### Positive

- 4 RP teams can keep integrating against Sprint 1 contract with **zero** churn.
- Cookie session is independent of OIDC bearer; a leak of `PC_SESSION_SECRET` does not compromise OIDC tokens and vice versa.
- `pc_session` carries only a CSRF token + userId; no PII, no scopes, no RP context.
- authorizeGet gains a fast-path: when `pc_session` is present, it issues a code without rendering a login form (SSO UX). This is **additive** — RP teams that don't ship the cookie still see the same authorize flow as Sprint 1.

### Negative

- Two parallel auth systems (cookie + bearer) increases surface area. Mitigated by:
  - `pcSessionService.middleware()` is the only path that reads `pc_session`; it is mounted in `app.ts` before the OIDC router so it never alters OIDC request/response semantics.
  - `pc_session` is HttpOnly + Secure + SameSite=Lax; not exposed to JS.
  - `PC_SESSION_SECRET` is a separate secret; rotation invalidates sessions without affecting OIDC.

### Backward compatibility

- Existing OIDC clients (`nvwax-dev-client`) continue to work without changes.
- The 4 new RP client_ids (`proclaw-desktop`, `proclaw-web`, `proclaw-mobile`, `skillhub-web`) are seeded with `is_active = TRUE` and the same `allowed_scopes` (`openid profile email`); no behavior change for token issuance.

## Alternatives considered

| Option | Why rejected |
|--------|--------------|
| Replace OIDC authorize with cookie-only flow | Breaks RP teams; OIDC clients expect `code` exchange |
| Extend OIDC discovery with portal URLs | Pollutes the spec; not part of OIDC standard |
| Store RP context in `pc_session` (scope, client_id) | Cookie becomes RP-specific; defeats SSO across heterogeneous RPs |
| Use the existing `JWT_SECRET` for `PC_SESSION_SECRET` | Coupled rotation; OIDC key rotation would log out all portal users unnecessarily |

## Verification

The contract freeze is enforced by:

1. **Unit tests** in `nvwax-server` that re-read Sprint 1 endpoint expectations (DoD F16).
2. **E2E spec** `e2e/oidc-flow.spec.ts` exercises the full 5-step Sprint 1 flow end-to-end.
3. **Static assertion** `e2e/no-nvwax.spec.ts` confirms the portal is brand-clean.
4. **Diff check** in CI: any PR that modifies `src/routes/oidc.routes.ts`, `oidc.controller.ts` (authorizeGet/Post/token/userinfo/logout methods), or `oidc-error.ts` must add a CHANGELOG entry tagged `BREAKING` and bump the contract version.
