import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // Same-origin API in development, mirroring the reverse proxy used in Docker.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
