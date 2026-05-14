import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/search': 'http://localhost:8004',
      '/download': 'http://localhost:8004',
      '/preview': 'http://localhost:8004',
      '/index': 'http://localhost:8004',
      '/thresholds': 'http://localhost:8004',
      '/train': 'http://localhost:8004',
      '/predict': 'http://localhost:8004',
      '/map': 'http://localhost:8004',
    },
  },
})
