<script setup>
import { nextTick, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  titleId: {
    type: String,
    required: true,
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  initialFocus: {
    type: Object,
    default: null,
  },
  returnFocusEl: {
    type: Object,
    default: null,
  },
  backdropClass: {
    type: [String, Array, Object],
    default: '',
  },
  cardClass: {
    type: [String, Array, Object],
    default: '',
  },
})

const emit = defineEmits(['close'])

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

let previousActiveElement = null

function resolveElement(target) {
  return target?.value || target || null
}

function getDialogElement() {
  return document.getElementById(props.titleId)?.closest('[role="dialog"]')
}

function getFocusableElements() {
  const dialog = getDialogElement()
  if (!dialog) return []
  return Array.from(dialog.querySelectorAll(focusableSelector)).filter((element) => {
    if (element.hasAttribute('disabled')) return false
    if (element.getAttribute('aria-hidden') === 'true') return false
    return Boolean(element.offsetParent || element === document.activeElement)
  })
}

function focusInitialElement() {
  nextTick(() => {
    const target = resolveElement(props.initialFocus) || getFocusableElements()[0] || getDialogElement()
    target?.focus?.()
  })
}

function restoreFocus() {
  nextTick(() => {
    const target = resolveElement(props.returnFocusEl) || previousActiveElement
    if (document.contains(target)) target?.focus?.()
    previousActiveElement = null
  })
}

function onBackdropClick(event) {
  if (!props.closeOnBackdrop || event.target !== event.currentTarget) return
  emit('close')
}

function onKeydown(event) {
  if (!props.open) return

  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }

  if (event.key !== 'Tab') return

  const focusable = getFocusableElements()
  if (!focusable.length) {
    event.preventDefault()
    return
  }

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

watch(
  () => props.open,
  (isOpen) => {
    if (typeof document === 'undefined') return

    if (isOpen) {
      previousActiveElement = document.activeElement
      document.body.classList.add('no-scroll')
      window.addEventListener('keydown', onKeydown)
      focusInitialElement()
      return
    }

    document.body.classList.remove('no-scroll')
    window.removeEventListener('keydown', onKeydown)
    restoreFocus()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.body.classList.remove('no-scroll')
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" :class="backdropClass" @click="onBackdropClick">
      <div
        class="modal-card"
        :class="cardClass"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
      >
        <slot />
      </div>
    </div>
  </Teleport>
</template>
