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
  const layerPanel = page.locator('.output-layer-panel')
  await expect(layerPanel).toBeVisible()
  await Promise.all([
    page.waitForRequest((request) => request.method() === 'POST' && request.url().includes('/api/generate')),
    layerPanel.getByRole('button', { name: '开始分层' }).click(),
  ])

  await expect.poll(() => layerPayload).not.toBeNull()
  expect(layerPayload).toMatchObject({
    action: 'layer-split',
    tool: 'layer-split',
    output_format: 'png',
    tool_params: {
      strategy: 'auto',
      source_image: sourceImage,
    },
    parent_task_id: 'layer-background-source',
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

test('桌面端误触工具切换时保留当前生成结果', async ({ page }) => {
  let submittedPayload = null
  let generateRequestCount = 0
  const resultImage =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22320%22%3E%3Crect width=%22320%22 height=%22320%22 fill=%22%230f766e%22/%3E%3Ctext x=%22160%22 y=%22172%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2238%22%3EKeep%3C/text%3E%3C/svg%3E'

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.route('**/api/generate', (route) => {
    generateRequestCount += 1
    submittedPayload = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({
      json: {
        success: true,
        data: {
          id: 'desktop-tool-switch-keep-output',
          status: 'completed',
          prompt: submittedPayload.prompt,
          images: [
            {
              id: 'desktop-tool-switch-output-1',
              url: resultImage,
              title: '桌面保留结果',
              ratio: '1:1',
            },
          ],
        },
      },
    })
  })

  await page.goto('/generate')
  await page.getByLabel('提示词').fill('桌面工具切换保留结果测试')
  await page.getByRole('button', { name: '开始生成' }).click()

  await expect.poll(() => submittedPayload?.prompt).toBe('桌面工具切换保留结果测试')
  const outputPanel = page.locator('.output-panel')
  await expect(outputPanel.locator('.output-item')).toBeVisible()
  await expect(outputPanel.getByRole('img', { name: '桌面保留结果' })).toBeVisible()

  await page.getByRole('button', { name: /高清放大/ }).click()

  await expect(page.getByRole('heading', { name: '高清放大' })).toBeVisible()
  await expect(outputPanel.locator('.output-item')).toBeVisible()
  await expect(outputPanel.getByRole('img', { name: '桌面保留结果' })).toBeVisible()
  expect(generateRequestCount).toBe(1)
})

test('桌面端批量精看后切换工具保留当前选中结果', async ({ page }) => {
  let submittedPayload = null
  let generateRequestCount = 0
  const batchImages = [1, 2, 3, 4].map((index) => ({
    id: `desktop-batch-result-${index}`,
    url: `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22320%22%3E%3Crect width=%22320%22 height=%22320%22 fill=%22%23${['2563eb', '0f766e', 'b45309', '6d28d9'][index - 1]}%22/%3E%3Ctext x=%22160%22 y=%22172%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2248%22%3E${index}%3C/text%3E%3C/svg%3E`,
    title: `桌面批量结果 ${index}`,
    ratio: '1:1',
  }))

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.route('**/api/generate', (route) => {
    generateRequestCount += 1
    submittedPayload = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({
      json: {
        success: true,
        data: {
          id: 'desktop-batch-focus-task',
          status: 'completed',
          prompt: submittedPayload.prompt,
          requestedCount: submittedPayload.n,
          images: batchImages,
        },
      },
    })
  })

  await page.goto('/generate')
  await page.locator('.image-count-segment button').filter({ hasText: '4 张' }).click()
  await page.getByLabel('提示词').fill('桌面批量精看切换工具测试')
  await page.getByRole('button', { name: /批量生成 4 张图片/ }).click()

  await expect.poll(() => submittedPayload?.n).toBe(4)
  const outputPanel = page.locator('.output-panel')
  await expect(outputPanel.locator('.generated-output')).toHaveClass(/output-grid--overview/)
  await expect(outputPanel.locator('.output-item')).toHaveCount(4)

  await outputPanel.locator('.output-image-stage').nth(2).click()
  await expect(outputPanel.locator('.generated-output')).not.toHaveClass(/output-grid--overview/)
  await expect(outputPanel.locator('.output-item')).toHaveCount(1)
  await expect(outputPanel.locator('.generated-output .output-item img[alt="桌面批量结果 3"]')).toBeVisible()
  await expect(outputPanel.locator('.output-thumbnail-button').nth(2)).toHaveClass(/active/)

  await page.getByRole('button', { name: /高清放大/ }).click()

  await expect(page.getByRole('heading', { name: '高清放大' })).toBeVisible()
  await expect(outputPanel.locator('.output-item')).toHaveCount(1)
  await expect(outputPanel.locator('.generated-output .output-item img[alt="桌面批量结果 3"]')).toBeVisible()
  await expect(outputPanel.locator('.output-thumbnail-button').nth(2)).toHaveClass(/active/)
  expect(generateRequestCount).toBe(1)
})

test('桌面端批量结果预览可切换缩略图并复用任务参数', async ({ page }) => {
  let submittedPayload = null
  const batchImages = [1, 2, 3].map((index) => ({
    id: `desktop-preview-result-${index}`,
    url: `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22320%22%3E%3Crect width=%22320%22 height=%22320%22 fill=%22%23${['2563eb', '0f766e', 'b45309'][index - 1]}%22/%3E%3Ctext x=%22160%22 y=%22172%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2248%22%3E${index}%3C/text%3E%3C/svg%3E`,
    title: `桌面预览结果 ${index}`,
    ratio: '1:1',
  }))

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.route('**/api/generate', (route) => {
    submittedPayload = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({
      json: {
        success: true,
        data: {
          id: 'desktop-preview-reuse-task',
          status: 'completed',
          prompt: submittedPayload.prompt,
          requestedCount: submittedPayload.n,
          images: batchImages,
        },
      },
    })
  })

  await page.goto('/generate')
  await page.locator('.image-count-segment button').filter({ hasText: '4 张' }).click()
  await page.getByLabel('提示词').fill('桌面批量预览复用测试')
  await page.getByRole('button', { name: /批量生成 4 张图片/ }).click()

  await expect.poll(() => submittedPayload?.prompt).toBe('桌面批量预览复用测试')
  const outputPanel = page.locator('.output-panel')
  await expect(outputPanel.locator('.generated-output')).toHaveClass(/output-grid--overview/)
  await outputPanel.locator('.output-image-stage').nth(1).click()
  await expect(outputPanel.locator('.generated-output')).not.toHaveClass(/output-grid--overview/)
  await expect(outputPanel.locator('.generated-output .output-item img[alt="桌面预览结果 2"]')).toBeVisible()

  const promptInput = page.getByRole('textbox', { name: /提示词/ })
  await promptInput.fill('临时覆盖的提示词')
  await outputPanel.locator('.output-image-stage').click()

  const previewDialog = page.getByRole('dialog', { name: /桌面预览结果 2/ })
  await expect(previewDialog).toBeVisible()
  await expect(previewDialog.locator('.image-preview-thumb')).toHaveCount(3)

  await previewDialog.locator('.image-preview-thumb').nth(2).click()
  const currentPreviewDialog = page.getByRole('dialog', { name: /桌面预览结果 3/ })
  await expect(currentPreviewDialog).toBeVisible()
  await expect(currentPreviewDialog.locator('.image-preview-thumb').nth(2)).toHaveClass(/active/)
  await expect(currentPreviewDialog.getByText('3 / 3')).toBeVisible()

  await currentPreviewDialog.getByRole('button', { name: '复用' }).click()

  await expect(currentPreviewDialog).toBeHidden()
  await expect(promptInput).toHaveValue('桌面批量预览复用测试')
  await expect(outputPanel.locator('.output-item')).toHaveCount(1)
  await expect(outputPanel.locator('.output-thumbnail-button')).toHaveCount(3)
  await expect(outputPanel.locator('.generated-output .output-item img[alt="桌面预览结果 2"]')).toBeVisible()
})

test('复用结果续作后删除工具源图，切回工具不会恢复已删除参考图', async ({ page }) => {
  const resultImage =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22320%22%3E%3Crect width=%22320%22 height=%22320%22 fill=%22%230f766e%22/%3E%3Ctext x=%22160%22 y=%22172%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2236%22%3EReuse%3C/text%3E%3C/svg%3E'

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.addInitScript(
    ({ resultImage }) => {
      localStorage.setItem(
        'gptImage2Gallery',
        JSON.stringify([
          {
            id: 'reuse-handoff-delete-source',
            prompt: '复用后续作删除源图测试',
            model: 'gpt-image-2',
            mode: 'generate',
            ratio: '1:1',
            resolution: '4K',
            status: 'completed',
            createdAt: '2026-05-23T00:00:00.000Z',
            images: [{ id: 'reuse-output-1', url: resultImage, title: '复用续作结果', ratio: '1:1' }],
          },
        ]),
      )
    },
    { resultImage },
  )

  await page.goto('/generate')
  const outputPanel = page.locator('.output-panel')
  await page.locator('.recent-task-card').first().getByRole('button', { name: '复用最近任务' }).click()
  await expect(outputPanel.getByRole('img', { name: '复用续作结果' })).toBeVisible()

  await outputPanel.locator('.output-continuation-button').first().click()
  await expect(page.getByRole('heading', { name: '高清放大' })).toBeVisible()
  const upscalePanel = page.locator('.image-tool-upscale')
  await expect(upscalePanel.locator('.image-tool-source-grid')).toBeVisible()

  await upscalePanel.locator('.thumb-remove').click()
  await expect(upscalePanel.locator('.image-tool-source-grid')).toBeHidden()
  await expect(upscalePanel.locator('.upload-zone')).toBeVisible()

  await page.getByRole('button', { name: /AI生图/ }).click()
  await expect(page.getByRole('heading', { name: '生图参数' })).toBeVisible()

  await page.getByRole('button', { name: /高清放大/ }).click()
  await expect(page.getByRole('heading', { name: '高清放大' })).toBeVisible()
  await expect(upscalePanel.locator('.image-tool-source-grid')).toBeHidden()
  await expect(upscalePanel.locator('.upload-zone')).toBeVisible()
})

test('移动端误触工具切换时保留当前生成结果', async ({ page }) => {
  let submittedPayload = null
  let generateRequestCount = 0
  const resultImage =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22320%22%3E%3Crect width=%22320%22 height=%22320%22 fill=%22%23b45309%22/%3E%3Ctext x=%22160%22 y=%22172%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2238%22%3EKeep%3C/text%3E%3C/svg%3E'

  await page.setViewportSize({ width: 390, height: 900 })
  await page.route('**/api/generate', (route) => {
    generateRequestCount += 1
    submittedPayload = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({
      json: {
        success: true,
        data: {
          id: 'mobile-tool-switch-keep-output',
          status: 'completed',
          prompt: submittedPayload.prompt,
          images: [
            {
              id: 'mobile-tool-switch-output-1',
              url: resultImage,
              title: '移动保留结果',
              ratio: '1:1',
            },
          ],
        },
      },
    })
  })

  await page.goto('/generate')
  await page.getByLabel('提示词').fill('移动端工具切换保留结果测试')
  await page.locator('.generation-actions-floating').getByRole('button', { name: '开始生成' }).click()

  await expect.poll(() => submittedPayload?.prompt).toBe('移动端工具切换保留结果测试')
  const mobileOutput = page.locator('.mobile-output-section')
  await expect(mobileOutput.locator('.output-item')).toBeVisible()
  await expect(mobileOutput.getByRole('img', { name: '移动保留结果' })).toBeVisible()

  await page.locator('.mobile-tool-strip-item').filter({ hasText: '高清放大' }).click()

  await expect(page.getByRole('heading', { name: '高清放大' })).toBeVisible()
  await expect(mobileOutput.locator('.output-item')).toBeVisible()
  await expect(mobileOutput.getByRole('img', { name: '移动保留结果' })).toBeVisible()
  expect(generateRequestCount).toBe(1)
})

test('移动端完成生图后可通过紧凑续作菜单带入自由扩图', async ({ page }) => {
  let submittedPayload = null
  const resultImage =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22320%22%3E%3Crect width=%22320%22 height=%22320%22 fill=%22%232563eb%22/%3E%3Ctext x=%22160%22 y=%22170%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2232%22%3EImgsGen%3C/text%3E%3C/svg%3E'

  await page.setViewportSize({ width: 390, height: 900 })
  await page.route('**/api/generate', (route) => {
    submittedPayload = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({
      json: {
        success: true,
        data: {
          id: 'mobile-continue-task',
          status: 'completed',
          prompt: submittedPayload.prompt,
          images: [
            {
              id: 'mobile-result-1',
              url: resultImage,
              title: '移动端测试结果',
              ratio: '1:1',
            },
          ],
        },
      },
    })
  })

  await page.goto('/generate')
  await page.getByLabel('提示词').fill('移动端结果续作测试')
  await page.locator('.generation-actions-floating').getByRole('button', { name: '开始生成' }).click()

  await expect.poll(() => submittedPayload?.prompt).toBe('移动端结果续作测试')
  await expect(page.locator('.mobile-output-section .output-actions--compact')).toBeVisible()
  await expect(page.locator('.mobile-output-section .output-continuation-tools')).toHaveCount(0)

  await page.locator('.mobile-output-section .output-actions--compact .icon-button').nth(2).click()
  await expect(page.locator('.output-edit-popover')).toBeVisible()
  const floatingLayout = await page.evaluate(() => {
    const popover = document.querySelector('.output-edit-popover')?.getBoundingClientRect()
    const actions = document.querySelector('.generation-actions-floating')?.getBoundingClientRect()
    return {
      popoverBottom: Math.round(popover?.bottom || 0),
      actionsTop: Math.round(actions?.top || window.innerHeight),
    }
  })
  expect(floatingLayout.popoverBottom).toBeLessThanOrEqual(floatingLayout.actionsTop - 8)
  await page.keyboard.press('Escape')
  await expect(page.locator('.output-edit-popover')).toBeHidden()

  await page.locator('.mobile-output-section .output-continuation-trigger').click()
  await expect(page.locator('.mobile-output-section .output-continuation-popover')).toBeVisible()
  await page
    .locator('.mobile-output-section .output-continuation-popover')
    .getByRole('menuitem', { name: '扩图' })
    .click()

  await expect(page.getByRole('heading', { name: '自由扩图' })).toBeVisible()
  await expect(page.locator('.mobile-output-section .output-item')).toBeVisible()
  await expect(page.getByText('已将当前结果带入自由扩图工具')).toBeVisible()
})

test('移动端批量生成后可从总览切到精看并继续处理指定结果', async ({ page }) => {
  let submittedPayload = null
  const batchImages = [1, 2, 3, 4].map((index) => ({
    id: `mobile-batch-result-${index}`,
    url: `data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22320%22%3E%3Crect width=%22320%22 height=%22320%22 fill=%22%23${['2563eb', '0f766e', 'b45309', '6d28d9'][index - 1]}%22/%3E%3Ctext x=%22160%22 y=%22172%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2248%22%3E${index}%3C/text%3E%3C/svg%3E`,
    title: `批量结果 ${index}`,
    ratio: '1:1',
  }))

  await page.setViewportSize({ width: 390, height: 900 })
  await page.route('**/api/generate', (route) => {
    submittedPayload = JSON.parse(route.request().postData() || '{}')
    return route.fulfill({
      json: {
        success: true,
        data: {
          id: 'mobile-batch-task',
          status: 'completed',
          prompt: submittedPayload.prompt,
          requestedCount: submittedPayload.n,
          images: batchImages,
        },
      },
    })
  })

  await page.goto('/generate')
  const floatingActions = page.locator('.generation-actions-floating')
  await floatingActions.locator('.count-dropdown-trigger').click()
  await floatingActions.locator('.count-dropdown-menu button').filter({ hasText: '4 张' }).click()
  await page.getByLabel('提示词').fill('移动端批量总览续作测试')
  await floatingActions.getByRole('button', { name: /批量生成 4 张图片/ }).click()

  await expect.poll(() => submittedPayload?.n).toBe(4)
  const mobileOutput = page.locator('.mobile-output-section')
  await expect(mobileOutput.locator('.generated-output')).toHaveClass(/output-grid--overview/)
  await expect(mobileOutput.locator('.output-item')).toHaveCount(4)
  await expect(mobileOutput.locator('.output-view-toggle button').filter({ hasText: '总览' })).toHaveClass(/active/)

  await mobileOutput.locator('.output-image-stage').nth(2).click()
  await expect(mobileOutput.locator('.generated-output')).not.toHaveClass(/output-grid--overview/)
  await expect(mobileOutput.locator('.output-item')).toHaveCount(1)
  await expect(mobileOutput.locator('.output-thumbnail-button')).toHaveCount(4)
  await expect(mobileOutput.locator('.output-thumbnail-button').nth(2)).toHaveClass(/active/)

  await mobileOutput.locator('.output-continuation-trigger').click()
  await mobileOutput.locator('.output-continuation-popover').getByRole('menuitem', { name: '抠图' }).click()

  await expect(page.getByRole('heading', { name: '智能抠图' })).toBeVisible()
  await expect(mobileOutput.locator('.output-item')).toBeVisible()
  await expect(page.getByText('已将当前结果带入智能抠图工具')).toBeVisible()
})
