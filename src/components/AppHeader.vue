<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CheckCircle2, Eye, EyeOff, Image, Images, KeyRound, LogIn, LogOut, Mail, Menu, Moon, ShieldCheck, Sparkles, Sun, User, X } from 'lucide-vue-next'
import { useAuthStore } from '../services/authStore'
import { useSiteStore } from '../services/siteStore'

const route = useRoute()
const auth = useAuthStore()
const { siteData, loadSiteData } = useSiteStore()
const open = ref(false)
const accountMenuOpen = ref(false)
const accountMenuRef = ref(null)
const loginOpen = ref(false)
const authModalRef = ref(null)
const emailInputRef = ref(null)
const authMode = ref('login')
const email = ref('')
const password = ref('')
const name = ref('')
const inviteCode = ref('')
const verificationCode = ref('')
const loginMessage = ref('')
const loginMessageType = ref('info')
const loginLoading = ref(false)
const codeLoading = ref(false)
const codeCooldown = ref(0)
const passwordVisible = ref(false)
const scrolled = ref(false)
const activeSection = ref('')
const theme = ref('light')
let themeMedia = null
let codeCooldownTimer = null
let inviteRegisterOpened = false

const navItems = [
  { label: 'AI 生图', to: '/generate', path: '/generate' },
  { label: 'AI 视频', soon: true },
  { label: '提示词优化', to: '/prompt-optimizer', path: '/prompt-optimizer' },
  { label: '功能亮点', to: '/#feature', path: '/', hash: '#feature' },
  { label: '定价', to: '/pricing', path: '/pricing' },
  { label: '常见问题', to: '/#faq', path: '/', hash: '#faq' },
  { label: '画廊', to: '/showcase', path: '/showcase' },
]
const billingEnabled = computed(() => Boolean(siteData.value.billingEnabled))
const visibleNavItems = computed(() => navItems.filter(item => item.path !== '/pricing' || billingEnabled.value))

const emailValid = computed(() => email.value.includes('@') && email.value.trim().length >= 6)
const passwordValid = computed(() => password.value.length >= 8)
const verificationCodeValid = computed(() => /^\d{4,8}$/.test(verificationCode.value.trim()))
const requiresVerificationCode = computed(() => authMode.value !== 'login')
const loginDisabled = computed(() => (
  !emailValid.value ||
  !passwordValid.value ||
  (requiresVerificationCode.value && !verificationCodeValid.value)
))
const sendCodeDisabled = computed(() => !emailValid.value || codeLoading.value || codeCooldown.value > 0 || loginLoading.value)
const routeInviteCode = computed(() => {
  const rawCode = route.query.inviteCode ?? route.query.invite ?? ''
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode
  return String(code || '').trim()
})
const isDark = computed(() => theme.value === 'dark')
const currentUser = computed(() => auth.user.value)
const isAuthenticated = computed(() => auth.isAuthenticated.value)
const userInitial = computed(() => (currentUser.value?.name || currentUser.value?.email || 'U').trim().slice(0, 1).toUpperCase())
const authTitle = computed(() => {
  if (authMode.value === 'register') return '创建 ImgsGen 账号'
  if (authMode.value === 'reset') return '重置登录密码'
  return '登录 ImgsGen'
})
const authSubtitle = computed(() => {
  if (authMode.value === 'register') return '通过邮箱验证码完成账号创建。'
  if (authMode.value === 'reset') return '通过邮箱验证码设置新密码，完成后自动登录。'
  return '使用邮箱和密码进入你的工作区。'
})
const submitLabel = computed(() => {
  if (loginLoading.value) {
    if (authMode.value === 'register') return '正在注册...'
    if (authMode.value === 'reset') return '正在重置...'
    return '正在登录...'
  }
  if (authMode.value === 'register') return '创建账号'
  if (authMode.value === 'reset') return '重置密码并登录'
  return '登录'
})
const sendCodeIdleLabel = computed(() => (authMode.value === 'reset' ? '发送重置码' : '发送验证码'))
const passwordLabel = computed(() => (authMode.value === 'reset' ? '新密码' : '密码'))
const passwordAutocomplete = computed(() => (authMode.value === 'login' ? 'current-password' : 'new-password'))
const passwordInputType = computed(() => (passwordVisible.value ? 'text' : 'password'))

