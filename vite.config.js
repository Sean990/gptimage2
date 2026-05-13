import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_SITE_URL || env.SITE_URL || '').trim().replace(/\/+$/, '')
  const analyzeEnabled = mode === 'analyze' || env.ANALYZE === '1'

  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,jpg,jpeg,webp}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
      analyzeEnabled &&
        visualizer({
          filename: 'dist/bundle-report.html',
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        }),
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
    ].filter(Boolean),
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
