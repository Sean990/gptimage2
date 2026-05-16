<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { ShieldAlert } from 'lucide-vue-next'
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from './seo/constants.js'

const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '')
const REGION_NOTICE_STORAGE_KEY = 'imgsgen-region-notice-accepted-v1'

const route = useRoute()

const pageTitle = computed(() => route.meta?.title || DEFAULT_TITLE)
const pageDescription = computed(() => route.meta?.description || DEFAULT_DESCRIPTION)
const pageRobots = computed(() => route.meta?.robots || 'index,follow,max-image-preview:large')
const canonicalUrl = computed(() => (SITE_URL ? `${SITE_URL}${route.path}` : null))

useHead({
  htmlAttrs: { lang: 'zh-CN' },
  title: pageTitle,
  meta: [
    { name: 'description', content: pageDescription },
    { name: 'robots', content: pageRobots },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: pageDescription },
    { property: 'og:url', content: canonicalUrl },
    { name: 'twitter:title', content: pageTitle },
    { name: 'twitter:description', content: pageDescription },
  ],
  link: [{ rel: 'canonical', href: canonicalUrl }],
})

const cursorRef = ref(null)
const showRegionNotice = ref(false)
const regionNoticePrimaryRef = ref(null)
let motionMedia = null
let pointerFineMedia = null
let followFrame = 0
let targetPointer = { x: 0.5, y: 0.24 }
let visiblePointer = { x: 0.5, y: 0.24 }
let cursorStrength = 0.72
let focusProgress = 0
let targetFocusProgress = 0

const interactiveSelector = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'textarea:not(:disabled)',
  'select:not(:disabled)',
  'summary',
  'label.upload-zone',
  '[role="button"]',
  '[role="tab"]',
  '[role="option"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const defaultGlow = {
  scale: 1.08,
  focusedScale: 0.28,
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function mix(from, to, amount) {
  return from + (to - from) * amount
}

function writeBackgroundVars() {
  const target = cursorRef.value
  if (!target) return

  const { x, y } = visiblePointer
  const xPx = x * window.innerWidth
  const yPx = y * window.innerHeight
  const scale = mix(defaultGlow.scale, defaultGlow.focusedScale, focusProgress)

  target.style.transform = `translate3d(${xPx.toFixed(1)}px, ${yPx.toFixed(1)}px, 0) translate3d(-50%, -50%, 0) scale(${scale.toFixed(3)})`
  target.style.opacity = cursorStrength.toFixed(2)
}

function animateBackgroundFollow() {
  const followEase = 0.095
  const focusEase = targetFocusProgress > focusProgress ? 0.1 : 0.08
  visiblePointer = {
    x: visiblePointer.x + (targetPointer.x - visiblePointer.x) * followEase,
    y: visiblePointer.y + (targetPointer.y - visiblePointer.y) * followEase,
  }
  focusProgress += (targetFocusProgress - focusProgress) * focusEase
  writeBackgroundVars()

  const distance = Math.hypot(targetPointer.x - visiblePointer.x, targetPointer.y - visiblePointer.y)
  const focusDistance = Math.abs(targetFocusProgress - focusProgress)
  if (distance < 0.001 && focusDistance < 0.002) {
    visiblePointer = { ...targetPointer }
    focusProgress = targetFocusProgress
    writeBackgroundVars()
    followFrame = 0
    return
  }

  followFrame = window.requestAnimationFrame(animateBackgroundFollow)
}

function startBackgroundFollow() {
  if (followFrame) return
  followFrame = window.requestAnimationFrame(animateBackgroundFollow)
}

function jumpBackgroundToTarget() {
  visiblePointer = { ...targetPointer }
  focusProgress = targetFocusProgress
  writeBackgroundVars()
}

function getInteractiveElement(target) {
  if (!(target instanceof Element)) return null
  const element = target.closest(interactiveSelector)
  if (!element || element.closest('[aria-disabled="true"]')) return null
  return element
}

function setInteractiveFocus(event) {
  targetPointer = {
    x: clamp(event.clientX / window.innerWidth, 0, 1),
    y: clamp(event.clientY / window.innerHeight, 0, 1),
  }
  targetFocusProgress = 1
}

function setPointerFocus(event) {
  targetPointer = {
    x: clamp(event.clientX / window.innerWidth, 0, 1),
    y: clamp(event.clientY / window.innerHeight, 0, 1),
  }
  targetFocusProgress = 0
}

function onPointerMove(event) {
  const interactiveElement = getInteractiveElement(event.target)
  if (interactiveElement) setInteractiveFocus(event)
  else setPointerFocus(event)

  cursorStrength = 1
  startBackgroundFollow()
}

