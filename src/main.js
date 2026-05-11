import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import './assets/main.css'
import { DEFAULT_DESCRIPTION } from './seo/constants.js'

const HomeView = () => import('./views/HomeView.vue')
const GenerateView = () => import('./views/GenerateView.vue')
const PromptOptimizerView = () => import('./views/PromptOptimizerView.vue')
const PricingView = () => import('./views/PricingView.vue')
const MyOrdersView = () => import('./views/MyOrdersView.vue')
const ShowcaseView = () => import('./views/ShowcaseView.vue')
const DocsView = () => import('./views/DocsView.vue')
const LegalView = () => import('./views/LegalView.vue')
const NotFoundView = () => import('./views/NotFoundView.vue')

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      title: 'ImgsGen - AI 图片生成与编辑平台',
      description: DEFAULT_DESCRIPTION,
    },
  },
  {
    path: '/generate',
    name: 'generate',
    component: GenerateView,
    meta: {
      title: 'AI 图片生成 - 提示词与参考图创作工具 | ImgsGen',
      description: '使用 ImgsGen 生成 AI 图片：输入提示词或上传授权参考图，支持文生图、图生图、局部编辑、批量出图与发布前人工复核。',
    },
  },
  { path: '/batch-generate', redirect: '/generate' },
  {
    path: '/prompt-optimizer',
    name: 'prompt-optimizer',
    component: PromptOptimizerView,
    meta: {
      title: 'AI 提示词优化器 - 生成可复核 Prompt 草稿 | ImgsGen',
      description: 'ImgsGen 提示词优化器可将简短想法扩展为结构化的 AI 作图 Prompt，覆盖主体、风格、镜头、光线、材质与合规要点。',
    },
  },
  {
    path: '/pricing',
    name: 'pricing',
    component: PricingView,
    meta: {
      title: 'ImgsGen 积分说明 - AI 图片生成积分与套餐',
      description: 'ImgsGen 提供体验包、超值包和专业年卡等积分套餐，按张消耗、发票开具、团队协作与商用合规提示一目了然。',
    },
  },
  {
    path: '/my-orders',
    name: 'my-orders',
    component: MyOrdersView,
    meta: {
      title: '个人中心 | ImgsGen',
      description: 'ImgsGen 个人中心：查看订单、积分明细、邀请记录和账户信息。',
      robots: 'noindex,nofollow',
      prerender: false,
    },
  },
  {
    path: '/my-credits',
    name: 'my-credits',
    component: MyOrdersView,
    meta: {
      title: '我的积分 | ImgsGen',
      description: '查看 ImgsGen 积分余额、消耗记录与充值明细。',
      robots: 'noindex,nofollow',
      prerender: false,
    },
  },
  {
    path: '/my-invites',
    name: 'my-invites',
    component: MyOrdersView,
    meta: {
      title: '我的邀请 | ImgsGen',
      description: '查看 ImgsGen 邀请链接、已邀请好友与奖励发放记录。',
      robots: 'noindex,nofollow',
      prerender: false,
    },
  },
  {
    path: '/profile',
    name: 'profile',
    component: MyOrdersView,
    meta: {
      title: '个人资料 | ImgsGen',
      description: '管理 ImgsGen 账户资料、头像、邮箱与安全设置。',
      robots: 'noindex,nofollow',
      prerender: false,
    },
  },
  {
    path: '/showcase',
    name: 'showcase',
    component: ShowcaseView,
    meta: {
      title: 'AI 图片案例库 - 学习提示词结构与模板 | ImgsGen',
      description: 'ImgsGen 案例库精选 AI 图片作品与对应提示词模板，涵盖人像、电商、海报、场景氛围与创意玩法，便于快速复用。',
    },
  },
  { path: '/tutorial', redirect: '/showcase' },
  {
    path: '/docs',
    name: 'docs',
    component: DocsView,
    meta: {
      title: 'ImgsGen 文档 - 功能说明与使用指南',
      description: 'ImgsGen 使用文档，包含功能说明、提示词写法、积分规则、合规要点与常见问题解答。',
    },
  },
  { path: '/posts', redirect: '/showcase' },
  { path: '/posts/:slug', redirect: '/showcase' },
  {
    path: '/privacy-policy',
    name: 'privacy',
    component: LegalView,
    props: { type: 'privacy' },
    meta: {
      title: '隐私政策 | ImgsGen',
      description: 'ImgsGen 隐私政策：说明我们收集、使用、存储和保护用户数据的方式，以及用户可以行使的权利。',
    },
  },
  {
    path: '/terms-of-service',
    name: 'terms',
    component: LegalView,
    props: { type: 'terms' },
    meta: {
      title: '服务条款 | ImgsGen',
      description: 'ImgsGen 服务条款：使用平台需遵守的规则、内容合规要求、知识产权约定与责任限制说明。',
    },
  },
  { path: '/zh', redirect: '/' },
  { path: '/zh/generate', redirect: '/generate' },
  { path: '/zh/batch-generate', redirect: '/generate' },
  { path: '/zh/prompt-optimizer', redirect: '/prompt-optimizer' },
  { path: '/zh/pricing', redirect: '/pricing' },
  { path: '/zh/my-orders', redirect: '/my-orders' },
  { path: '/zh/my-credits', redirect: '/my-credits' },
  { path: '/zh/my-invites', redirect: '/my-invites' },
  { path: '/zh/profile', redirect: '/profile' },
  { path: '/zh/showcase', redirect: '/showcase' },
  { path: '/zh/tutorial', redirect: '/showcase' },
  { path: '/zh/docs', redirect: '/docs' },
  { path: '/zh/posts', redirect: '/showcase' },
  { path: '/zh/posts/:slug', redirect: '/showcase' },
  { path: '/zh/privacy-policy', redirect: '/privacy-policy' },
  { path: '/zh/terms-of-service', redirect: '/terms-of-service' },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: {
      title: '页面未找到 | ImgsGen',
      description: '您访问的页面不存在或已被移除，回到首页继续使用 ImgsGen。',
      robots: 'noindex,follow',
      prerender: false,
    },
  },
]

export const createApp = ViteSSG(App, {
  routes,
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, top: 88, behavior: 'smooth' }
    }
    return { top: 0 }
  },
})
