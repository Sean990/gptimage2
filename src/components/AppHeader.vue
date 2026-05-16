<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Images, LogIn, LogOut, Menu, Moon, Sun, X } from 'lucide-vue-next'
import AuthModal from './AuthModal.vue'
import { resolveApiUrl } from '../services/api'
import { useAuthStore } from '../services/authStore'
import { useSiteStore } from '../services/siteStore'

const route = useRoute()
const auth = useAuthStore()
const { siteData, loadSiteData } = useSiteStore()
const open = ref(false)
const accountMenuOpen = ref(false)
const accountMenuRef = ref(null)
const loginOpen = ref(false)
const authInitialMode = ref('login')
const loginReturnFocusEl = ref(null)
const scrolled = ref(false)
const activeSection = ref('')
const theme = ref('light')
let themeMedia = null
let inviteRegisterOpened = false
const inviteStorageKey = 'imgsgen:invite-code'
const storedInviteCode = ref('')

const navItems = [
  { label: '图片生成', to: '/generate', path: '/generate' },
  { label: 'AI 视频', soon: true },
  { label: 'Prompt 优化', to: '/prompt-optimizer', path: '/prompt-optimizer' },
  { label: '核心能力', to: '/#feature', path: '/', hash: '#feature' },
  { label: '积分方案', to: '/pricing', path: '/pricing' },
  { label: 'FAQ', to: '/#faq', path: '/', hash: '#faq' },
  { label: '案例库', to: '/showcase', path: '/showcase' },
]
const billingEnabled = computed(() => Boolean(siteData.value.billingEnabled))
const visibleNavItems = computed(() => navItems.filter((item) => item.path !== '/pricing' || billingEnabled.value))

const routeInviteCode = computed(() => {
  const rawCode = route.query.inviteCode ?? route.query.invite ?? ''
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode
  return String(code || '').trim()
})
const boundInviteCode = computed(() => routeInviteCode.value || storedInviteCode.value)
const isDark = computed(() => theme.value === 'dark')
const currentUser = computed(() => auth.user.value)
const currentUserAvatarUrl = computed(() => resolveApiUrl(currentUser.value?.avatarUrl || ''))
const isAuthenticated = computed(() => auth.isAuthenticated.value)
const userInitial = computed(() =>
  (currentUser.value?.name || currentUser.value?.email || 'U').trim().slice(0, 1).toUpperCase(),
)

function isActive(item) {
  if (item.soon) return false
  if (item.path === '/my-orders') return ['/my-orders', '/my-credits', '/my-invites', '/profile'].includes(route.path)
  if (item.hash) return route.path === item.path && activeSection.value === item.hash
  return route.path === item.path
}

function openAuthModal(mode = 'login') {
  authInitialMode.value = mode
  loginReturnFocusEl.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
  loginOpen.value = true
  open.value = false
}

function openLogin() {
  openAuthModal('login')
}

function onAuthExpired() {
  openAuthModal('login')
}

function openRegister() {
  openAuthModal('register')
}

function readStoredInviteCode() {
  if (typeof localStorage === 'undefined') return ''
  return String(localStorage.getItem(inviteStorageKey) || '').trim()
}

function persistInviteCode(code) {
  const normalizedCode = String(code || '').trim()
  if (!normalizedCode) return

  storedInviteCode.value = normalizedCode
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(inviteStorageKey, normalizedCode)
}

function syncInviteCodeFromRoute() {
  if (routeInviteCode.value) {
    persistInviteCode(routeInviteCode.value)
    return
  }

  storedInviteCode.value = readStoredInviteCode()
}

function maybeOpenInviteRegister() {
  if (!routeInviteCode.value || isAuthenticated.value || inviteRegisterOpened || loginOpen.value) return

  inviteRegisterOpened = true
  loginReturnFocusEl.value = null
  openRegister()
}

function closeLogin() {
  loginOpen.value = false
}

function applyTheme(nextTheme) {
  theme.value = nextTheme
  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme
}

function toggleTheme(event) {
  const nextTheme = isDark.value ? 'light' : 'dark'
  localStorage.setItem('theme', nextTheme)

  const button = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const startTransition = document.startViewTransition?.bind(document)

  if (!startTransition || reduceMotion || !button) {
    applyTheme(nextTheme)
    return
  }

  const rect = button.getBoundingClientRect()
  const originX = rect.left + rect.width / 2
  const originY = rect.top + rect.height / 2
  const endRadius = Math.hypot(
    Math.max(originX, window.innerWidth - originX),
    Math.max(originY, window.innerHeight - originY),
  )
  const isToLight = nextTheme === 'light'
  const direction = isToLight ? 'to-light' : 'to-dark'
  const root = document.documentElement

  root.dataset.themeAnim = direction

  const transition = startTransition(() => {
    applyTheme(nextTheme)
  })

  transition.ready
    .then(() => {
      const clipPath = [
        `circle(0px at ${originX}px ${originY}px)`,
        `circle(${endRadius}px at ${originX}px ${originY}px)`,
      ]
      root.animate(
        { clipPath: isToLight ? clipPath : [...clipPath].reverse() },
        {
          duration: 520,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: isToLight ? '::view-transition-new(root)' : '::view-transition-old(root)',
          fill: 'both',
        },
      )
    })
    .catch(() => {})

  transition.finished
    .catch(() => {})
    .finally(() => {
      if (root.dataset.themeAnim === direction) {
        delete root.dataset.themeAnim
      }
    })
}

function syncSystemTheme(event) {
  if (localStorage.getItem('theme')) return
  applyTheme(event.matches ? 'dark' : 'light')
}

