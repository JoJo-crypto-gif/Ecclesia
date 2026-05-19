import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '');
    const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5001';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: apiProxyTarget,
            changeOrigin: true,
            secure: false,
          },
          '/uploads': {
            target: apiProxyTarget,
            changeOrigin: true,
            secure: false,
          },
        },
      },
      plugins: [react(), basicSsl()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
