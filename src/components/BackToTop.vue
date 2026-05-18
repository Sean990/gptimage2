<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { ArrowUp } from 'lucide-vue-next'

const showButton = ref(false)
let rafId = 0

function updateVisibility() {
  rafId = 0
  showButton.value = window.scrollY > window.innerHeight
}

function onScroll() {
  if (rafId) return
  rafId = window.requestAnimationFrame(updateVisibility)
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  if (typeof window === 'undefined') return
  if (!window.matchMedia('(max-width: 820px)').matches) return
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', onScroll)
  }
  if (rafId) window.cancelAnimationFrame(rafId)
})
</script>

<template>
  <button
    v-show="showButton"
    class="back-to-top-button"
    type="button"
    aria-label="回到顶部"
    @click="scrollToTop"
  >
    <ArrowUp aria-hidden="true" />
  </button>
</template>
