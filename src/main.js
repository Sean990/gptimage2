import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/main.css'

const HomeView = () => import('./views/HomeView.vue')
const GenerateView = () => import('./views/GenerateView.vue')
const PromptOptimizerView = () => import('./views/PromptOptimizerView.vue')
const PricingView = () => import('./views/PricingView.vue')
const ShowcaseView = () => import('./views/ShowcaseView.vue')
const DocsView = () => import('./views/DocsView.vue')
const LegalView = () => import('./views/LegalView.vue')
const NotFoundView = () => import('./views/NotFoundView.vue')

const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { title: 'GPT Image 2 - AI 图片生成与编辑平台' } },
  { path: '/generate', name: 'generate', component: GenerateView, meta: { title: 'AI 图生图 - 用提示词和参考图快速生成图片 | GPT Image 2' } },
  { path: '/prompt-optimizer', name: 'prompt-optimizer', component: PromptOptimizerView, meta: { title: 'AI 提示词优化器 - 一键优化 Prompt | GPT Image 2' } },
  { path: '/pricing', name: 'pricing', component: PricingView, meta: { title: 'GPT Image 2 定价 - AI 图片生成积分与套餐' } },
  { path: '/showcase', name: 'showcase', component: ShowcaseView, meta: { title: 'AI 图片案例展示 - 查看真实提示词和生成效果 | GPT Image 2' } },
  { path: '/tutorial', redirect: '/showcase' },
  { path: '/docs', name: 'docs', component: DocsView, meta: { title: 'GPT Image 2 文档' } },
  { path: '/posts', redirect: '/showcase' },
  { path: '/posts/:slug', redirect: '/showcase' },
  { path: '/privacy-policy', name: 'privacy', component: LegalView, props: { type: 'privacy' }, meta: { title: '隐私政策 | GPT Image 2' } },
  { path: '/terms-of-service', name: 'terms', component: LegalView, props: { type: 'terms' }, meta: { title: '服务条款 | GPT Image 2' } },
  { path: '/zh', redirect: '/' },
  { path: '/zh/generate', redirect: '/generate' },
  { path: '/zh/prompt-optimizer', redirect: '/prompt-optimizer' },
  { path: '/zh/pricing', redirect: '/pricing' },
  { path: '/zh/showcase', redirect: '/showcase' },
  { path: '/zh/tutorial', redirect: '/showcase' },
  { path: '/zh/docs', redirect: '/docs' },
  { path: '/zh/posts', redirect: '/showcase' },
  { path: '/zh/posts/:slug', redirect: '/showcase' },
  { path: '/zh/privacy-policy', redirect: '/privacy-policy' },
  { path: '/zh/terms-of-service', redirect: '/terms-of-service' },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { title: '页面未找到 | GPT Image 2' } },
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
  document.title = to.meta.title || 'GPT Image 2'
})

createApp(App).use(router).mount('#app')