function resetBackgroundFocus() {
  targetPointer = { x: 0.5, y: 0.24 }
  targetFocusProgress = 0
  cursorStrength = 0.72
  startBackgroundFollow()
}

function addBackgroundListeners() {
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('blur', resetBackgroundFocus)
  document.addEventListener('mouseleave', resetBackgroundFocus)
}

function removeBackgroundListeners() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('blur', resetBackgroundFocus)
  document.removeEventListener('mouseleave', resetBackgroundFocus)
}

function syncMotionPreference(event) {
  const shouldReduceMotion = event.matches || !pointerFineMedia?.matches
  if (shouldReduceMotion) {
    removeBackgroundListeners()
    if (followFrame) window.cancelAnimationFrame(followFrame)
    followFrame = 0
    targetPointer = { x: 0.5, y: 0.24 }
    targetFocusProgress = 0
    cursorStrength = 0.58
    jumpBackgroundToTarget()
    return
  }

  cursorStrength = 0.72
  targetFocusProgress = 0
  jumpBackgroundToTarget()
  addBackgroundListeners()
}

function syncPointerPreference() {
  syncMotionPreference(motionMedia || { matches: false })
}

function lockRegionNoticeScroll() {
  document.body.classList.add('region-notice-locked')
}

function unlockRegionNoticeScroll() {
  document.body.classList.remove('region-notice-locked')
}

function hasAcceptedRegionNotice() {
  try {
    return window.localStorage.getItem(REGION_NOTICE_STORAGE_KEY) === 'accepted'
  } catch {
    return false
  }
}

function storeRegionNoticeAcceptance() {
  try {
    window.localStorage.setItem(REGION_NOTICE_STORAGE_KEY, 'accepted')
  } catch {
    // If storage is blocked, still allow the current session to proceed after explicit confirmation.
  }
}

function acceptRegionNotice() {
  storeRegionNoticeAcceptance()
  showRegionNotice.value = false
  unlockRegionNoticeScroll()
}

onMounted(() => {
  motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
  pointerFineMedia = window.matchMedia('(hover: hover) and (pointer: fine)')
  if (motionMedia.matches || !pointerFineMedia.matches) cursorStrength = 0.58
  jumpBackgroundToTarget()
  if (!motionMedia.matches && pointerFineMedia.matches) addBackgroundListeners()
  motionMedia.addEventListener('change', syncMotionPreference)
  pointerFineMedia.addEventListener('change', syncPointerPreference)

  if (!hasAcceptedRegionNotice()) {
    showRegionNotice.value = true
    lockRegionNoticeScroll()
    nextTick(() => regionNoticePrimaryRef.value?.focus())
  }
})

onBeforeUnmount(() => {
  removeBackgroundListeners()
  unlockRegionNoticeScroll()
  motionMedia?.removeEventListener('change', syncMotionPreference)
  pointerFineMedia?.removeEventListener('change', syncPointerPreference)
  if (followFrame) window.cancelAnimationFrame(followFrame)
})
</script>

<template>
  <div class="interactive-background" aria-hidden="true">
    <span class="interactive-background__mesh"></span>
    <span class="interactive-background__grid"></span>
    <span ref="cursorRef" class="interactive-background__cursor"></span>
  </div>
  <AppHeader />
  <div id="main-content" tabindex="-1">
    <RouterView />
  </div>
  <AppFooter />

  <Teleport to="body">
    <div
      v-if="showRegionNotice"
      class="modal-backdrop region-notice-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="region-notice-title"
      aria-describedby="region-notice-description"
    >
      <div class="modal-card region-notice-card">
        <span class="region-notice-icon" aria-hidden="true">
          <ShieldAlert />
        </span>
        <div>
          <h2 id="region-notice-title">地区限制提示</h2>
          <p id="region-notice-description">
            由于法律与合规要求，本服务暂不向位于中国大陆地区的用户提供。若您位于中国大陆地区，或代表中国大陆地区主体使用本服务，请立即停止访问、注册或使用。继续访问或使用即表示您确认自己不位于中国大陆地区，且不会将本服务用于违反适用法律法规的用途。因您违反本地区限制或适用法律法规而产生的责任，由您自行承担；法律规定不得排除或限制的责任，不受本提示影响。
          </p>
        </div>
        <div class="region-notice-actions">
          <RouterLink class="btn btn-ghost" to="/terms-of-service">查看服务条款</RouterLink>
          <button ref="regionNoticePrimaryRef" class="btn btn-primary" type="button" @click="acceptRegionNotice">
            我确认不在中国大陆并继续
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
