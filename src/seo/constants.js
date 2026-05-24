export const SITE_NAME = 'ImgsGen'
export const SITE_LANGUAGE = 'zh-CN'
export const SITE_LOCALE = 'zh_CN'
export const DEFAULT_SITE_URL = 'https://ai.imgsgen.cn'
export const DEFAULT_ROBOTS = 'index,follow,max-image-preview:large'
export const DEFAULT_OG_IMAGE_PATH = '/og-image.png'
export const DEFAULT_OG_IMAGE_WIDTH = 1200
export const DEFAULT_OG_IMAGE_HEIGHT = 630
export const DEFAULT_OG_IMAGE_ALT = 'ImgsGen AI 图片生成与编辑工作台'

export const DEFAULT_DESCRIPTION =
  'ImgsGen 是面向内容团队和创作者的 AI 图片生成与编辑工作台，覆盖提示词创作、参考图编辑、案例模板、积分管理和上线前检查提示。'

export const DEFAULT_TITLE = 'ImgsGen - AI 图片生成与编辑工作台'

export const DEFAULT_KEYWORDS = [
  'AI 图片生成',
  'AI 作图',
  '图片生成器',
  '提示词优化',
  'Prompt 优化',
  'AI 海报',
  '参考图编辑',
  '电商素材',
  SITE_NAME,
]

export const ROUTE_SEO = {
  home: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    breadcrumb: '首页',
    pageType: 'WebPage',
    changefreq: 'weekly',
    priority: '1.0',
  },
  generate: {
    title: 'AI 图片生成 - 文生图、参考图编辑与批量出图 | ImgsGen',
    description:
      '使用 ImgsGen 生成 AI 图片：输入提示词或上传已授权参考图，支持文生图、图生图、局部编辑、批量出图和上线前检查提示。',
    breadcrumb: 'AI 图片生成',
    pageType: 'WebApplication',
    changefreq: 'weekly',
    priority: '0.9',
  },
  promptOptimizer: {
    title: 'AI 提示词优化器 - 生成可直接修改的 Prompt 草稿 | ImgsGen',
    description:
      'ImgsGen 提示词优化器可把简短想法扩展为结构化 Prompt，覆盖主体、风格、镜头、光线、材质、限制条件和检查要点。',
    breadcrumb: 'Prompt 优化',
    pageType: 'WebApplication',
    changefreq: 'weekly',
    priority: '0.8',
  },
  pricing: {
    title: 'ImgsGen 积分说明 - AI 图片生成用量与套餐',
    description: '查看 ImgsGen 积分套餐、预计消耗、有效期和到账方式，按个人创作、稳定生产和团队交付选择合适用量。',
    breadcrumb: '积分说明',
    pageType: 'WebPage',
    changefreq: 'monthly',
    priority: '0.7',
  },
  myOrders: {
    title: '个人中心 | ImgsGen',
    description: 'ImgsGen 个人中心：查看订单、积分明细、邀请记录、图库数量和账户资料。',
    breadcrumb: '个人中心',
    robots: 'noindex,nofollow',
    sitemap: false,
  },
  myCredits: {
    title: '我的积分 | ImgsGen',
    description: '查看 ImgsGen 积分余额、到账记录、生成消耗和调整明细。',
    breadcrumb: '我的积分',
    robots: 'noindex,nofollow',
    sitemap: false,
  },
  myInvites: {
    title: '我的邀请 | ImgsGen',
    description: '查看 ImgsGen 邀请链接、已邀请好友与奖励发放记录。',
    breadcrumb: '我的邀请',
    robots: 'noindex,nofollow',
    sitemap: false,
  },
  profile: {
    title: '个人资料 | ImgsGen',
    description: '管理 ImgsGen 账户资料、头像、邮箱与安全设置。',
    breadcrumb: '个人资料',
    robots: 'noindex,nofollow',
    sitemap: false,
  },
  showcase: {
    title: 'AI 图片案例库 - Prompt 案例与工业模板 | ImgsGen',
    description: 'ImgsGen 案例库收录 AI 图片作品、完整 Prompt 和工业模板，涵盖人像、电商、海报、场景氛围与创意玩法。',
    breadcrumb: '案例库',
    pageType: 'CollectionPage',
    changefreq: 'weekly',
    priority: '0.8',
  },
  docs: {
    title: 'ImgsGen 文档 - 功能说明与使用指南',
    description: 'ImgsGen 使用文档，包含注册登录、图片生成、参考图编辑、提示词优化、图库管理、积分规则和安全边界。',
    breadcrumb: '使用文档',
    pageType: 'TechArticle',
    changefreq: 'monthly',
    priority: '0.6',
  },
  privacy: {
    title: '隐私政策 | ImgsGen',
    description: 'ImgsGen 隐私政策：说明我们如何收集、使用、保存、共享和保护用户数据，以及用户可行使的权利。',
    breadcrumb: '隐私政策',
    pageType: 'WebPage',
    changefreq: 'yearly',
    priority: '0.3',
  },
  terms: {
    title: '服务条款 | ImgsGen',
    description: 'ImgsGen 服务条款：说明平台使用规则、内容安全要求、知识产权约定、积分支付和责任边界。',
    breadcrumb: '服务条款',
    pageType: 'WebPage',
    changefreq: 'yearly',
    priority: '0.3',
  },
  notFound: {
    title: '页面未找到 | ImgsGen',
    description: '你访问的页面不存在或已被移除，返回首页继续使用 ImgsGen。',
    breadcrumb: '页面未找到',
    robots: 'noindex,follow',
    sitemap: false,
  },
}

export const SEO_ROUTES = [
  { path: '/', ...ROUTE_SEO.home },
  { path: '/generate', ...ROUTE_SEO.generate },
  { path: '/prompt-optimizer', ...ROUTE_SEO.promptOptimizer },
  { path: '/pricing', ...ROUTE_SEO.pricing },
  { path: '/showcase', ...ROUTE_SEO.showcase },
  { path: '/docs', ...ROUTE_SEO.docs },
  { path: '/privacy-policy', ...ROUTE_SEO.privacy },
  { path: '/terms-of-service', ...ROUTE_SEO.terms },
]

export const SITEMAP_ROUTES = SEO_ROUTES.filter((route) => route.sitemap !== false)

export function normalizeSiteUrl(value) {
  const normalized = String(value || DEFAULT_SITE_URL)
    .trim()
    .replace(/\/+$/, '')
  return normalized || DEFAULT_SITE_URL
}

export function ensureLeadingSlash(path = '/') {
  const normalizedPath =
    String(path || '/')
      .split('#')[0]
      .split('?')[0] || '/'
  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
}

export function absoluteUrl(path = '/', siteUrl = DEFAULT_SITE_URL) {
  const normalizedPath = String(path || '/')
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath
  return `${normalizeSiteUrl(siteUrl)}${ensureLeadingSlash(normalizedPath)}`
}
