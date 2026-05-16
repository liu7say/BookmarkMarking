import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// 用于解决前端跨域抓取网页 HTML 的自定义插件
const htmlFetcherPlugin = () => ({
  name: 'html-fetcher',
  configureServer(server: any) {
    server.middlewares.use('/api/fetch-page', async (req: any, res: any) => {
      try {
        const urlObj = new URL(req.url || '', 'http://localhost');
        const targetUrl = urlObj.searchParams.get('url');
        
        if (!targetUrl) {
          res.statusCode = 400;
          res.end('Missing url parameter');
          return;
        }

        const fetchRes = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        const contentType = fetchRes.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          res.end('');
          return;
        }

        const html = await fetchRes.text();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      } catch (err: any) {
        res.statusCode = 500;
        res.end(err.message);
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    htmlFetcherPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      // DuckDuckGo Favicon API 代理
      // 请求: /api/favicon-ddg/example.com.ico
      // 代理到: https://icons.duckduckgo.com/ip3/example.com.ico
      '/api/favicon-ddg': {
        target: 'https://icons.duckduckgo.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/favicon-ddg/, '/ip3'),
      },
      // Google Favicon API 代理
      // 请求: /api/favicon-google?domain=example.com&sz=32
      // 代理到: https://www.google.com/s2/favicons?domain=example.com&sz=32
      '/api/favicon-google': {
        target: 'https://www.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/favicon-google/, '/s2/favicons'),
      },
    },
  },
})
