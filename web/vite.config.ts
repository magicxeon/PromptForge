import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    assetsDir: 'react-assets',
    sourcemap: false
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
