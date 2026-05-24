import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_SITE_URL, SITEMAP_ROUTES, normalizeSiteUrl } from '../src/seo/constants.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '..', 'dist')

const siteUrl = normalizeSiteUrl(process.env.VITE_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL)

if (!existsSync(distDir)) {
  console.warn('[sitemap] dist/ not found, run pnpm build first')
  process.exit(0)
}

const today = new Date().toISOString().slice(0, 10)
const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...SITEMAP_ROUTES.map((route) =>
    [
      '  <url>',
      `    <loc>${escapeXml(`${siteUrl}${route.path}`)}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${route.changefreq}</changefreq>`,
      `    <priority>${route.priority}</priority>`,
      '  </url>',
    ].join('\n'),
  ),
  '</urlset>',
  '',
].join('\n')

writeFileSync(resolve(distDir, 'sitemap.xml'), xml)
console.log(`[sitemap] wrote dist/sitemap.xml with ${SITEMAP_ROUTES.length} URLs (base: ${siteUrl})`)

const robotsPath = resolve(distDir, 'robots.txt')
if (existsSync(robotsPath)) {
  let robots = readFileSync(robotsPath, 'utf8').replace(/\n?Sitemap:.*$/gim, '')
  robots = robots.replace(/\s*$/, '') + `\n\nSitemap: ${siteUrl}/sitemap.xml\n`
  writeFileSync(robotsPath, robots)
  console.log('[sitemap] appended Sitemap line to dist/robots.txt')
}
