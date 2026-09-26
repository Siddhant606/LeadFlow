import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 35000,
    hookTimeout: 35000,
    fileParallelism: false, // Run test suites sequentially to avoid MongoDB/Redis race conditions
  },
});
