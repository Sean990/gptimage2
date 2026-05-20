<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  ariaLabel: {
    type: String,
    default: '快捷操作',
  },
  barClass: {
    type: [String, Array, Object],
    default: '',
  },
  slotClass: {
    type: [String, Array, Object],
    default: '',
  },
  viewportMargin: {
    type: Number,
    default: 16,
  },
})

const slotRef = ref(null)
const barRef = ref(null)
const stuck = ref(false)
const rect = ref({ left: 0, width: 0 })
let rafId = 0
let observer = null
let usesScrollFallback = false

const floatingStyle = computed(() =>
  stuck.value
    ? {
        left: `${rect.value.left}px`,
        width: `${rect.value.width}px`,
      }
    : null,
)

function updateRect() {
  const slot = slotRef.value
  if (!slot) return null

  const slotRect = slot.getBoundingClientRect()
  rect.value = {
    left: Math.max(12, Math.round(slotRect.left)),
    width: Math.round(slotRect.width),
  }
  return slotRect
}

function updateStickiness() {
  rafId = 0
  if (typeof window === 'undefined') return

  const slotRect = updateRect()
  if (!slotRect || !barRef.value) return

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight
  const viewportBottom = viewportHeight - props.viewportMargin
  const isSlotUsable = slotRect.top >= 0 && slotRect.bottom <= viewportBottom
  stuck.value = !isSlotUsable
}

function queueUpdate() {
  if (rafId || typeof window === 'undefined') return
  rafId = window.requestAnimationFrame(updateStickiness)
}

function observeSlot() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return false
  const slot = slotRef.value
  if (!slot) return false

  observer = new IntersectionObserver(
    ([entry]) => {
      updateRect()
      stuck.value = !(entry.isIntersecting && entry.intersectionRatio >= 0.999)
    },
    {
      root: null,
      rootMargin: `0px 0px -${props.viewportMargin}px 0px`,
      threshold: [0, 0.999, 1],
    },
  )
  observer.observe(slot)
  return true
}

onMounted(() => {
  if (typeof window === 'undefined') return
  nextTick(() => {
    updateStickiness()
    usesScrollFallback = !observeSlot()
    if (usesScrollFallback) window.addEventListener('scroll', queueUpdate, { passive: true })
    window.addEventListener('resize', queueUpdate)
  })
})

onUnmounted(() => {
  if (typeof window === 'undefined') return
  if (usesScrollFallback) window.removeEventListener('scroll', queueUpdate)
  window.removeEventListener('resize', queueUpdate)
  observer?.disconnect()
  if (rafId) window.cancelAnimationFrame(rafId)
})
</script>

<template>
  <div ref="slotRef" class="generation-actions-slot" :class="slotClass">
    <div
      ref="barRef"
      class="generation-actions"
      :class="[barClass, { 'is-placeholder-hidden': stuck }]"
      :aria-hidden="stuck"
    >
      <slot :floating="false" />
    </div>
  </div>
  <Teleport to="body">
    <div
      v-if="stuck"
      class="generation-actions generation-actions-floating"
      :class="barClass"
      :style="floatingStyle"
      :aria-label="ariaLabel"
    >
      <slot :floating="true" />
    </div>
  </Teleport>
</template>
