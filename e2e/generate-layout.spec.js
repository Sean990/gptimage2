import { expect, test } from '@playwright/test'
import { acceptRegionNotice, setupDefaultApiMocks } from './helpers/apiMocks.js'

async function setupAuthenticatedGeneratePage(page) {
  await acceptRegionNotice(page)
  await setupDefaultApiMocks(page)
  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'layout-e2e-token')
  })
  await page.route('**/api/me', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 'layout-user',
          name: '布局巡检用户',
          email: 'layout@example.com',
          credits: 100,
          promptOptimizeFreeRemaining: 3,
        },
      },
    }),
  )
  await page.route('**/api/models', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: [{ id: 'gpt-image-2', name: 'ImgsGen' }],
      },
    }),
  )
}

async function expectNoPageHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const width = window.innerWidth
    return {
      innerWidth: width,
      documentOverflow: document.documentElement.scrollWidth - width,
      bodyOverflow: document.body.scrollWidth - width,
    }
  })
  expect(Math.max(overflow.documentOverflow, overflow.bodyOverflow)).toBeLessThanOrEqual(0)
}

test.beforeEach(async ({ page }) => {
  await setupAuthenticatedGeneratePage(page)
})

test('生成工作台桌面和窄屏移动端没有页面级横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 980 })
  await page.goto('/generate')
  await expect(page.getByRole('heading', { name: '生图参数' })).toBeVisible()
  await expectNoPageHorizontalOverflow(page)

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/generate')
  await expect(page.getByRole('heading', { name: '生成与处理' })).toBeVisible()
  await expectNoPageHorizontalOverflow(page)

  await page.getByRole('tab', { name: '高清放大' }).click()
  await expect(page.getByRole('heading', { name: '高清放大' })).toBeVisible()
  await expectNoPageHorizontalOverflow(page)
})

test('移动端结果浮层保持在视口内并避开底部生成栏', async ({ page }) => {
  const resultImage =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22320%22%3E%3Crect width=%22320%22 height=%22320%22 fill=%22%230f766e%22/%3E%3C/svg%3E'

  await page.setViewportSize({ width: 360, height: 800 })
  await page.route('**/api/generate', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 'layout-mobile-task',
          status: 'completed',
          prompt: '移动端布局巡检图',
          images: [{ id: 'layout-mobile-result', url: resultImage, title: '布局巡检结果', ratio: '1:1' }],
        },
      },
    }),
  )

  await page.goto('/generate')
  await page.getByLabel('提示词').fill('移动端布局巡检图')
  await page.locator('.generation-actions-floating').getByRole('button', { name: '开始生成' }).click()
  await expect(page.locator('.mobile-output-section .output-actions--compact')).toBeVisible()

  await page.locator('.mobile-output-section .output-actions--compact .icon-button').nth(2).click()
  await expect(page.locator('.output-edit-popover')).toBeVisible()

  const layout = await page.evaluate(() => {
    const popover = document.querySelector('.output-edit-popover')?.getBoundingClientRect()
    const actions = document.querySelector('.generation-actions-floating')?.getBoundingClientRect()
    return {
      left: Math.round(popover?.left || 0),
      right: Math.round(popover?.right || 0),
      bottom: Math.round(popover?.bottom || 0),
      actionsTop: Math.round(actions?.top || window.innerHeight),
      width: window.innerWidth,
    }
  })

  expect(layout.left).toBeGreaterThanOrEqual(0)
  expect(layout.right).toBeLessThanOrEqual(layout.width)
  expect(layout.bottom).toBeLessThanOrEqual(layout.actionsTop - 8)
  await expectNoPageHorizontalOverflow(page)
})

test('生成工作台深色模式桌面和移动端布局稳定', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('theme', 'dark')
  })

  await page.setViewportSize({ width: 1440, height: 980 })
  await page.goto('/generate')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.generate-page')).toBeVisible()
  await expect(page.locator('.tool-panel')).toBeVisible()
  await expect(page.locator('.output-panel')).toBeVisible()
  await expectNoPageHorizontalOverflow(page)

  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/generate')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.mobile-workbench-panel')).toBeVisible()
  await expect(page.locator('.mobile-output-dock')).toBeVisible()
  await expect(page.locator('.mobile-tool-strip-item.active')).toContainText('AI 生图')
  await expectNoPageHorizontalOverflow(page)
})
