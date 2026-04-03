import {defineConfig} from 'vitest/config'

export default defineConfig({
   test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.test.ts'],
      clearMocks: true,
      coverage: {
         provider: 'v8',
         thresholds: {
            branches: 0,
            functions: 14,
            lines: 27,
            statements: 27
         }
      }
   }
})
