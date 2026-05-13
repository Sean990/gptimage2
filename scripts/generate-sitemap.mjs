import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '..', 'dist')

const siteUrl = (process.env.VITE_SITE_URL || process.env.SITE_URL || '').trim().replace(/\/+$/, '')

if (!siteUrl) {
  console.warn('[sitemap] SITE_URL not set, skipping sitemap.xml and robots.txt Sitemap line')
  process.exit(0)
}

if (!existsSync(distDir)) {
  console.warn('[sitemap] dist/ not found, run pnpm build first')
  process.exit(0)
}

const routes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/generate', changefreq: 'weekly', priority: '0.9' },
  { path: '/prompt-optimizer', changefreq: 'weekly', priority: '0.8' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.7' },
  { path: '/showcase', changefreq: 'weekly', priority: '0.8' },
  { path: '/docs', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms-of-service', changefreq: 'yearly', priority: '0.3' },
]

const today = new Date().toISOString().slice(0, 10)

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map((r) =>
    [
      '  <url>',
      `    <loc>${siteUrl}${r.path}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${r.changefreq}</changefreq>`,
      `    <priority>${r.priority}</priority>`,
      '  </url>',
    ].join('\n'),
  ),
  '</urlset>',
  '',
].join('\n')

writeFileSync(resolve(distDir, 'sitemap.xml'), xml)
console.log(`[sitemap] wrote dist/sitemap.xml with ${routes.length} URLs (base: ${siteUrl})`)

const robotsPath = resolve(distDir, 'robots.txt')
if (existsSync(robotsPath)) {
  let robots = readFileSync(robotsPath, 'utf8').replace(/\n?Sitemap:.*$/gm, '')
  robots = robots.replace(/\s*$/, '') + `\n\nSitemap: ${siteUrl}/sitemap.xml\n`
  writeFileSync(robotsPath, robots)
  console.log('[sitemap] appended Sitemap line to dist/robots.txt')
}
