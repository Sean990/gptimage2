<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppFooter from './components/AppFooter.vue'
import AppHeader from './components/AppHeader.vue'

const backgroundRef = ref(null)
let motionMedia = null
let followFrame = 0
let targetPointer = { x: 0.5, y: 0.24 }
let visiblePointer = { x: 0.5, y: 0.24 }
let cursorStrength = 0.72
let focusProgress = 0
let targetFocusProgress = 0
let focusRadius = 160
let targetFocusRadius = 160

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
  grid: 832,
  primary: 320,
  secondary: 400,
  tertiary: 416,
  blur: 18,
  scale: 1.08,
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function mix(from, to, amount) {
  return from + (to - from) * amount
}

function writeBackgroundVars() {
  const target = backgroundRef.value
  if (!target) return

  const { x, y } = visiblePointer
  const shiftX = (x - 0.5) * 32
  const shiftY = (y - 0.5) * 26
  const focusedPrimary = focusRadius
  const focusedSecondary = focusRadius * 1.08
  const focusedTertiary = focusRadius * 1.16
  const focusedGrid = focusRadius * 1.5

  target.style.setProperty('--cursor-x', `${(x * 100).toFixed(2)}%`)
  target.style.setProperty('--cursor-y', `${(y * 100).toFixed(2)}%`)
  target.style.setProperty('--grid-focus-radius', `${mix(defaultGlow.grid, focusedGrid, focusProgress).toFixed(1)}px`)
  target.style.setProperty('--cursor-radius-a', `${mix(defaultGlow.primary, focusedPrimary, focusProgress).toFixed(1)}px`)
  target.style.setProperty('--cursor-radius-b', `${mix(defaultGlow.secondary, focusedSecondary, focusProgress).toFixed(1)}px`)
  target.style.setProperty('--cursor-radius-c', `${mix(defaultGlow.tertiary, focusedTertiary, focusProgress).toFixed(1)}px`)
  target.style.setProperty('--cursor-blur', `${mix(defaultGlow.blur, 2, focusProgress).toFixed(1)}px`)
  target.style.setProperty('--cursor-scale', mix(defaultGlow.scale, 1, focusProgress).toFixed(3))
  target.style.setProperty('--bg-shift-x', `${shiftX.toFixed(2)}px`)
  target.style.setProperty('--bg-shift-y', `${shiftY.toFixed(2)}px`)
  target.style.setProperty('--bg-shift-x-soft', `${(shiftX * 0.08).toFixed(2)}px`)
  target.style.setProperty('--bg-shift-y-soft', `${(shiftY * 0.08).toFixed(2)}px`)
  target.style.setProperty('--bg-shift-x-reverse', `${(shiftX * -0.22).toFixed(2)}px`)
  target.style.setProperty('--bg-shift-y-reverse', `${(shiftY * -0.22).toFixed(2)}px`)
  target.style.setProperty('--bg-shift-x-mesh', `${(shiftX * 0.28).toFixed(2)}px`)
  target.style.setProperty('--bg-shift-y-mesh', `${(shiftY * 0.28).toFixed(2)}px`)
  target.style.setProperty('--cursor-strength', cursorStrength.toFixed(2))
}

function animateBackgroundFollow() {
  const followEase = 0.095
  const focusEase = targetFocusProgress > focusProgress ? 0.1 : 0.08
  visiblePointer = {
    x: visiblePointer.x + (targetPointer.x - visiblePointer.x) * followEase,
    y: visiblePointer.y + (targetPointer.y - visiblePointer.y) * followEase,
  }
  focusProgress += (targetFocusProgress - focusProgress) * focusEase
  focusRadius += (targetFocusRadius - focusRadius) * focusEase
  writeBackgroundVars()

  const distance = Math.hypot(targetPointer.x - visiblePointer.x, targetPointer.y - visiblePointer.y)
  const focusDistance = Math.abs(targetFocusProgress - focusProgress) + Math.abs(targetFocusRadius - focusRadius) / 1000
  if (distance < 0.001 && focusDistance < 0.002) {
    visiblePointer = targetPointer
    focusProgress = targetFocusProgress
    focusRadius = targetFocusRadius
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
  visiblePointer = targetPointer
  focusProgress = targetFocusProgress
  focusRadius = targetFocusRadius
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
  targetFocusRadius = 12
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
  <div ref="backgroundRef" class="interactive-background" aria-hidden="true">
    <span class="interactive-background__mesh"></span>
    <span class="interactive-background__grid"></span>
    <span class="interactive-background__cursor"></span>
  </div>
  <AppHeader />
  <div id="main-content" tabindex="-1">
    <RouterView />
  </div>
  <AppFooter />
</template>
