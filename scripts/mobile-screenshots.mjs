import { chromium, devices } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'tmp-mobile-shots')
mkdirSync(outDir, { recursive: true })

const baseURL = process.env.MOBILE_DEV_URL || 'http://127.0.0.1:5173'
const tag = process.argv[2] || 'now'

const pages = [
  { name: 'home', path: '/' },
  { name: 'generate', path: '/generate' },
  { name: 'optimizer', path: '/prompt-optimizer' },
  { name: 'showcase', path: '/showcase' },
  { name: 'pricing', path: '/pricing' },
  { name: 'docs', path: '/docs' },
  { name: 'orders', path: '/my-orders' },
]

const browser = await chromium.launch()
const context = await browser.newContext({
  ...devices['iPhone 13'],
  // Persist the regional notice acceptance to avoid the cross-page modal
  storageState: {
    cookies: [],
    origins: [
      {
        origin: baseURL,
        localStorage: [{ name: 'imgsgen-region-notice-accepted-v1', value: 'accepted' }],
      },
    ],
  },
})

for (const page of pages) {
  const tab = await context.newPage()
  try {
    await tab.goto(`${baseURL}${page.path}`, { waitUntil: 'networkidle', timeout: 30_000 })
    await tab.waitForTimeout(800)
    await tab.screenshot({ path: `${outDir}/${tag}-${page.name}.png`, fullPage: true })
    console.log('captured', page.name)
  } catch (error) {
    console.error('failed', page.name, error?.message || error)
  } finally {
    await tab.close()
  }
}

await context.close()
await browser.close()
