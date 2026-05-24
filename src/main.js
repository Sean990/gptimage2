import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import './assets/main.css'
import './assets/components.css'
import './assets/lazy-image.css'
import './assets/layout.css'
import './assets/responsive.css'
import './assets/dark.css'
import './assets/polish.css'
import './assets/responsive-late.css'
import './assets/mobile-tuning.css'
import { ROUTE_SEO } from './seo/constants.js'
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
    meta: ROUTE_SEO.home,
  },
  {
    path: '/generate',
    name: 'generate',
    component: GenerateView,
    meta: ROUTE_SEO.generate,
  },
  { path: '/batch-generate', redirect: '/generate' },
  {
    path: '/prompt-optimizer',
    name: 'prompt-optimizer',
    component: PromptOptimizerView,
    meta: ROUTE_SEO.promptOptimizer,
  },
  {
    path: '/pricing',
    name: 'pricing',
    component: PricingView,
    meta: ROUTE_SEO.pricing,
  },
  {
    path: '/my-orders',
    name: 'my-orders',
    component: MyOrdersView,
    meta: ROUTE_SEO.myOrders,
  },
  {
    path: '/my-credits',
    name: 'my-credits',
    component: MyOrdersView,
    meta: ROUTE_SEO.myCredits,
  },
  {
    path: '/my-invites',
    name: 'my-invites',
    component: MyOrdersView,
    meta: ROUTE_SEO.myInvites,
  },
  {
    path: '/profile',
    name: 'profile',
    component: MyOrdersView,
    meta: ROUTE_SEO.profile,
  },
  {
    path: '/showcase',
    name: 'showcase',
    component: ShowcaseView,
    meta: ROUTE_SEO.showcase,
  },
  { path: '/tutorial', redirect: '/showcase' },
  {
    path: '/docs',
    name: 'docs',
    component: DocsView,
    meta: ROUTE_SEO.docs,
  },
  { path: '/posts', redirect: '/showcase' },
  { path: '/posts/:slug', redirect: '/showcase' },
  {
    path: '/privacy-policy',
    name: 'privacy',
    component: LegalView,
    props: { type: 'privacy' },
    meta: ROUTE_SEO.privacy,
  },
  {
    path: '/terms-of-service',
    name: 'terms',
    component: LegalView,
    props: { type: 'terms' },
    meta: ROUTE_SEO.terms,
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
    meta: ROUTE_SEO.notFound,
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
