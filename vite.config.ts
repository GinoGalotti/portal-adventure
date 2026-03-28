import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  publicDir: 'assets',
  plugins: [react()],
  build: {
    target: 'es2020',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
