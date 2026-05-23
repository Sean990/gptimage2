<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  options: { type: Array, required: true },
  modelValue: { type: [String, Number], default: '' },
  hint: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const pickerRef = ref(null)

const selectedLabel = computed(() => {
  const found = props.options.find((o) => o.value === props.modelValue)
  return found?.label ?? String(props.modelValue)
})

function toggle() {
  open.value = !open.value
}

function select(value) {
  emit('update:modelValue', value)
  open.value = false
}

function close() {
  open.value = false
}

function onClickOutside(e) {
  if (pickerRef.value && !pickerRef.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', onClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }}</label>
    <div ref="pickerRef" class="model-picker select-picker">
      <button
        :id="id"
        class="model-picker-button select-picker-button"
        type="button"
        :aria-label="`${label}，当前为 ${selectedLabel}`"
        :aria-expanded="open"
        aria-haspopup="listbox"
        :aria-controls="`${id}-menu`"
        @click.stop="toggle"
        @keydown.escape="close"
      >
        <span class="model-picker-copy">
          <span class="model-preview-head">
            <strong>{{ selectedLabel }}</strong>
          </span>
        </span>
        <ChevronDown class="model-picker-arrow" :class="{ open }" aria-hidden="true" />
      </button>
      <div v-if="open" :id="`${id}-menu`" class="model-menu select-menu" role="listbox" :aria-labelledby="id">
        <button
          v-for="item in options"
          :key="item.value"
          class="model-option select-option"
          :class="{ active: item.value === modelValue }"
          type="button"
          role="option"
          :aria-selected="item.value === modelValue"
          @click.stop="select(item.value)"
          @keydown.escape="close"
        >
          <span>
            <span class="model-option-head">
              <strong>{{ item.label }}</strong>
            </span>
          </span>
          <Check v-if="item.value === modelValue" aria-hidden="true" />
        </button>
      </div>
    </div>
    <small v-if="hint">{{ hint }}</small>
  </div>
</template>
