import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import './assets/main.css'
import './assets/components.css'
import './assets/layout.css'
import './assets/responsive.css'
import './assets/dark.css'
import './assets/polish.css'
import './assets/responsive-late.css'
import './assets/mobile-tuning.css'
import { DEFAULT_DESCRIPTION } from './seo/constants.js'
import { initWebVitals } from './services/webVitals.js'

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
      title: 'ImgsGen - AI 图片生成与编辑工作台',
      description: DEFAULT_DESCRIPTION,
    },
  },
  {
    path: '/generate',
    name: 'generate',
    component: GenerateView,
    meta: {
      title: 'AI 图片生成 - 文生图、参考图编辑与批量出图 | ImgsGen',
      description:
        '使用 ImgsGen 生成 AI 图片：输入提示词或上传已授权参考图，支持文生图、图生图、局部编辑、批量出图和上线前检查提示。',
    },
  },
  { path: '/batch-generate', redirect: '/generate' },
  {
    path: '/prompt-optimizer',
    name: 'prompt-optimizer',
    component: PromptOptimizerView,
    meta: {
      title: 'AI 提示词优化器 - 生成可直接修改的 Prompt 草稿 | ImgsGen',
      description:
        'ImgsGen 提示词优化器可把简短想法扩展为结构化 Prompt，覆盖主体、风格、镜头、光线、材质、限制条件和检查要点。',
    },
  },
  {
    path: '/pricing',
    name: 'pricing',
    component: PricingView,
    meta: {
      title: 'ImgsGen 积分说明 - AI 图片生成用量与套餐',
      description: '查看 ImgsGen 积分套餐、预计消耗、有效期和到账方式，按个人创作、稳定生产和团队交付选择合适用量。',
    },
  },
  {
    path: '/my-orders',
    name: 'my-orders',
    component: MyOrdersView,
    meta: {
      title: '个人中心 | ImgsGen',
      description: 'ImgsGen 个人中心：查看订单、积分明细、邀请记录、图库数量和账户资料。',
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
      description: '查看 ImgsGen 积分余额、到账记录、生成消耗和调整明细。',
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
      title: 'AI 图片案例库 - Prompt 案例与工业模板 | ImgsGen',
      description: 'ImgsGen 案例库收录 AI 图片作品、完整 Prompt 和工业模板，涵盖人像、电商、海报、场景氛围与创意玩法。',
    },
  },
  { path: '/tutorial', redirect: '/showcase' },
  {
    path: '/docs',
    name: 'docs',
    component: DocsView,
    meta: {
      title: 'ImgsGen 文档 - 功能说明与使用指南',
      description: 'ImgsGen 使用文档，包含注册登录、图片生成、参考图编辑、提示词优化、图库管理、积分规则和安全边界。',
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
      description: 'ImgsGen 隐私政策：说明我们如何收集、使用、保存、共享和保护用户数据，以及用户可行使的权利。',
    },
  },
  {
    path: '/terms-of-service',
    name: 'terms',
    component: LegalView,
    props: { type: 'terms' },
    meta: {
      title: '服务条款 | ImgsGen',
      description: 'ImgsGen 服务条款：说明平台使用规则、内容安全要求、知识产权约定、积分支付和责任边界。',
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
      description: '你访问的页面不存在或已被移除，返回首页继续使用 ImgsGen。',
      robots: 'noindex,follow',
      prerender: false,
    },
  },
]

export const createApp = ViteSSG(
  App,
  {
    routes,
    scrollBehavior(to) {
      if (to.hash) {
        return { el: to.hash, top: 88, behavior: 'smooth' }
      }
      return { top: 0 }
    },
  },
  ({ app, isClient }) => {
    const fadeUpDirective = {
      getSSRProps() {
        return {}
      },
    }

    if (isClient) {
      initWebVitals()

      const observer =
        typeof IntersectionObserver === 'undefined'
          ? null
          : new IntersectionObserver(
              (entries) => {
                entries.forEach((entry) => {
                  if (entry.isIntersecting) {
                    entry.target.classList.add('in-view')
                    observer.unobserve(entry.target)
                    // 动画完成后释放 will-change，减少不必要的图层占用
                    const delay = parseFloat(entry.target.style.transitionDelay) || 0
                    const duration = 800 + delay
                    setTimeout(() => {
                      entry.target.style.willChange = 'auto'
                    }, duration + 100)
                  }
                })
              },
              { threshold: 0.08 },
            )

      Object.assign(fadeUpDirective, {
        mounted(el, binding) {
          el.classList.add('fade-up')
          const delay = binding.value?.delay
          if (Number.isFinite(delay)) {
            el.style.transitionDelay = `${delay}ms`
          }
          if (!observer) {
            el.classList.add('in-view')
            el.style.willChange = 'auto'
            return
          }
          setTimeout(() => {
            observer.observe(el)
          }, 50)
        },
        unmounted(el) {
          observer?.unobserve(el)
          el.style.transitionDelay = ''
          el.style.willChange = ''
        },
      })
    }

    app.directive('fade-up', fadeUpDirective)
  },
)
