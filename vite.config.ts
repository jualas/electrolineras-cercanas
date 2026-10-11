import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.VITE_DEV_API_PROXY ?? 'https://electro.jualas.es'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true, secure: true },
      '/health': { target: apiTarget, changeOrigin: true, secure: true },
    },
  },
})