async function logout() {
  await auth.logout()
  open.value = false
  accountMenuOpen.value = false
}

function toggleAccountMenu() {
  accountMenuOpen.value = !accountMenuOpen.value
  open.value = false
}

function closeAccountMenu() {
  accountMenuOpen.value = false
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    open.value = false
    accountMenuOpen.value = false
  }
}

function onScroll() {
  scrolled.value = window.scrollY > 12
  updateActiveSection()
}

function lockBodyScroll() {
  document.body.classList.add('mobile-menu-open')
}

function unlockBodyScroll() {
  document.body.classList.remove('mobile-menu-open')
}

watch(open, (next) => {
  if (typeof document === 'undefined') return
  if (next) lockBodyScroll()
  else unlockBodyScroll()
})

function onDocumentClick(event) {
  if (!accountMenuOpen.value) return
  if (accountMenuRef.value?.contains(event.target)) return
  accountMenuOpen.value = false
}

function updateActiveSection() {
  if (route.path !== '/') {
    activeSection.value = ''
    return
  }

  const sectionIds = ['feature', 'faq']
  const viewportFocusY = Math.min(window.innerHeight * 0.42, 420)
  const current = sectionIds.reduce((active, id) => {
    const sections = [document.getElementById(id), ...document.querySelectorAll(`[data-nav-section="${id}"]`)].filter(
      Boolean,
    )

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
    syncInviteCodeFromRoute()
    open.value = false
    accountMenuOpen.value = false
    window.requestAnimationFrame(updateActiveSection)
    window.requestAnimationFrame(maybeOpenInviteRegister)
  },
)

onMounted(() => {
  syncInviteCodeFromRoute()
  themeMedia = window.matchMedia('(prefers-color-scheme: dark)')
  applyTheme(localStorage.getItem('theme') || (themeMedia.matches ? 'dark' : 'light'))
  themeMedia.addEventListener('change', syncSystemTheme)
  onScroll()
  window.addEventListener('open-login', openLogin)
  window.addEventListener('auth-expired', onAuthExpired)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('click', onDocumentClick)
  window.addEventListener('scroll', onScroll, { passive: true })
  auth
    .refreshMe()
    .catch(() => {})
    .finally(maybeOpenInviteRegister)
  loadSiteData().catch(() => {})
})

onBeforeUnmount(() => {
  themeMedia?.removeEventListener('change', syncSystemTheme)
  window.removeEventListener('open-login', openLogin)
  window.removeEventListener('auth-expired', onAuthExpired)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('click', onDocumentClick)
  window.removeEventListener('scroll', onScroll)
  unlockBodyScroll()
})
</script>

<template>
  <a class="skip-link" href="#main-content">跳到正文</a>
  <header class="site-header" :class="{ 'is-scrolled': scrolled }">
    <div class="nav-shell">
      <RouterLink class="brand" to="/" aria-label="ImgsGen 首页">
        <span class="brand-mark" aria-hidden="true">
          <Images />
        </span>
        <span>ImgsGen</span>
      </RouterLink>

      <nav class="main-nav" aria-label="主导航">
        <template v-for="item in visibleNavItems" :key="item.label">
          <span
            v-if="item.soon"
            class="nav-soon"
            aria-disabled="true"
            :aria-label="`${item.label}，规划中`"
            title="规划中"
          >
            {{ item.label }}
            <small>即将上线</small>
          </span>
          <RouterLink
            v-else
            :to="item.to"
            :class="{ active: isActive(item) }"
            :aria-current="isActive(item) ? 'page' : undefined"
          >
            {{ item.label }}
          </RouterLink>
        </template>
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
        <div v-if="isAuthenticated" ref="accountMenuRef" class="account-menu-wrap">
          <button
            class="account-avatar-button"
            type="button"
            aria-haspopup="menu"
            :aria-expanded="accountMenuOpen"
            aria-label="打开用户菜单"
            @click="toggleAccountMenu"
          >
            <img v-if="currentUserAvatarUrl" :src="currentUserAvatarUrl" alt="" />
            <span v-else>{{ userInitial }}</span>
          </button>
          <div v-if="accountMenuOpen" class="account-popover" role="menu">
            <strong>{{ currentUser.name || currentUser.email }}</strong>
            <RouterLink role="menuitem" to="/my-orders" @click="closeAccountMenu">个人中心</RouterLink>
            <button type="button" role="menuitem" @click="logout">
              <LogOut aria-hidden="true" />
              退出登录
            </button>
          </div>
        </div>
        <button v-else class="btn btn-soft" type="button" @click="openLogin">
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
      <template v-for="item in visibleNavItems" :key="item.label">
        <span
          v-if="item.soon"
          class="nav-soon mobile-soon"
          aria-disabled="true"
          :aria-label="`${item.label}，规划中`"
          title="规划中"
        >
          {{ item.label }}
          <small>即将上线</small>
        </span>
        <RouterLink v-else :to="item.to" :class="{ active: isActive(item) }">
          {{ item.label }}
        </RouterLink>
      </template>
      <RouterLink v-if="isAuthenticated" to="/my-orders">个人中心 · {{ currentUser.credits }} 积分</RouterLink>
      <button v-if="isAuthenticated" type="button" @click="logout">退出登录</button>
      <button v-else type="button" @click="openLogin">登录</button>
    </nav>
    <div v-if="open" class="mobile-panel-backdrop" aria-hidden="true" @click="open = false"></div>
  </header>

  <AuthModal
    :open="loginOpen"
    :initial-mode="authInitialMode"
    :invite-code="boundInviteCode"
    :return-focus-el="loginReturnFocusEl"
    @close="closeLogin"
  />
</template>
