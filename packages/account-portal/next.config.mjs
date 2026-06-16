/**
 * Next.js configuration for ProClaw account-portal.
 *
 * - output: 'export'      → static export to ./out (no SSR runtime needed)
 * - basePath: '/portal'   → all routes served at https://account.proclaw.cc/portal/*
 * - trailingSlash: true   → /portal/login/  (avoids 404 on deep links)
 * - images.unoptimized    → required for static export
 */
const nextConfig = {
  output: 'export',
  basePath: '/portal',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