function focusEmailInput() {
  nextTick(() => emailInputRef.value?.focus())
}

function syncInviteCodeFromRoute() {
  if (routeInviteCode.value) {
    inviteCode.value = routeInviteCode.value
  }
}

function isActive(item) {
  if (item.soon) return false
  if (item.path === '/my-orders') return ['/my-orders', '/my-credits', '/my-invites', '/profile'].includes(route.path)
  if (item.hash) return route.path === item.path && activeSection.value === item.hash
  return route.path === item.path
}

function openAuthModal(mode = 'login') {
  if (mode === 'register') syncInviteCodeFromRoute()
  setAuthMode(mode)
  loginOpen.value = true
  open.value = false
  document.body.classList.add('no-scroll')
  focusEmailInput()
}

function openLogin() {
  openAuthModal('login')
}

function openRegister() {
  openAuthModal('register')
}

function maybeOpenInviteRegister() {
  syncInviteCodeFromRoute()
  if (!routeInviteCode.value || isAuthenticated.value || inviteRegisterOpened || loginOpen.value) return

  inviteRegisterOpened = true
  openRegister()
  loginMessageType.value = 'info'
  loginMessage.value = '已带入邀请链接，注册后会自动绑定邀请关系。'
}

function closeLogin() {
  loginOpen.value = false
  password.value = ''
  verificationCode.value = ''
  passwordVisible.value = false
  loginMessage.value = ''
  loginMessageType.value = 'info'
  clearCodeCooldown()
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
    loginMessageType.value = 'error'
    loginMessage.value = requiresVerificationCode.value ? '请填写有效邮箱、验证码和至少 8 位密码' : '请输入有效邮箱和至少 8 位密码'
    focusEmailInput()
    return
  }

  loginLoading.value = true
  try {
    const currentMode = authMode.value
    const payload = {
      email: email.value,
      password: password.value,
      verificationCode: verificationCode.value,
      name: name.value,
      inviteCode: inviteCode.value,
    }
    let result
    if (currentMode === 'register') result = await auth.register(payload)
    else if (currentMode === 'reset') result = await auth.resetPassword(payload)
    else result = await auth.login(payload)

    const actionText = currentMode === 'register'
      ? '注册并登录'
      : currentMode === 'reset'
        ? '重置密码并登录'
        : '登录'
    loginMessageType.value = 'success'
    loginMessage.value = `${result.user.name} 已${actionText}，当前积分 ${result.user.credits}`
    window.setTimeout(closeLogin, 900)
  } catch (error) {
    loginMessageType.value = 'error'
    loginMessage.value = error.message || '操作失败，请稍后重试'
  } finally {
    loginLoading.value = false
  }
}

function clearCodeCooldown() {
  if (!codeCooldownTimer) return
  window.clearInterval(codeCooldownTimer)
  codeCooldownTimer = null
}

function startCodeCooldown(seconds = 60) {
  clearCodeCooldown()
  codeCooldown.value = seconds
  codeCooldownTimer = window.setInterval(() => {
    codeCooldown.value = Math.max(0, codeCooldown.value - 1)
    if (codeCooldown.value === 0) clearCodeCooldown()
  }, 1000)
}

