import { test } from '@playwright/test'
import * as fs from 'fs'

test.skip(!process.env.RUN_DESIGN_EXTRACT, '设计站点提取仅在显式调试时运行')

test('extract d.design toolbox html', async ({ page }) => {
  await page.goto('https://d.design/toolbox')
  await page.waitForTimeout(5000)
  const html = await page.evaluate(() => document.body.innerHTML)
  fs.mkdirSync('artifacts', { recursive: true })
  fs.writeFileSync('artifacts/d_design_body.html', html, 'utf-8')
})
