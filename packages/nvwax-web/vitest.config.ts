import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  // Sprint 2.4: 让被测组件无需显式 import React（生产用 Next.js 自动 JSX 运行时）
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['lib/**/*.test.ts*', 'hooks/**/*.test.ts*', 'app/**/*.test.ts*', 'components/**/*.test.ts*', 'middleware.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
