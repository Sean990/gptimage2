import { expect, test } from '@playwright/test'
import { acceptRegionNotice, sitePayload } from './helpers/apiMocks.js'

test.beforeEach(async ({ page }) => {
  await acceptRegionNotice(page)
  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'e2e-token')
  })

  await page.route('**/api/site', (route) => route.fulfill({ json: sitePayload }))
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
  await page.route('**/api/gallery', (route) => route.fulfill({ json: { success: true, data: [] } }))
  await page.route('**/api/me/credits', (route) => route.fulfill({ json: { success: true, data: { ledger: [] } } }))
  await page.route('**/api/me/invites', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { inviteCode: '', inviteLink: '', records: [] },
      },
    }),
  )
})

test('AI 生图提交后结果区保持生成动画直到任务完成', async ({ page }) => {
  let completeTask
  await page.route('**/api/generate', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 'task-loading',
          status: 'running',
          images: [],
        },
      },
    }),
  )
  await page.route('**/api/generate/tasks/task-loading', async (route) => {
    await new Promise((resolve) => {
      completeTask = resolve
    })
    await route.fulfill({
      json: {
        success: true,
        data: {
          id: 'task-loading',
          status: 'completed',
          prompt: '一张蓝色产品海报',
          images: [{ url: '/uploads/result.png' }],
        },
      },
    })
  })

  await page.goto('/generate')
  await page.getByLabel('提示词').fill('一张蓝色产品海报')
  await page.getByRole('button', { name: '开始生成' }).click()

  const outputStatus = page.locator('.output-workbench .model-loading-state')
  await expect(outputStatus).toBeVisible()
  await expect(outputStatus).toContainText('ImgsGen 正在出图')
  await expect(page.getByRole('button', { name: '开始生成' })).toBeEnabled()
  await expect.poll(() => Boolean(completeTask)).toBe(true)

  completeTask()

  await expect(outputStatus).toBeHidden()
  await expect(page.locator('.image-preview-trigger').first()).toBeVisible()

  const promptInput = page.getByRole('textbox', { name: /提示词/ })
  await promptInput.fill('临时改写的提示词')
  await page.locator('.floating-gallery-button').click()
  await page.getByRole('button', { name: '复用' }).first().click()
  await expect(promptInput).toHaveValue('一张蓝色产品海报')
})
