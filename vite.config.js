import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

function copyIndexTo404() {
  return {
    name: 'copy-index-to-404',
    closeBundle() {
      const indexPath = resolve(__dirname, 'dist/index.html');
      const notFoundPath = resolve(__dirname, 'dist/404.html');
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, notFoundPath);
        console.log('✔ Copied index.html to 404.html');
      } else {
        console.warn('⚠ index.html not found, 404.html not created.');
      }
    }
  };
}

export default defineConfig({
  base: '/', // or your repo name if hosting at github.com/user/repo
  plugins: [react(), copyIndexTo404()],
  server: {
    historyApiFallback: true
  },
  build: {
    rollupOptions: {
      // optional additional config
    }
  }
});