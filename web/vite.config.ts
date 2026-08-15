import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

const rootPackagePath = fileURLToPath(new URL('../package.json', import.meta.url));
const rootPackage = JSON.parse(readFileSync(rootPackagePath, 'utf8')) as { version?: string };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPackage.version || '0.0.0')
  },
  build: {
    assetsDir: 'react-assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react-vendor';
          }
          if (id.includes('@tanstack/react-query')) return 'query-vendor';
          if (id.includes('@radix-ui') || id.includes('lucide-react')) return 'ui-vendor';
          if (id.includes('i18next')) return 'i18n-vendor';
          if (id.includes('react-hook-form') || id.includes('@hookform')) return 'forms-vendor';
          return 'vendor';
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:6500',
      '/assets': 'http://localhost:6500',
      '/outputs': 'http://localhost:6500',
      '/i18n': 'http://localhost:6500'
    }
  }
});
