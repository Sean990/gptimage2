<script setup>
import { computed } from 'vue'
import { ChevronRight, Sparkles } from 'lucide-vue-next'

const props = defineProps({
  prompt: {
    type: String,
    default: '',
  },
  mode: {
    type: String,
    default: 'generate',
  },
  imageCount: {
    type: Number,
    default: 1,
  },
  modelLabel: {
    type: String,
    default: '',
  },
  activeToolLabel: {
    type: String,
    default: 'AI 生图',
  },
  isGenerateWorkspace: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['click'])

const modeLabels = {
  generate: '文生图',
  image: '图生图',
  edit: '精修图',
}

const displayPrompt = computed(() => {
  if (!props.isGenerateWorkspace) return `继续配置${props.activeToolLabel}`
  if (!props.prompt) return '点击输入提示词开始创作'
  return props.prompt.length > 60 ? props.prompt.slice(0, 60) + '...' : props.prompt
})

const metaItems = computed(() => {
  if (!props.isGenerateWorkspace) {
    return [props.activeToolLabel, '单图处理', props.modelLabel].filter(Boolean)
  }
  return [modeLabels[props.mode] || 'AI 生图', `${props.imageCount} 张`, props.modelLabel].filter(Boolean)
})

const summaryAriaLabel = computed(() => `${displayPrompt.value}，打开创作配置`)
</script>

<template>
  <button type="button" class="prompt-summary-card" :aria-label="summaryAriaLabel" @click="emit('click')">
    <div class="prompt-summary-icon">
      <Sparkles aria-hidden="true" />
    </div>
    <div class="prompt-summary-content">
      <p class="prompt-summary-text">{{ displayPrompt }}</p>
      <div class="prompt-summary-meta">
        <span v-for="item in metaItems" :key="item">{{ item }}</span>
      </div>
    </div>
    <ChevronRight class="prompt-summary-arrow" aria-hidden="true" />
  </button>
</template>
