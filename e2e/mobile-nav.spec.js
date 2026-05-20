import { expect, test } from '@playwright/test'
import { acceptRegionNotice, setupDefaultApiMocks } from './helpers/apiMocks.js'

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await acceptRegionNotice(page)
  await setupDefaultApiMocks(page)
})

test('移动端展开菜单只保留页面导航入口', async ({ page }) => {
  await page.goto('/')

  const header = page.getByRole('banner')
  await expect(header.getByRole('button', { name: '登录' })).toBeVisible()
  await expect(header.getByRole('button', { name: /切换到/ })).toBeVisible()

  await header.getByRole('button', { name: '打开菜单' }).click()

  const mobileMenu = page.getByRole('navigation', { name: '移动端导航' })
  await expect(mobileMenu).toBeVisible()
  await expect(mobileMenu.getByRole('link', { name: '图片生成' })).toBeVisible()
  await expect(mobileMenu.getByRole('button', { name: '登录' })).toHaveCount(0)
  await expect(mobileMenu.getByRole('button', { name: /切换/ })).toHaveCount(0)
})
