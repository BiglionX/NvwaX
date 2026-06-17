import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['lib/**/*.test.ts*', 'hooks/**/*.test.ts*', 'app/**/*.test.ts*', 'middleware.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
