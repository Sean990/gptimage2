import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SITE_URL,
  ROUTE_SEO,
  SITEMAP_ROUTES,
  absoluteUrl,
  normalizeSiteUrl,
} from '../src/seo/constants.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '..', 'dist')
const siteUrl = normalizeSiteUrl(process.env.VITE_SITE_URL || process.env.SITE_URL || DEFAULT_SITE_URL)

const noindexRoutes = [
  ['/my-orders', ROUTE_SEO.myOrders],
  ['/my-credits', ROUTE_SEO.myCredits],
  ['/my-invites', ROUTE_SEO.myInvites],
  ['/profile', ROUTE_SEO.profile],
]

const failures = []

function fail(message) {
  failures.push(message)
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function htmlFileForPath(path) {
  if (path === '/') return resolve(distDir, 'index.html')
  return resolve(distDir, `${path.replace(/^\//, '').replace(/\//g, '-')}.html`)
}

function readHtml(path) {
  const file = htmlFileForPath(path)
  if (!existsSync(file)) {
    fail(`${path} 缺少 HTML 文件：${file}`)
    return ''
  }
  return readFileSync(file, 'utf8')
}

function getTitle(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || ''
}

function getAttr(tag, name) {
  return tag.match(new RegExp(`${escapeRegExp(name)}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] || ''
}

function findMeta(html, attrName, attrValue) {
  const pattern = new RegExp(`<meta\\s+[^>]*${attrName}\\s*=\\s*["']${escapeRegExp(attrValue)}["'][^>]*>`, 'i')
  return html.match(pattern)?.[0] || ''
}

function metaContent(html, attrName, attrValue) {
  const tag = findMeta(html, attrName, attrValue)
  return tag ? getAttr(tag, 'content') : ''
}

function canonicalHref(html) {
  const tag = html.match(/<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*>/i)?.[0] || ''
  return tag ? getAttr(tag, 'href') : ''
}

function parseJsonLd(html, path) {
  const blocks = [
    ...html.matchAll(/<script\s+[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ]
  if (!blocks.length) {
    fail(`${path} 缺少 JSON-LD 结构化数据`)
    return []
  }

  return blocks
    .map((match, index) => {
      try {
        return JSON.parse(match[1].trim())
      } catch (error) {
        fail(`${path} 第 ${index + 1} 段 JSON-LD 无法解析：${error.message}`)
        return null
      }
    })
    .filter(Boolean)
}

function validatePage(path, meta, expectedRobots = 'index,follow,max-image-preview:large') {
  const html = readHtml(path)
  if (!html) return

  const expectedCanonical = absoluteUrl(path, siteUrl)
  const expectedImage = absoluteUrl(meta.image || DEFAULT_OG_IMAGE_PATH, siteUrl)

  if (html.includes('%VITE_SITE_URL%')) fail(`${path} 仍包含未替换的 VITE_SITE_URL 占位符`)
  if (getTitle(html) !== meta.title) fail(`${path} title 不匹配`)
  if (metaContent(html, 'name', 'description') !== meta.description) fail(`${path} description 不匹配`)
  if (metaContent(html, 'name', 'robots') !== expectedRobots) fail(`${path} robots 应为 ${expectedRobots}`)
  if (canonicalHref(html) !== expectedCanonical) fail(`${path} canonical 应为 ${expectedCanonical}`)
  if (metaContent(html, 'property', 'og:url') !== expectedCanonical) fail(`${path} og:url 应为 ${expectedCanonical}`)
  if (metaContent(html, 'property', 'og:image') !== expectedImage) fail(`${path} og:image 应为 ${expectedImage}`)
  if (metaContent(html, 'name', 'twitter:image') !== expectedImage) fail(`${path} twitter:image 应为 ${expectedImage}`)

  const jsonLdBlocks = parseJsonLd(html, path)
  const graph = jsonLdBlocks.flatMap((block) => block['@graph'] || [block])
  const graphTypes = graph.flatMap((item) => item?.['@type'] || [])
  if (!graphTypes.includes('Organization')) fail(`${path} JSON-LD 缺少 Organization`)
  if (!graphTypes.includes('WebSite')) fail(`${path} JSON-LD 缺少 WebSite`)
  if (!graphTypes.includes('BreadcrumbList')) fail(`${path} JSON-LD 缺少 BreadcrumbList`)
  if (!graph.some((item) => item?.url === expectedCanonical || item?.['@id'] === `${expectedCanonical}#webpage`)) {
    fail(`${path} JSON-LD 未指向 canonical URL`)
  }
}

function validateSitemap() {
  const sitemapPath = resolve(distDir, 'sitemap.xml')
  if (!existsSync(sitemapPath)) {
    fail('缺少 dist/sitemap.xml')
    return
  }
  const sitemap = readFileSync(sitemapPath, 'utf8')
  const expectedLocs = SITEMAP_ROUTES.map((route) => `${siteUrl}${route.path}`)
  for (const loc of expectedLocs) {
    if (!sitemap.includes(`<loc>${loc}</loc>`)) fail(`sitemap.xml 缺少 ${loc}`)
  }
  for (const [path] of noindexRoutes) {
    if (sitemap.includes(`${siteUrl}${path}`)) fail(`sitemap.xml 不应包含 noindex 页面 ${path}`)
  }
}

function validateRobots() {
  const robotsPath = resolve(distDir, 'robots.txt')
  if (!existsSync(robotsPath)) {
    fail('缺少 dist/robots.txt')
    return
  }
  const robots = readFileSync(robotsPath, 'utf8')
  if (!robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`)) fail('robots.txt 缺少正确的 Sitemap 行')
  for (const [path] of noindexRoutes) {
    if (new RegExp(`^Disallow:\\s*${escapeRegExp(path)}\\s*$`, 'im').test(robots)) {
      fail(`robots.txt 不应阻止 ${path}，否则搜索引擎无法读取 noindex`)
    }
  }
}

function validateLlmsTxt() {
  const llmsPath = resolve(distDir, 'llms.txt')
  if (!existsSync(llmsPath)) {
    fail('缺少 dist/llms.txt')
    return
  }
  const llms = readFileSync(llmsPath, 'utf8')
  if (!/^#\s+\S+/m.test(llms)) fail('llms.txt 缺少 H1 标题')
  if (!/\[[^\]]+\]\(https:\/\/ai\.imgsgen\.cn\/[^)]*\)/.test(llms)) fail('llms.txt 缺少站内绝对链接')
}

function listHtmlFiles(dir = distDir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return listHtmlFiles(path)
    return entry.endsWith('.html') ? [path] : []
  })
}

if (!existsSync(distDir)) {
  throw new Error(`缺少 dist 目录：${distDir}`)
}

for (const route of SITEMAP_ROUTES) {
  validatePage(route.path, route)
}

for (const [path, meta] of noindexRoutes) {
  validatePage(path, meta, meta.robots)
}

validateSitemap()
validateRobots()
validateLlmsTxt()

const htmlFiles = listHtmlFiles()
for (const file of htmlFiles) {
  const label = relative(distDir, file).replace(/\\/g, '/')
  const html = readFileSync(file, 'utf8')
  if (html.includes('%VITE_SITE_URL%')) fail(`${label} 仍包含未替换的 VITE_SITE_URL 占位符`)
  if (/<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*>\s*<\/link>/i.test(html)) fail(`${label} 包含空 canonical link`)
  if (/<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']\s*["']/i.test(html)) {
    fail(`${label} 包含空 canonical href`)
  }
}

if (failures.length) {
  console.error('[seo] 检查失败：')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log(
  `[seo] 检查通过：${SITEMAP_ROUTES.length} 个可索引页面、${noindexRoutes.length} 个 noindex 页面、${htmlFiles.length} 个 HTML 文件。`,
)
