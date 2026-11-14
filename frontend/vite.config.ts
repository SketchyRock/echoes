import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // The Go binary embeds this directory (backend/internal/web/web.go).
    outDir: '../backend/internal/web/dist',
    emptyOutDir: true,
  },
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
