import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/main.css'

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
  { path: '/', name: 'home', component: HomeView, meta: { title: 'ImgsGen - AI 图片生成与编辑平台' } },
  { path: '/generate', name: 'generate', component: GenerateView, meta: { title: 'AI 图片生成 - 提示词与参考图创作工具 | ImgsGen' } },
  { path: '/batch-generate', redirect: '/generate' },
  { path: '/prompt-optimizer', name: 'prompt-optimizer', component: PromptOptimizerView, meta: { title: 'AI 提示词优化器 - 生成可复核 Prompt 草稿 | ImgsGen' } },
  { path: '/pricing', name: 'pricing', component: PricingView, meta: { title: 'ImgsGen 定价 - AI 图片生成积分与套餐' } },
  { path: '/my-orders', name: 'my-orders', component: MyOrdersView, meta: { title: '个人中心 | ImgsGen' } },
  { path: '/my-credits', name: 'my-credits', component: MyOrdersView, meta: { title: '我的积分 | ImgsGen' } },
  { path: '/my-invites', name: 'my-invites', component: MyOrdersView, meta: { title: '我的邀请 | ImgsGen' } },
  { path: '/profile', name: 'profile', component: MyOrdersView, meta: { title: '个人资料 | ImgsGen' } },
  { path: '/showcase', name: 'showcase', component: ShowcaseView, meta: { title: 'AI 图片案例库 - 学习提示词结构与模板 | ImgsGen' } },
  { path: '/tutorial', redirect: '/showcase' },
  { path: '/docs', name: 'docs', component: DocsView, meta: { title: 'ImgsGen 文档' } },
  { path: '/posts', redirect: '/showcase' },
  { path: '/posts/:slug', redirect: '/showcase' },
  { path: '/privacy-policy', name: 'privacy', component: LegalView, props: { type: 'privacy' }, meta: { title: '隐私政策 | ImgsGen' } },
  { path: '/terms-of-service', name: 'terms', component: LegalView, props: { type: 'terms' }, meta: { title: '服务条款 | ImgsGen' } },
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
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { title: '页面未找到 | ImgsGen' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, top: 88, behavior: 'smooth' }
    }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  document.title = to.meta.title || 'ImgsGen'
})

createApp(App).use(router).mount('#app')
