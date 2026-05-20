<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:open', 'close'])

const sheetRef = ref(null)
const startY = ref(0)
const currentY = ref(0)
const isDragging = ref(false)
const closeButtonRef = ref(null)
let previousFocusedElement = null

function close() {
  emit('update:open', false)
  emit('close')
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    close()
  }
}

function handleTouchStart(event) {
  const touch = event.touches[0]
  startY.value = touch.clientY
  isDragging.value = true
}

function handleTouchMove(event) {
  if (!isDragging.value) return
  const touch = event.touches[0]
  const deltaY = touch.clientY - startY.value
  if (deltaY > 0) {
    currentY.value = deltaY
    event.preventDefault()
  }
}

function handleTouchEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  if (currentY.value > 120) {
    close()
  }
  currentY.value = 0
}

function handleEscape(event) {
  if (event.key === 'Escape' && props.open) {
    close()
  }
}

function getFocusableElements() {
  if (!sheetRef.value) return []
  return Array.from(
    sheetRef.value.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'))
}

function handleTabKey(event) {
  if (event.key !== 'Tab' || !props.open) return

  const focusableElements = getFocusableElements()
  if (!focusableElements.length) {
    event.preventDefault()
    sheetRef.value?.focus()
    return
  }

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault()
    lastElement.focus()
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault()
    firstElement.focus()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return
    if (isOpen) {
      previousFocusedElement = document.activeElement
      document.body.classList.add('bottom-sheet-open')
      nextTick(() => {
        closeButtonRef.value?.focus()
      })
    } else {
      document.body.classList.remove('bottom-sheet-open')
      if (previousFocusedElement instanceof HTMLElement) {
        previousFocusedElement.focus()
      }
      previousFocusedElement = null
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
  if (props.open) document.body.classList.add('bottom-sheet-open')
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  document.body.classList.remove('bottom-sheet-open')
})
</script>

<template>
  <Teleport to="body">
    <Transition name="bottom-sheet-backdrop">
      <div v-if="open" class="bottom-sheet-backdrop" @click="handleBackdropClick">
        <Transition name="bottom-sheet">
          <div
            v-if="open"
            ref="sheetRef"
            class="bottom-sheet"
            :style="{ transform: currentY > 0 ? `translateY(${currentY}px)` : '' }"
            role="dialog"
            aria-modal="true"
            :aria-label="title"
            tabindex="-1"
            @keydown="handleTabKey"
          >
            <div
              class="bottom-sheet-handle"
              @touchstart="handleTouchStart"
              @touchmove="handleTouchMove"
              @touchend="handleTouchEnd"
            >
              <span class="bottom-sheet-handle-bar" aria-hidden="true"></span>
            </div>

            <div class="bottom-sheet-header">
              <h2 v-if="title" class="bottom-sheet-title">{{ title }}</h2>
              <button
                ref="closeButtonRef"
                type="button"
                class="bottom-sheet-close"
                aria-label="关闭"
                @click="close"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div class="bottom-sheet-body">
              <slot />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
