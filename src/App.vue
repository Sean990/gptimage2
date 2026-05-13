<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from './seo/constants.js'

const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '')

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
let motionMedia = null
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
  if (event.matches) {
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

onMounted(() => {
  motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (motionMedia.matches) cursorStrength = 0.58
  jumpBackgroundToTarget()
  if (!motionMedia.matches) addBackgroundListeners()
  motionMedia.addEventListener('change', syncMotionPreference)
})

onBeforeUnmount(() => {
  removeBackgroundListeners()
  motionMedia?.removeEventListener('change', syncMotionPreference)
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
</template>
