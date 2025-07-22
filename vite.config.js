import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    historyApiFallback: true, // ✅ allows SPA routing
  },
  build: {
    rollupOptions: {    
    }
  },
  // After build, copy index.html to 404.html
  buildEnd: () => {
    const indexPath = resolve(__dirname, 'dist/index.html');
    const notFoundPath = resolve(__dirname, 'dist/404.html');
    if (fs.existsSync(indexPath)) {
      fs.copyFileSync(indexPath, notFoundPath);
    }
  }
});