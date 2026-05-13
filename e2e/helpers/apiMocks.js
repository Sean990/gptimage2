export const sitePayload = {
  success: true,
  data: {
    billingEnabled: true,
    usageCosts: {
      reversePrompt: { credits: 2 },
      promptOptimize: { credits: 1, dailyFreeQuota: 3 },
      imageGeneration: {
        textToImageBase: 3,
        imageToImageBase: 4,
        editBase: 5,
        highQualityExtra: 2,
        billingTip: '图片生成成功后扣除积分。',
      },
    },
    pricingModes: {
      monthly: {
        label: '月度积分',
        plans: [
          {
            name: '专业月卡',
            oldPrice: '￥99.9',
            price: '￥39.9',
            cycle: '/月',
            note: '适合稳定内容产出',
            badge: '推荐',
            cta: '选择方案',
            credits: 300,
            unit: '约 ￥0.13 / 积分',
            features: ['包含功能', '批量生成支持', '问题支持'],
          },
        ],
      },
    },
    rewardCredits: {
      profileCompletion: 20,
      profileCompletionRequirements: {
        minNameLength: 2,
        requireAvatar: true,
      },
    },
  },
}

export const guestMePayload = {
  success: false,
  message: 'unauthenticated',
}

export const galleryPayload = {
  success: true,
  data: [],
}

export const creditLedgerPayload = {
  success: true,
  data: {
    ledger: [],
  },
}

export const invitePayload = {
  success: true,
  data: {
    inviteCode: '',
    inviteLink: '',
    rewardCredits: 0,
    rewardRule: '',
    totalInvites: 0,
    paidInvites: 0,
    totalRewardCredits: 0,
    records: [],
  },
}

export async function setupDefaultApiMocks(page) {
  await page.route('**/api/site', (route) => route.fulfill({ json: sitePayload }))
  await page.route('**/api/me', (route) =>
    route.fulfill({
      status: 401,
      json: guestMePayload,
    }),
  )
  await page.route('**/api/gallery', (route) => route.fulfill({ json: galleryPayload }))
  await page.route('**/api/me/credits', (route) => route.fulfill({ json: creditLedgerPayload }))
  await page.route('**/api/me/invites', (route) => route.fulfill({ json: invitePayload }))
  await page.route('**/api/orders', (route) => route.fulfill({ json: { success: true, data: [] } }))
}
