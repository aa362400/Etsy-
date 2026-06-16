import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function adminHistoryFallback(): Plugin {
  return {
    name: 'admin-history-fallback',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/admin') && !req.url.includes('.')) {
          const template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
          const html = await server.transformIndexHtml(req.url, template);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
          return;
        }
        next();
      });
    },
  };
}

// 控制台统一部署在 /admin/；本地开发也支持直接打开 /admin/ 下的二级页面。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    base: '/admin/',
    plugins: [adminHistoryFallback(), react()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
