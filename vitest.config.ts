import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    // Solo ejecutar tests de la aplicación Portalmaker y excluir carpetas de demo externas
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts', 'app/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/TiendaDemo/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