async function sendEmailCode() {
  if (!emailValid.value) {
    loginMessageType.value = 'error'
    loginMessage.value = '请先填写有效邮箱'
    return
  }

  codeLoading.value = true
  try {
    const result = authMode.value === 'reset'
      ? await auth.sendPasswordResetCode({ email: email.value })
      : await auth.sendEmailCode({ email: email.value })
    loginMessageType.value = 'info'
    loginMessage.value = import.meta.env.DEV && result.debugCode
      ? `验证码已生成：${result.debugCode}`
      : authMode.value === 'reset'
        ? '如果邮箱已注册，验证码将发送到该邮箱'
        : '验证码已发送，请查收邮箱'
    startCodeCooldown(60)
  } catch (error) {
    loginMessageType.value = 'error'
    loginMessage.value = error.message || '验证码发送失败，请稍后重试'
  } finally {
    codeLoading.value = false
  }
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

function setAuthMode(mode) {
  if (authMode.value !== mode) {
    password.value = ''
    verificationCode.value = ''
    passwordVisible.value = false
    codeCooldown.value = 0
    clearCodeCooldown()
  }
  authMode.value = mode
  loginMessage.value = ''
  loginMessageType.value = 'info'
  focusEmailInput()
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    open.value = false
    accountMenuOpen.value = false
    return
  }

  if (event.key === 'Tab' && loginOpen.value && authModalRef.value) {
    const focusable = Array.from(authModalRef.value.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.offsetParent !== null)
    if (!focusable.length) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

function onScroll() {
  scrolled.value = window.scrollY > 12
  updateActiveSection()
}

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
    accountMenuOpen.value = false
    syncInviteCodeFromRoute()
    window.requestAnimationFrame(updateActiveSection)
    window.requestAnimationFrame(maybeOpenInviteRegister)
  },
)

onMounted(() => {
  themeMedia = window.matchMedia('(prefers-color-scheme: dark)')
  applyTheme(localStorage.getItem('theme') || (themeMedia.matches ? 'dark' : 'light'))
  themeMedia.addEventListener('change', syncSystemTheme)
  syncInviteCodeFromRoute()
  onScroll()
  window.addEventListener('open-login', openLogin)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('click', onDocumentClick)
  window.addEventListener('scroll', onScroll, { passive: true })
  auth.refreshMe().catch(() => {}).finally(maybeOpenInviteRegister)
  loadSiteData().catch(() => {})
})

