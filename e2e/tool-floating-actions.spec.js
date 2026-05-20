import { expect, test } from '@playwright/test'
import { acceptRegionNotice, setupDefaultApiMocks } from './helpers/apiMocks.js'

test.beforeEach(async ({ page }) => {
  await acceptRegionNotice(page)
  await setupDefaultApiMocks(page)
})

test('顶部工具导航切到图片处理工具后，提交按钮同样悬浮', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 560 })
  await page.goto('/generate')

  await page.getByRole('button', { name: /高清放大/ }).click()
  await expect(page.getByRole('heading', { name: '高清放大' })).toBeVisible()

  const floatingActions = page.locator('.generation-actions-floating')
  await expect(floatingActions.getByRole('button', { name: '开始高清放大' })).toBeVisible()
  await expect(floatingActions.locator('.generation-cost-pill')).toContainText(/本次消耗/)

  await page.getByRole('button', { name: /智能抠图/ }).click()
  await expect(page.getByRole('heading', { name: '智能抠图' })).toBeVisible()
  await expect(floatingActions.getByRole('button', { name: '开始智能抠图' })).toBeVisible()
})

test('图片处理工具提交时携带工具类型和参数', async ({ page }) => {
  let submittedPayload = null
  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'e2e-token')
  })
  await page.route('**/api/me', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 'user-e2e',
          name: 'E2E 用户',
          email: 'e2e@example.com',
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
  await page.route('**/api/generate', async (route) => {
    submittedPayload = JSON.parse(route.request().postData() || '{}')
    await route.fulfill({
      json: {
        success: true,
        data: {
          id: 'task-tool-upscale',
          status: 'completed',
          prompt: submittedPayload.prompt,
          tool: submittedPayload.tool,
          toolParams: submittedPayload.tool_params,
          images: [{ url: '/uploads/upscale.png' }],
        },
      },
    })
  })

  await page.goto('/generate')
  await page.getByRole('button', { name: /高清放大/ }).click()
  await page.locator('#image-tool-url-upscale').fill('https://example.com/source.png')
  await page.getByRole('button', { name: '添加高清放大图片 URL' }).click()
  await page.getByRole('button', { name: '4X' }).click()
  await page.getByRole('button', { name: '开始高清放大' }).click()

  await expect.poll(() => submittedPayload?.tool).toBe('upscale')
  expect(submittedPayload).toEqual(
    expect.objectContaining({
      action: 'upscale',
      mode: 'image',
      references: ['https://example.com/source.png'],
      tool_params: expect.objectContaining({
        scale: '4x',
        enhance_mode: 'general',
        sharpness: 'balanced',
        face_restore: 'auto',
      }),
    }),
  )
})
