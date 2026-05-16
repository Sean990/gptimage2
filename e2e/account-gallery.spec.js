import { expect, test } from '@playwright/test'
import { acceptRegionNotice, sitePayload } from './helpers/apiMocks.js'

const authUser = {
  id: 'user-e2e-gallery',
  name: '图库测试用户',
  email: 'gallery-e2e@example.com',
  credits: 128,
  galleryCount: 2,
}

function createGalleryRecords() {
  return [
    {
      id: 'cloud-gallery-1',
      prompt: '第一张云端测试图',
      model: 'gpt-image-2',
      mode: 'generate',
      ratio: '1:1',
      resolution: '1K',
      status: 'completed',
      createdAt: '2026-05-13T08:00:00.000Z',
      images: [
        {
          id: 'cloud-gallery-1-image-1',
          url: 'https://example.com/gallery-one.png',
          title: '第一张云端测试图',
        },
      ],
    },
    {
      id: 'cloud-gallery-2',
      prompt: '第二张云端测试图',
      model: 'gpt-image-2',
      mode: 'generate',
      ratio: '1:1',
      resolution: '1K',
      status: 'completed',
      createdAt: '2026-05-13T09:00:00.000Z',
      images: [
        {
          id: 'cloud-gallery-2-image-1',
          url: 'https://example.com/gallery-two.png',
          title: '第二张云端测试图',
        },
      ],
    },
  ]
}

async function setupAuthenticatedGalleryMocks(page) {
  let galleryRecords = createGalleryRecords()
  const deletedGalleryIds = []

  await acceptRegionNotice(page)
  await page.addInitScript(() => {
    localStorage.setItem('token', 'valid.e2e.token')
  })

  await page.route('**/api/site', (route) => route.fulfill({ json: sitePayload }))
  await page.route('**/api/me', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          ...authUser,
          galleryCount: galleryRecords.length,
        },
      },
    }),
  )
  await page.route('**/api/orders', (route) => route.fulfill({ json: { success: true, data: [] } }))
  await page.route('**/api/me/credits', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          ledger: [
            {
              id: 'ledger-1',
              type: 'signup_bonus',
              description: '注册奖励',
              amount: 100,
              createdAt: '2026-05-13T07:00:00.000Z',
            },
          ],
        },
      },
    }),
  )
  await page.route('**/api/me/invites', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          inviteCode: 'E2E-INVITE',
          inviteLink: 'https://imgsgen.example/?inviteCode=E2E-INVITE',
          rewardCredits: 20,
          rewardRule: '每邀请 1 位新用户注册，奖励 20 积分。',
          totalInvites: 1,
          paidInvites: 0,
          totalRewardCredits: 20,
          records: [
            {
              id: 'invite-1',
              invitedAt: '2026-05-13T06:00:00.000Z',
              invitedUser: 'friend@example.com',
              status: '已注册',
              rewardCredits: 20,
            },
          ],
        },
      },
    }),
  )
  await page.route('**/api/gallery', (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({
      json: {
        success: true,
        data: galleryRecords,
      },
    })
  })
  await page.route('**/api/gallery/*', (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback()

    const recordId = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() || '')
    deletedGalleryIds.push(recordId)
    galleryRecords = galleryRecords.filter((record) => record.id !== recordId)

    return route.fulfill({
      json: {
        success: true,
        data: {
          id: recordId,
        },
      },
    })
  })

  return {
    deletedGalleryIds,
    getGalleryRecords: () => galleryRecords,
  }
}

test('已登录用户删除云端图库后，刷新和重新同步不会复现且个人资料数量同步更新', async ({ page }) => {
  const galleryMock = await setupAuthenticatedGalleryMocks(page)

  await page.goto('/profile')
  await expect(page.getByRole('heading', { name: authUser.name })).toBeVisible()
  await expect(page.locator('.profile-stats article').filter({ hasText: '图库作品' }).locator('strong')).toHaveText('2')

  await page.goto('/my-invites')
  await expect(page.getByRole('heading', { name: '我的邀请' })).toBeVisible()
  await expect(page.getByText('E2E-INVITE')).toBeVisible()
  await expect(page.getByText('friend@example.com')).toBeVisible()

  await page.goto('/generate')
  await page.getByRole('button', { name: /我的图库/ }).click()
  await expect(page.getByRole('heading', { name: '我的图库' })).toBeVisible()
  await expect(page.getByText('第一张云端测试图')).toBeVisible()
  await expect(page.getByText('第二张云端测试图')).toBeVisible()

  const firstGalleryCard = page.locator('.gallery-card').filter({ hasText: '第一张云端测试图' })
  const deleteRequest = page.waitForRequest(
    (request) => request.method() === 'DELETE' && request.url().includes('/api/gallery/cloud-gallery-1'),
  )
  await firstGalleryCard.getByRole('button', { name: '删除记录' }).click()
  await deleteRequest

  await expect(firstGalleryCard).toHaveCount(0)
  await expect(page.getByText('已从图库移除，刷新后不会再显示')).toBeVisible()
  await expect.poll(() => galleryMock.deletedGalleryIds).toEqual(['cloud-gallery-1'])
  expect(galleryMock.getGalleryRecords()).toHaveLength(1)

  await page.reload()
  await page.getByRole('button', { name: /我的图库/ }).click()
  await expect(page.getByText('第一张云端测试图')).toHaveCount(0)
  await expect(page.getByText('第二张云端测试图')).toBeVisible()

  await page.evaluate(() => {
    localStorage.removeItem('gptImage2DeletedGalleryIds')
    localStorage.removeItem('gptImage2Gallery')
  })
  await page.reload()
  await page.getByRole('button', { name: /我的图库/ }).click()
  await expect(page.getByText('第一张云端测试图')).toHaveCount(0)
  await expect(page.getByText('第二张云端测试图')).toBeVisible()

  await page.goto('/profile')
  await expect(page.locator('.profile-stats article').filter({ hasText: '图库作品' }).locator('strong')).toHaveText('1')
})
