import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function copyCloudflareFiles() {
  return {
    name: 'copy-cloudflare-files',
    closeBundle() {
      const indexPath = resolve(__dirname, 'dist/index.html');
      const notFoundPath = resolve(__dirname, 'dist/404.html');
      
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, notFoundPath);
        console.log('✔ Copied index.html to 404.html');
      }

      const files = ['_redirects', '_headers'];
      files.forEach(file => {
        const src = resolve(__dirname, 'public', file);
        const dest = resolve(__dirname, 'dist', file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`✔ Copied ${file} to dist`);
        }
      });
    }
  };
}

function getPlugins() {
  const plugins = [react(), copyCloudflareFiles()];
  
  // Only add admin API plugin in development mode
  if (process.env.NODE_ENV === 'development') {
    const adminApiPlugin = require('./admin/vite-plugin-admin-api').default;
    plugins.push(adminApiPlugin());
  }
  
  return plugins;
}

export default defineConfig({
  base: '/',
  plugins: getPlugins(),
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().split('T')[0]),
  },
  server: {
    historyApiFallback: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom', 'i18next'],
          'markdown': ['react-markdown', 'remark-gfm', 'rehype-raw'],
        }
      }
    }
  }
});