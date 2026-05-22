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

test('桌面滚动时生图参数面板不被顶部导航遮挡', async ({ page }) => {
  await page.setViewportSize({ width: 1598, height: 1276 })
  await page.goto('/generate')
  await expect(page.getByRole('heading', { name: '生图参数' })).toBeVisible()

  await page.evaluate(() => window.scrollTo(0, 120))

  const layout = await page.evaluate(() => {
    const header = document.querySelector('.site-header').getBoundingClientRect()
    const panel = document.querySelector('.tool-panel').getBoundingClientRect()
    const footerTip = document.querySelector('.generate-footer-tip').getBoundingClientRect()
    const panelStyle = window.getComputedStyle(document.querySelector('.tool-panel'))

    return {
      headerBottom: header.bottom,
      panelTop: panel.top,
      footerTipTop: footerTip.top,
      viewportHeight: window.innerHeight,
      panelOverflowY: panelStyle.overflowY,
    }
  })

  expect(layout.panelTop).toBeGreaterThanOrEqual(layout.headerBottom + 24)
  expect(layout.panelOverflowY).toBe('auto')
  expect(layout.footerTipTop).toBeGreaterThan(layout.viewportHeight)
})

test('全局图库打开失败任务时可以重试生成', async ({ page }) => {
  const pageErrors = []
  let submittedPayload = null

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  await page.addInitScript(() => {
    localStorage.setItem(
      'gptImage2Gallery',
      JSON.stringify([
        {
          id: 'failed-gallery-retry',
          prompt: '失败任务重试图',
          model: 'gpt-image-2',
          mode: 'generate',
          ratio: '1:1',
          resolution: '1K',
          status: 'failed',
          requestedCount: 1,
          failedCount: 1,
          createdAt: '2026-05-22T10:00:00.000Z',
          images: [],
        },
      ]),
    )
  })
  await page.route('**/api/generate', (route) => {
    submittedPayload = { unexpectedNewTask: true }
    return route.fulfill({
      status: 500,
      json: { success: false, message: '不应该新建任务' },
    })
  })
  await page.route('**/api/generate/tasks/failed-gallery-retry/retry', (route) => {
    submittedPayload = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({
      json: {
        success: true,
        data: {
          id: 'failed-gallery-retry',
          status: 'completed',
          prompt: '失败任务重试图',
          images: [{ url: '/uploads/retry-result.png' }],
        },
      },
    })
  })

  await page.goto('/generate')
  const failedRecentTask = page.locator('.recent-task-card').first()
  await expect(failedRecentTask).toBeVisible()
  await expect(failedRecentTask.locator('.recent-task-cover')).not.toHaveAttribute('type', 'button')
  await expect(failedRecentTask.locator('.recent-task-actions .icon-button')).toHaveCount(3)

  await page.locator('.floating-gallery-button').click()

  const galleryDialog = page.getByRole('dialog', { name: '我的图库' })
  await expect(galleryDialog).toBeVisible()
  const failedGalleryCard = galleryDialog.locator('.gallery-card').first()
  await expect(failedGalleryCard.locator('.gallery-cover')).not.toHaveAttribute('type', 'button')
  await expect(failedGalleryCard.locator('.gallery-actions .icon-button')).toHaveCount(2)
  await expect(galleryDialog.getByRole('img', { name: /生成失败/ })).toBeVisible()
  await galleryDialog.getByRole('button', { name: '重试', exact: true }).click()

  await expect.poll(() => submittedPayload?.unexpectedNewTask).toBeUndefined()
  expect(submittedPayload).toEqual({ n: 1 })
  expect(pageErrors).not.toContainEqual(expect.stringContaining('canRetryGalleryRecord is not a function'))
})

