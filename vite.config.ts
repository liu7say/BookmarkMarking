import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
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
