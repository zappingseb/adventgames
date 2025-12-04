import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Inject API key at build time
  // The API key should be set as VITE_API_KEY environment variable during build
  // If not set, it will be empty string (for development)
  define: {
    // Vite automatically exposes VITE_* env vars, but we can also define defaults here
  },
});

