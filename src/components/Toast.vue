<script setup>
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  message: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'success', 'error', 'warning'].includes(value),
  },
  duration: {
    type: Number,
    default: 3000,
  },
  role: {
    type: String,
    default: 'status',
  },
  ariaLive: {
    type: String,
    default: 'polite',
  },
})

const visible = ref(false)
let hideTimer = null

const iconByType = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
}

const toastIcon = computed(() => iconByType[props.type] || Info)

function clearHideTimer() {
  if (!hideTimer || typeof window === 'undefined') return
  window.clearTimeout(hideTimer)
  hideTimer = null
}

function scheduleHide() {
  clearHideTimer()
  if (!props.message) {
    visible.value = false
    return
  }

  visible.value = true
  if (typeof window === 'undefined' || props.duration <= 0) return

  hideTimer = window.setTimeout(() => {
    close()
  }, props.duration)
}

function close() {
  visible.value = false
  clearHideTimer()
}

watch(() => props.message, scheduleHide, { immediate: true })
watch(() => props.duration, scheduleHide)
onBeforeUnmount(clearHideTimer)
</script>

<template>
  <Transition name="toast-fade">
    <div v-if="message && visible" class="toast-wrapper" :role="role" :aria-live="ariaLive">
      <div class="toast" :class="`toast--${type}`">
        <span class="toast-icon" aria-hidden="true">
          <component :is="toastIcon" />
        </span>
        <span class="toast-message">
          <slot>{{ message }}</slot>
        </span>
        <button class="toast-close" type="button" aria-label="关闭提示" @click="close">
          <X aria-hidden="true" />
        </button>
      </div>
    </div>
  </Transition>
</template>
