<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CheckCircle2, Image, LogIn, Menu, Moon, Sun, X } from 'lucide-vue-next'
import { api } from '../services/api'
import { useSiteStore } from '../services/siteStore'

const route = useRoute()
const { siteData, loadSiteData } = useSiteStore()
const open = ref(false)
const loginOpen = ref(false)
const email = ref('')
const loginMessage = ref('')
const loginLoading = ref(false)
const scrolled = ref(false)
const activeSection = ref('')
const theme = ref('light')
let themeMedia = null

const navItems = [
  { label: 'AI 生图', to: '/generate', path: '/generate' },
  { label: '提示词优化', to: '/prompt-optimizer', path: '/prompt-optimizer' },
  { label: '功能亮点', to: '/#feature', path: '/', hash: '#feature' },
  { label: '定价', to: '/pricing', path: '/pricing' },
  { label: '常见问题', to: '/#faq', path: '/', hash: '#faq' },
  { label: '案例', to: '/showcase', path: '/showcase' },
]

const loginDisabled = computed(() => !email.value.includes('@') || email.value.length < 6)
const isDark = computed(() => theme.value === 'dark')

function isActive(item) {
  if (item.hash) return route.path === item.path && activeSection.value === item.hash
  return route.path === item.path
}

function openLogin() {
  loginOpen.value = true
  open.value = false
  loginMessage.value = ''
  document.body.classList.add('no-scroll')
}

function closeLogin() {
  loginOpen.value = false
  document.body.classList.remove('no-scroll')
}

function applyTheme(nextTheme) {
  theme.value = nextTheme
  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme
}

function toggleTheme() {
  const nextTheme = isDark.value ? 'light' : 'dark'
  localStorage.setItem('theme', nextTheme)
  applyTheme(nextTheme)
}

function syncSystemTheme(event) {
  if (localStorage.getItem('theme')) return
  applyTheme(event.matches ? 'dark' : 'light')
}

async function submitLogin() {
  if (loginDisabled.value) {
    loginMessage.value = '请输入有效邮箱地址'
    return
  }

  loginLoading.value = true
  try {
    const result = await api.login(email.value)
    localStorage.setItem('token', result.token)
    loginMessage.value = `${result.user.name} 已登录，图库和套餐状态会在后端同步`
    window.setTimeout(closeLogin, 900)
  } catch (error) {
    loginMessage.value = error.message || '登录失败，请稍后重试'
  } finally {
    loginLoading.value = false
  }
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    open.value = false
    closeLogin()
  }
}

function onScroll() {
  scrolled.value = window.scrollY > 12
  updateActiveSection()
}

function updateActiveSection() {
  if (route.path !== '/') {
    activeSection.value = ''
    return
  }

  const sectionIds = ['feature', 'faq']
  const viewportFocusY = Math.min(window.innerHeight * 0.42, 420)
  const current = sectionIds.reduce((active, id) => {
    const sections = [
      document.getElementById(id),
      ...document.querySelectorAll(`[data-nav-section="${id}"]`),
    ].filter(Boolean)

    return sections.reduce((sectionActive, section) => {
      const rect = section.getBoundingClientRect()
      if (rect.top <= viewportFocusY && rect.bottom > viewportFocusY) return `#${id}`
      return rect.top <= viewportFocusY ? `#${id}` : sectionActive
    }, active)
  }, '')

  activeSection.value = current
}

watch(
  () => route.fullPath,
  () => {
    open.value = false
    window.requestAnimationFrame(updateActiveSection)
  },
)

onMounted(() => {
  loadSiteData()
  themeMedia = window.matchMedia('(prefers-color-scheme: dark)')
  applyTheme(localStorage.getItem('theme') || (themeMedia.matches ? 'dark' : 'light'))
  themeMedia.addEventListener('change', syncSystemTheme)
  onScroll()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  document.body.classList.remove('no-scroll')
  themeMedia?.removeEventListener('change', syncSystemTheme)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <a class="skip-link" href="#main-content">跳到正文</a>
  <header class="site-header" :class="{ 'is-scrolled': scrolled }">
    <div class="nav-shell">
      <RouterLink class="brand" to="/" aria-label="GPT Image 2 首页">
        <img :src="siteData.assets.logo" alt="GPT Image 2 - AI 图片生成平台" />
        <span>GPT Image 2</span>
      </RouterLink>

      <nav class="main-nav" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          :class="{ active: isActive(item) }"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="header-actions">
        <button
          class="icon-button"
          type="button"
          :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
          :aria-pressed="isDark"
          @click="toggleTheme"
        >
          <Sun v-if="isDark" aria-hidden="true" />
          <Moon v-else aria-hidden="true" />
        </button>
        <button class="btn btn-soft" type="button" @click="openLogin">
          <LogIn aria-hidden="true" />
          登录
        </button>
        <button
          class="icon-button mobile-toggle"
          type="button"
          aria-controls="mobile-menu"
          :aria-expanded="open"
          :aria-label="open ? '关闭菜单' : '打开菜单'"
          @click="open = !open"
        >
          <X v-if="open" aria-hidden="true" />
          <Menu v-else aria-hidden="true" />
        </button>
      </div>
    </div>

    <nav v-if="open" id="mobile-menu" class="mobile-panel" aria-label="移动端导航">
      <RouterLink
        v-for="item in navItems"
        :key="item.label"
        :to="item.to"
        :class="{ active: isActive(item) }"
      >
        {{ item.label }}
      </RouterLink>
      <button type="button" @click="openLogin">登录</button>
    </nav>
  </header>

  <Teleport to="body">
    <div
      v-if="loginOpen"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      @click.self="closeLogin"
    >
      <div class="modal-card">
        <div class="modal-head">
          <h2 id="login-title">登录 GPT Image 2</h2>
          <button class="icon-button" type="button" aria-label="关闭登录弹窗" @click="closeLogin">
            <X aria-hidden="true" />
          </button>
        </div>
        <p>复刻版使用本地演示登录流程。输入邮箱即可模拟同步图库、套餐和生成记录。</p>
        <form @submit.prevent="submitLogin">
          <div class="field">
            <label for="email">邮箱</label>
            <input
              id="email"
              v-model.trim="email"
              type="email"
              placeholder="name@example.com"
              autocomplete="email"
              required
            />
          </div>
          <p v-if="loginMessage" class="form-message" aria-live="polite">
            <CheckCircle2 aria-hidden="true" />
            {{ loginMessage }}
          </p>
          <button class="btn btn-primary" type="submit" :disabled="loginDisabled || loginLoading">
            <Image aria-hidden="true" />
            {{ loginLoading ? '登录中...' : '继续' }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>
