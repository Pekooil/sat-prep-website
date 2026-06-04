import { defineConfig } from 'vitest/config'
import path from 'path'

const root = path.resolve(__dirname)

export default defineConfig({
  root,
  test: {
    root,
    environment: 'happy-dom',
    globals: true,
    setupFiles: [path.join(root, 'vitest.setup.ts')],
    include: [`${root}/__tests__/**/*.{test,spec}.{ts,tsx}`],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/**/*.ts', 'actions/**/*.ts'],
      exclude: ['lib/supabase/**', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
