import { test } from '@playwright/test'
import * as fs from 'fs'
test('extract d.design toolbox html', async ({ page }) => {
  await page.goto('https://d.design/toolbox')
  await page.waitForTimeout(5000)
  const html = await page.evaluate(() => document.body.innerHTML)
  fs.writeFileSync('d_design_body.html', html, 'utf-8')
})
