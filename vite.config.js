import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/lonelydev/',
  server: {
    historyApiFallback: true, // ✅ allows SPA routing
  }
})