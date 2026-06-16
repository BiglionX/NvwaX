# ProClaw account portal

White-label account portal. Login, register, and email activation.

## Quickstart

```bash
pnpm install
pnpm --filter account-portal dev      # http://localhost:3003
pnpm --filter account-portal build    # → ./out (static export)
```

Static export is served by `nvwax-server` at `https://account.proclaw.cc/portal/*`.

## Layout

- `app/` — Next.js 14 App Router pages
- `components/` — Client components (forms, logo, locale switcher)
- `lib/` — Browser-side API client + i18n helper
- `messages/` — `zh-CN.json` / `en-US.json` translation bundles
- `styles/` — ProClaw design tokens (`globals.css`)
- `__tests__/` — Node test-runner specs (e.g. `no-nvwax.spec.ts`)

## Brand rules (DoD B4 / B5 / B8)

- All visible strings come from `messages/*.json`. The brand string is `"ProClaw"`.
- **No** reference to "NvwaX" in source, build output, or copy.
- Primary color is `#6D4AFF` (brand purple). The Sprint 1 placeholder `#2D7FF9` is gone.

## Backend contract

The portal calls `POST /api/portal/{register,login,logout}` and `POST /api/portal/activate/:token`.
All endpoints must be implemented by `nvwax-server` (see `src/routes/portal.routes.ts`).