onBeforeUnmount(() => {
  document.body.classList.remove('no-scroll')
  clearCodeCooldown()
  themeMedia?.removeEventListener('change', syncSystemTheme)
  window.removeEventListener('open-login', openLogin)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('click', onDocumentClick)
  window.removeEventListener('scroll', onScroll)
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
        <template
          v-for="item in visibleNavItems"
          :key="item.label"
        >
          <span v-if="item.soon" class="nav-soon" aria-disabled="true" :aria-label="`${item.label}，规划中`" title="规划中">
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
            <img v-if="currentUser.avatarUrl" :src="currentUser.avatarUrl" alt="" />
            <span v-else>{{ userInitial }}</span>
          </button>
          <div v-if="accountMenuOpen" class="account-popover" role="menu">
            <strong>{{ currentUser.name || currentUser.email }}</strong>
            <RouterLink role="menuitem" to="/my-orders" @click="closeAccountMenu">用户中心</RouterLink>
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
        <span v-if="item.soon" class="nav-soon mobile-soon" aria-disabled="true" :aria-label="`${item.label}，规划中`" title="规划中">
          {{ item.label }}
          <small>即将上线</small>
        </span>
        <RouterLink
          v-else
          :to="item.to"
          :class="{ active: isActive(item) }"
        >
          {{ item.label }}
        </RouterLink>
      </template>
      <RouterLink v-if="isAuthenticated" to="/my-orders">个人中心 · {{ currentUser.credits }} 积分</RouterLink>
      <button v-if="isAuthenticated" type="button" @click="logout">退出登录</button>
      <button v-else type="button" @click="openLogin">登录</button>
    </nav>
  </header>

  <Teleport to="body">
    <div
      v-if="loginOpen"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
    >
      <div ref="authModalRef" class="modal-card auth-modal-card">
        <div class="modal-head">
          <div class="auth-title-block">
            <span class="auth-modal-mark" aria-hidden="true">
              <Images />
            </span>
            <div>
              <h2 id="login-title">{{ authTitle }}</h2>
              <p>{{ authSubtitle }}</p>
            </div>
          </div>
          <button class="icon-button" type="button" aria-label="关闭登录弹窗" @click="closeLogin">
            <X aria-hidden="true" />
          </button>
        </div>

        <div v-if="authMode !== 'reset'" class="auth-mode-tabs" role="tablist" aria-label="账号入口">
          <button
            type="button"
            role="tab"
            :aria-selected="authMode === 'login'"
            :class="{ active: authMode === 'login' }"
            @click="setAuthMode('login')"
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="authMode === 'register'"
            :class="{ active: authMode === 'register' }"
            @click="openRegister"
          >
            注册
          </button>
        </div>
        <div v-else class="auth-return-row">
          <button class="auth-link-button" type="button" @click="setAuthMode('login')">
            返回登录
          </button>
        </div>

        <form class="auth-form" @submit.prevent="submitLogin">
          <div v-if="authMode === 'register'" class="field">
            <label for="name">昵称</label>
            <div class="auth-field-control">
              <User aria-hidden="true" />
              <input
                id="name"
                v-model.trim="name"
                type="text"
                placeholder="选填，默认使用邮箱前缀"
                autocomplete="name"
              />
            </div>
          </div>
          <div class="field">
            <label for="email">邮箱</label>
            <div class="auth-field-control">
              <Mail aria-hidden="true" />
              <input
                id="email"
                ref="emailInputRef"
                v-model.trim="email"
                type="email"
                placeholder="name@example.com"
                autocomplete="username"
                required
              />
            </div>
          </div>
          <div v-if="requiresVerificationCode" class="auth-code-row">
            <div class="field compact-field">
              <label for="verification-code">验证码</label>
              <div class="auth-field-control">
                <ShieldCheck aria-hidden="true" />
                <input
                  id="verification-code"
                  v-model.trim="verificationCode"
                  type="text"
                  inputmode="numeric"
                  maxlength="8"
                  placeholder="邮箱验证码"
                  autocomplete="one-time-code"
                  required
                />
              </div>
            </div>
            <button
              class="btn btn-soft auth-code-button"
              type="button"
              :disabled="sendCodeDisabled"
              @click="sendEmailCode"
            >
              <Mail aria-hidden="true" />
              {{ codeLoading ? '发送中' : (codeCooldown > 0 ? `${codeCooldown}s` : sendCodeIdleLabel) }}
            </button>
          </div>
          <div class="field">
            <label for="password">{{ passwordLabel }}</label>
            <div class="auth-field-control auth-password-control">
              <KeyRound aria-hidden="true" />
              <input
                id="password"
                v-model="password"
                :type="passwordInputType"
                placeholder="至少 8 位密码"
                :autocomplete="passwordAutocomplete"
                required
              />
              <button
                class="auth-password-toggle"
                type="button"
                :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
                :aria-pressed="passwordVisible"
                @click="passwordVisible = !passwordVisible"
              >
                <EyeOff v-if="passwordVisible" aria-hidden="true" />
                <Eye v-else aria-hidden="true" />
              </button>
            </div>
          </div>
          <div v-if="authMode === 'login'" class="auth-form-meta">
            <button class="auth-link-button" type="button" @click="setAuthMode('reset')">
              忘记密码？
            </button>
          </div>
          <div v-if="authMode === 'register'" class="field">
            <label for="invite-code">邀请码</label>
            <div class="auth-field-control">
              <Sparkles aria-hidden="true" />
              <input
                id="invite-code"
                v-model.trim="inviteCode"
                type="text"
                placeholder="选填"
                autocomplete="off"
              />
            </div>
            <small v-if="routeInviteCode">已从邀请链接自动填入。</small>
          </div>
          <p v-if="loginMessage" class="form-message auth-form-message" :class="`is-${loginMessageType}`" aria-live="polite">
            <CheckCircle2 aria-hidden="true" />
            {{ loginMessage }}
          </p>
          <button class="btn btn-primary auth-submit-button" type="submit" :disabled="loginDisabled || loginLoading">
            <LogIn v-if="authMode === 'login'" aria-hidden="true" />
            <ShieldCheck v-else-if="authMode === 'reset'" aria-hidden="true" />
            <Image v-else aria-hidden="true" />
            {{ submitLabel }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>
</template>