test('多图任务部分失败时只重试失败图片', async ({ page }) => {
  let retryPayload = null
  await page.addInitScript(() => {
    localStorage.setItem(
      'gptImage2Gallery',
      JSON.stringify([
        {
          id: 'partial-gallery-retry',
          prompt: '部分失败批量图',
          model: 'gpt-image-2',
          mode: 'generate',
          ratio: '1:1',
          resolution: '1K',
          status: 'partial_completed',
          requestedCount: 4,
          failedCount: 2,
          createdAt: '2026-05-22T10:00:00.000Z',
          images: [{ url: '/uploads/partial-1.png' }, { url: '/uploads/partial-2.png' }],
        },
      ]),
    )
  })
  await page.route('**/api/generate', (route) =>
    route.fulfill({
      status: 500,
      json: { success: false, message: '不应该新建任务' },
    }),
  )
  await page.route('**/api/generate/tasks/partial-gallery-retry/retry', (route) => {
    retryPayload = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({
      json: {
        success: true,
        data: {
          id: 'partial-gallery-retry',
          status: 'completed',
          prompt: '部分失败批量图',
          requestedCount: 4,
          failedCount: 0,
          images: [
            { url: '/uploads/partial-1.png' },
            { url: '/uploads/partial-2.png' },
            { url: '/uploads/partial-3.png' },
            { url: '/uploads/partial-4.png' },
          ],
        },
      },
    })
  })

  await page.goto('/generate')
  const partialRecentTask = page.locator('.recent-task-card').first()
  await expect(partialRecentTask).toBeVisible()
  await expect(partialRecentTask.locator('.recent-task-actions .icon-button')).toHaveCount(4)
  await partialRecentTask.getByRole('button', { name: '重试最近任务' }).click()

  await expect.poll(() => retryPayload).toEqual({ n: 2, failed_only: true })
})

test('智能分层请求不传透明背景参数', async ({ page }) => {
  let layerPayload = null
  const sourceImage =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22240%22%3E%3Crect width=%22320%22 height=%22240%22 fill=%22%23f59e0b%22/%3E%3C/svg%3E'
  const layerImage =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22240%22%3E%3Crect width=%22320%22 height=%22240%22 fill=%22%232563eb%22/%3E%3C/svg%3E'

  await page.addInitScript(
    ({ sourceImage }) => {
      localStorage.setItem(
        'gptImage2Gallery',
        JSON.stringify([
          {
            id: 'layer-background-source',
            prompt: '分层背景参数检查',
            model: 'gpt-image-2',
            mode: 'generate',
            ratio: '4:3',
            resolution: '4K',
            background: 'transparent',
            status: 'completed',
            createdAt: '2026-05-23T00:00:00.000Z',
            images: [{ url: sourceImage, background: 'transparent' }],
          },
        ]),
      )
    },
    { sourceImage },
  )
  await page.route('**/api/generate', (route) => {
    layerPayload = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({
      json: {
        success: true,
        data: {
          id: 'layer-background-task',
          status: 'completed',
          tool: 'layer-split',
          requestedCount: 3,
          images: [{ url: layerImage, layerType: 'subject', layerLabel: '主体' }],
        },
      },
    })
  })

  await page.setViewportSize({ width: 1280, height: 1000 })
  await page.goto('/generate')
  const recentTask = page.locator('.recent-task-card').first()
  await expect(recentTask).toBeVisible()
  await recentTask.getByRole('button', { name: '复用最近任务' }).click()

  await page.getByRole('button', { name: /智能分层面板/ }).click()
  await page.getByRole('button', { name: '开始分层' }).click({ force: true })

  await expect.poll(() => layerPayload).not.toBeNull()
  expect(layerPayload).toMatchObject({
    action: 'layer-split',
    tool: 'layer-split',
    output_format: 'png',
    tool_params: {
      layer_types: ['subject', 'text', 'background'],
    },
  })
  expect(layerPayload.background).toBeUndefined()
  expect(layerPayload.tool_params.background).toBeUndefined()
  expect(layerPayload.tool_params.output_background).toBeUndefined()
  expect(JSON.stringify(layerPayload)).not.toContain('transparent')
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
  await expect(outputStatus).toContainText(
    '任务已提交，预计1~3分钟完成。结果区会显示生成动画，你也可以继续生成或处理下一张图片，进度可在我的图库查看。',
  )
  await expect(page.getByRole('button', { name: '开始生成' })).toBeEnabled()
  await expect.poll(() => Boolean(completeTask)).toBe(true)

  completeTask()

  await expect(outputStatus).toBeHidden()
  const outputStage = page.locator('.output-image-stage').first()
  await expect(outputStage).toBeVisible()
  await expect(page.locator('.output-actions .icon-button')).toHaveCount(3)
  await outputStage.click()
  await expect(page.getByRole('dialog', { name: /ImgsGen 生成图 1/ })).toBeVisible()
  await page.getByRole('button', { name: '关闭预览' }).click()

  const promptInput = page.getByRole('textbox', { name: /提示词/ })
  await promptInput.fill('临时改写的提示词')
  await page.locator('.floating-gallery-button').click()
  await page.getByRole('dialog', { name: '我的图库' }).getByRole('button', { name: '复用' }).first().click()
  await expect(promptInput).toHaveValue('一张蓝色产品海报')
})
