import { expect, test } from '@playwright/test'
import { acceptRegionNotice, setupDefaultApiMocks } from './helpers/apiMocks.js'

test.beforeEach(async ({ page }) => {
  await acceptRegionNotice(page)
  await setupDefaultApiMocks(page)
})

test('首页预取后可以进入生成页并使用基础控件', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /AI 图片生成与编辑工作台/ })).toBeVisible()

  await page.getByRole('link', { name: /开始生成图片/ }).click()
  await expect(page).toHaveURL(/\/generate/)
  await expect(page.getByRole('heading', { name: '生图参数' })).toBeVisible()

  await expect(page.getByRole('button', { name: '1 张', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const fourImagesButton = page.getByRole('button', { name: '4 张', exact: true })
  await fourImagesButton.click()
  await expect(fourImagesButton).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /批量生成 4 张图片/ })).toBeVisible()

  await page.getByRole('tab', { name: /图生图/ }).click()
  await page.getByPlaceholder('输入图片 URL').fill('https://example.com/reference.png')
  await page.getByRole('button', { name: '加入图片 URL' }).click()
  await expect(page.getByAltText('URL 参考图')).toBeVisible()

  await page.getByRole('button', { name: /打开图库/ }).click()
  await expect(page.getByRole('heading', { name: '我的图库' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: '我的图库' })).toBeHidden()
})

test('登录弹窗可以通过全局触发打开并把焦点归还给触发按钮', async ({ page }) => {
  await page.goto('/generate')
  const loginButton = page.getByRole('button', { name: '登录' })

  await loginButton.click()
  await expect(page.getByRole('heading', { name: /登录/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: /登录/ })).toBeHidden()
  await expect(loginButton).toBeFocused()
})

test('邀请链接会绑定邀请码并在注册弹窗中锁定展示', async ({ page }) => {
  await page.goto('/?inviteCode=INVITE-2026')

  await expect(page.getByRole('heading', { name: /创建 ImgsGen 账号/ })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('imgsgen:invite-code'))).toBe('INVITE-2026')
  const inviteInput = page.getByLabel('推荐邀请码')
  await expect(inviteInput).toHaveValue('INVITE-2026')
  await expect(inviteInput).toHaveJSProperty('readOnly', true)
  await expect(page.getByText('已绑定推荐邀请码，注册时会自动使用，不可修改。')).toBeVisible()
  await expect(page).toHaveURL(/inviteCode=INVITE-2026/)

  await page.keyboard.press('Escape')
  await page.goto('/generate')
  await page.getByRole('button', { name: '登录' }).click()
  await page.getByRole('tab', { name: '注册' }).click()

  await expect(page.getByLabel('推荐邀请码')).toHaveValue('INVITE-2026')
})

test('未登录点击开始生成会触发登录弹窗', async ({ page }) => {
  await page.goto('/generate')

  await page.getByRole('button', { name: '开始生成' }).click()
  await expect(page.getByRole('heading', { name: /登录/ })).toBeVisible()
})

test('图片处理入口可以切换到智能抠图和一键消除独立面板', async ({ page }) => {
  await page.goto('/generate')

  await page.getByRole('button', { name: /智能抠图/ }).click()
  await expect(page.getByRole('heading', { name: '智能抠图' })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始智能抠图' })).toBeVisible()
  await expect(page.getByText('透明 PNG')).toBeVisible()

  await page.getByRole('button', { name: /一键消除/ }).click()
  await expect(page.getByRole('heading', { name: '一键消除' })).toBeVisible()
  await expect(page.getByLabel('需要消除的内容')).toBeVisible()
  await expect(page.getByRole('button', { name: '开始一键消除' })).toBeVisible()
})

test('未登录点击提示词优化器开始优化会触发登录弹窗', async ({ page }) => {
  await page.goto('/prompt-optimizer')

  await page.getByLabel('原始提示词').fill('生成一张产品海报，主体是白色护肤品瓶。')
  await page.getByRole('button', { name: /开始优化/ }).click()
  await expect(page.getByRole('heading', { name: /登录/ })).toBeVisible()
})

test('画廊使用索引筛选，打开详情后加载完整 Prompt', async ({ page }) => {
  await page.goto('/showcase')
  await expect(page.getByPlaceholder(/搜索案例/)).toBeVisible()

  await page.getByPlaceholder(/搜索案例/).fill('poster')
  await expect(page.locator('.showcase-card').first()).toBeVisible()
  await page
    .getByRole('button', { name: /查看详情/ })
    .first()
    .click()

  await expect(page.locator('.prompt-detail-modal').getByRole('heading').first()).toBeVisible()
  await expect(page.locator('.prompt-block')).toContainText(/.|，|。/)
})

test('定价页"前往购买"按钮链接到链动小铺', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page.getByRole('heading', { name: /ImgsGen 积分方案/ })).toBeVisible()

  const buyButton = page.getByRole('button', { name: '前往购买' }).first()
  await expect(buyButton).toBeVisible()
})
