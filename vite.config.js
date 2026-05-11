import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL || env.SITE_URL || '').trim().replace(/\/+$/, '')

  return {
    plugins: [
      vue(),
      {
        name: 'imgsgen-html-site-url',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            if (siteUrl) {
              return html.replace(/%VITE_SITE_URL%/g, siteUrl)
            }
            return html
              .replace(/\s*<link rel="canonical"[^>]*>\n?/g, '')
              .replace(/\s*<link rel="preconnect" href="%VITE_SITE_URL%"[^>]*>\n?/g, '')
              .replace(/\s*<meta property="og:url"[^>]*>\n?/g, '')
              .replace(/%VITE_SITE_URL%/g, '')
          },
        },
      },
    ],
    build: {
      sourcemap: 'hidden',
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/')
            if (!normalizedId.includes('/node_modules/')) return undefined
            if (normalizedId.includes('/node_modules/lucide-vue-next/')) return 'vendor-icons'
            if (
              normalizedId.includes('/node_modules/vue/') ||
              normalizedId.includes('/node_modules/vue-router/') ||
              normalizedId.includes('/node_modules/@vue/')
            ) {
              return 'vendor-vue'
            }
            return undefined
          },
        },
      },
    },
  }
})
