import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { acceptRegionNotice, setupDefaultApiMocks } from './helpers/apiMocks.js'

const blockingImpacts = new Set(['critical', 'serious'])

async function expectNoBlockingA11yViolations(page, contextLabel) {
  await page.waitForTimeout(450)
  const results = await new AxeBuilder({ page }).analyze()
  const blockingViolations = results.violations.filter((violation) => blockingImpacts.has(violation.impact))
  const advisoryViolations = results.violations.filter((violation) => !blockingImpacts.has(violation.impact))

  if (advisoryViolations.length) {
    console.info(
      `[a11y][${contextLabel}] ${advisoryViolations.length} 个 moderate/minor 提示：${advisoryViolations
        .map((violation) => `${violation.id}(${violation.impact})`)
        .join(', ')}`,
    )
  }

  expect(
    blockingViolations,
    blockingViolations
      .map((violation) => {
        const targets = violation.nodes.map((node) => node.target.join(' ')).join('; ')
        return `${violation.id} [${violation.impact}] ${violation.help}: ${targets}`
      })
      .join('\n'),
  ).toEqual([])
}

async function gotoAndScan(page, path, headingPattern) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: headingPattern })).toBeVisible()
  await expectNoBlockingA11yViolations(page, path)
}

const pageScenarios = [
  ['/', /AI 图片生成与编辑工作台/],
  ['/generate', /生图参数/],
  ['/showcase', /ImgsGen 案例库/],
  ['/prompt-optimizer', /AI 提示词优化器/],
  ['/pricing', /ImgsGen 积分方案/],
  ['/docs', /ImgsGen 使用文档/],
  ['/my-orders', /个人中心|登录后查看/],
]

test.beforeEach(async ({ page }) => {
  await acceptRegionNotice(page)
  await setupDefaultApiMocks(page)
})

for (const [path, headingPattern] of pageScenarios) {
  test(`${path} 页面没有严重可访问性问题`, async ({ page }) => {
    await gotoAndScan(page, path, headingPattern)
  })
}

test('登录弹窗没有严重可访问性问题', async ({ page }) => {
  await page.goto('/generate')
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page.getByRole('dialog', { name: /登录/ })).toBeVisible()
  await expectNoBlockingA11yViolations(page, '登录弹窗')
})

test('图库弹窗没有严重可访问性问题', async ({ page }) => {
  await page.goto('/generate')
  await page.getByRole('button', { name: /打开图库/ }).click()
  await expect(page.getByRole('dialog', { name: '我的图库' })).toBeVisible()
  await expectNoBlockingA11yViolations(page, '图库弹窗')
})

test('图片预览弹窗没有严重可访问性问题', async ({ page }) => {
  await page.goto('/generate')
  await page.getByRole('tab', { name: /图生图/ }).click()
  await page.getByPlaceholder('输入图片 URL').fill('https://example.com/reference.png')
  await page.getByRole('button', { name: '加入图片 URL' }).click()
  await page.getByRole('button', { name: '预览 URL 参考图' }).click()
  await expect(page.getByRole('dialog', { name: /URL 参考图/ })).toBeVisible()
  await expectNoBlockingA11yViolations(page, '图片预览弹窗')
})

test('定价页"前往购买"按钮可见', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page.getByRole('button', { name: '前往购买' }).first()).toBeVisible()
  await expectNoBlockingA11yViolations(page, '定价页')
})
