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
      credits: {
        label: '轻量创作',
        plans: [
          {
            name: '新人专享',
            oldPrice: '￥9.9',
            price: '￥4.9',
            cycle: '限购一次',
            note: '注册后的首单试用价',
            badge: '新人',
            cta: '前往购买',
            buyUrl: 'https://pay.ldxp.cn/shop/imgsgen',
            credits: 80,
            unit: '约 ￥0.061 / 积分',
            firstPurchaseOnly: true,
            features: ['80 积分到账，可用于 80 张标准文生图', '新用户首单限购一次', '生成失败不扣积分'],
          },
          {
            name: '体验包',
            oldPrice: '￥19.9',
            price: '￥9.9',
            cycle: '即买即用',
            note: '小额试用，先看效果',
            badge: '',
            cta: '前往购买',
            buyUrl: 'https://pay.ldxp.cn/shop/imgsgen',
            credits: 170,
            unit: '约 ￥0.058 / 积分',
            features: ['170 积分到账，可用于 170 张标准文生图', '购买后 365 天内有效', '适合低门槛试水'],
          },
          {
            name: '轻量包',
            oldPrice: '￥29.9',
            price: '￥14.9',
            cycle: '即买即用',
            note: '补足轻量创作余量',
            badge: '轻量',
            cta: '前往购买',
            buyUrl: 'https://pay.ldxp.cn/shop/imgsgen',
            credits: 260,
            unit: '约 ￥0.057 / 积分',
            features: ['260 积分到账，可用于 260 张标准文生图', '购买后 365 天内有效', '比体验包多 90 积分余量'],
          },
        ],
      },
      monthly: {
        label: '高级创作',
        plans: [
          {
            name: '入门包',
            oldPrice: '￥39.9',
            price: '￥19.9',
            cycle: '即买即用',
            note: '适合日常持续生成',
            badge: '',
            cta: '前往购买',
            buyUrl: 'https://pay.ldxp.cn/shop/imgsgen',
            credits: 360,
            unit: '约 ￥0.055 / 积分',
            features: ['360 积分到账，可用于 360 张标准文生图', '购买后 365 天内有效', '支持批量生成'],
          },
          {
            name: '推荐包',
            oldPrice: '￥99.9',
            price: '￥39.9',
            cycle: '即买即用',
            note: '主推方案，适合稳定产出',
            badge: '推荐',
            cta: '前往购买',
            buyUrl: 'https://pay.ldxp.cn/shop/imgsgen',
            credits: 740,
            unit: '约 ￥0.054 / 积分',
            features: ['740 积分到账，可用于 740 张标准文生图', '购买后 365 天内有效', '优先问题支持'],
          },
          {
            name: '进阶包',
            oldPrice: '￥119.9',
            price: '￥49.9',
            cycle: '即买即用',
            note: '适合连续多项目产出',
            badge: '进阶',
            cta: '前往购买',
            buyUrl: 'https://pay.ldxp.cn/shop/imgsgen',
            credits: 950,
            unit: '约 ￥0.053 / 积分',
            features: ['950 积分到账，可用于 950 张标准文生图', '购买后 365 天内有效', '比推荐包多 210 积分余量'],
          },
        ],
      },
      yearly: {
        label: '专业创作',
        plans: [
          {
            name: '创作者包',
            oldPrice: '￥139.9',
            price: '￥69.9',
            cycle: '即买即用',
            note: '适合批量创作和商用草稿',
            badge: '',
            cta: '前往购买',
            buyUrl: 'https://pay.ldxp.cn/shop/imgsgen',
            credits: 1350,
            unit: '约 ￥0.052 / 积分',
            features: ['1350 积分到账，可用于 1350 张标准文生图', '购买后 365 天内有效', '技术支持'],
          },
          {
            name: '优选包',
            oldPrice: '￥199.9',
            price: '￥99.9',
            cycle: '即买即用',
            note: '低至约 5.1 分一张',
            badge: '优选',
            cta: '前往购买',
            buyUrl: 'https://pay.ldxp.cn/shop/imgsgen',
            credits: 1950,
            unit: '约 ￥0.051 / 积分',
            features: ['1950 积分到账，可用于 1950 张标准文生图', '购买后 365 天内有效', '更适合持续批量使用'],
          },
          {
            name: '团队包',
            oldPrice: '￥399',
            price: '￥199',
            cycle: '即买即用',
            note: '低至约 5.0 分一张',
            badge: '最低单价',
            cta: '前往购买',
            buyUrl: 'https://pay.ldxp.cn/shop/imgsgen',
            credits: 3950,
            unit: '约 ￥0.050 / 积分',
            features: ['3950 积分到账，可用于 3950 张标准文生图', '购买后 365 天内有效', '当前最低单张价格'],
          },
        ],
      },
    },
    rewardCredits: {
      signup: 30,
      invite: 10,
      invitee: 10,
      inviteRuleDescription: '邀请好友完成首次图片生成，双方各得 10 积分。',
      profileCompletion: 0,
      profileCompletionRequirements: {
        minNameLength: 2,
        requireAvatar: false,
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

export async function acceptRegionNotice(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('imgsgen-region-notice-accepted-v1', 'accepted')
    } catch {
      /* noop */
    }
  })
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
