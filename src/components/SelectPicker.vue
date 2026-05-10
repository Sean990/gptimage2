<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: '',
  },
  options: {
    type: Array,
    required: true,
  },
  id: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '请选择',
  },
})

const emit = defineEmits(['update:modelValue'])

const fallbackId = `select-picker-${Math.random().toString(36).slice(2)}`
const pickerId = computed(() => props.id || fallbackId)
const menuId = computed(() => `${pickerId.value}-menu`)
const rootRef = ref(null)
const buttonRef = ref(null)
const optionRefs = ref([])
const open = ref(false)

const normalizedOptions = computed(() =>
  props.options.map((item) => (typeof item === 'object' ? item : { label: String(item), value: item }))
)

const selectedOption = computed(() =>
  normalizedOptions.value.find((item) => Object.is(item.value, props.modelValue))
)

const selectedLabel = computed(() => selectedOption.value?.label || props.placeholder)
const resolvedAriaLabel = computed(() => props.ariaLabel || selectedLabel.value)

function setOptionRef(el, index) {
  if (el) optionRefs.value[index] = el
}

function close() {
  open.value = false
}

function closeAndFocusButton() {
  close()
  nextTick(() => buttonRef.value?.focus())
}

function focusOption(index) {
  const options = optionRefs.value.filter(Boolean)
  if (!options.length) return
  const nextIndex = (index + options.length) % options.length
  options[nextIndex]?.focus()
}

function openMenu(focusIndex = -1) {
  optionRefs.value = []
  window.dispatchEvent(new CustomEvent('app-select-picker-open', { detail: pickerId.value }))
  open.value = true
  if (focusIndex >= 0) nextTick(() => focusOption(focusIndex))
}

function toggle() {
  if (open.value) close()
  else openMenu()
}

function selectOption(value) {
  emit('update:modelValue', value)
  closeAndFocusButton()
}

function onButtonKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    const selectedIndex = normalizedOptions.value.findIndex((item) => Object.is(item.value, props.modelValue))
    openMenu(selectedIndex >= 0 ? selectedIndex : 0)
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    openMenu(normalizedOptions.value.length - 1)
  }
  if (event.key === 'Escape') close()
}

function onOptionKeydown(event, index) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    focusOption(index + 1)
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    focusOption(index - 1)
  }
  if (event.key === 'Home') {
    event.preventDefault()
    focusOption(0)
  }
  if (event.key === 'End') {
    event.preventDefault()
    focusOption(normalizedOptions.value.length - 1)
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    closeAndFocusButton()
  }
}

function closeOnOutside(event) {
  if (!rootRef.value?.contains(event.target)) close()
}

function closeOnWindowEscape(event) {
  if (event.key === 'Escape') close()
}

function closeWhenAnotherPickerOpens(event) {
  if (event.detail !== pickerId.value) close()
}

watch(open, (isOpen) => {
  if (isOpen) {
    window.addEventListener('click', closeOnOutside)
    window.addEventListener('keydown', closeOnWindowEscape)
  } else {
    window.removeEventListener('click', closeOnOutside)
    window.removeEventListener('keydown', closeOnWindowEscape)
  }
})

onMounted(() => {
  window.addEventListener('app-select-picker-open', closeWhenAnotherPickerOpens)
})

onBeforeUnmount(() => {
  window.removeEventListener('app-select-picker-open', closeWhenAnotherPickerOpens)
  window.removeEventListener('click', closeOnOutside)
  window.removeEventListener('keydown', closeOnWindowEscape)
})
</script>

<template>
  <div ref="rootRef" class="model-picker select-picker app-select-picker" :class="{ 'is-open': open }">
    <button
      :id="pickerId"
      ref="buttonRef"
      class="model-picker-button select-picker-button app-select-button"
      type="button"
      :aria-label="resolvedAriaLabel"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="menuId"
      @click.stop="toggle"
      @keydown="onButtonKeydown"
    >
      <span class="model-picker-copy">
        <span class="model-preview-head">
          <strong>{{ selectedLabel }}</strong>
        </span>
      </span>
      <ChevronDown class="model-picker-arrow" :class="{ open }" aria-hidden="true" />
    </button>
    <div
      v-if="open"
      :id="menuId"
      class="model-menu select-menu app-select-menu"
      role="listbox"
      :aria-labelledby="pickerId"
    >
      <button
        v-for="(item, index) in normalizedOptions"
        :key="`${item.value}`"
        :ref="(el) => setOptionRef(el, index)"
        class="model-option select-option app-select-option"
        :class="{ active: Object.is(item.value, modelValue) }"
        type="button"
        role="option"
        :aria-selected="Object.is(item.value, modelValue)"
        @click.stop="selectOption(item.value)"
        @keydown="onOptionKeydown($event, index)"
      >
        <span>
          <span class="model-option-head">
            <strong>{{ item.label }}</strong>
          </span>
        </span>
        <Check v-if="Object.is(item.value, modelValue)" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
