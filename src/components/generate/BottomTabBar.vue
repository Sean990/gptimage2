<script setup>
import { Eraser, Expand, GalleryHorizontal, ImagePlus, Maximize2, Scissors, Sparkles, User } from 'lucide-vue-next'

const props = defineProps({
  activeTool: {
    type: String,
    default: 'generate',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:activeTool', 'open-create', 'open-tools', 'generate', 'open-gallery', 'open-profile'])

const tabs = [
  { key: 'create', label: '创作', icon: ImagePlus },
  { key: 'tools', label: '工具', icon: Sparkles },
  { key: 'generate', label: '生成', isCTA: true },
  { key: 'gallery', label: '图库', icon: GalleryHorizontal },
  { key: 'profile', label: '我的', icon: User },
]

const toolItems = [
  { key: 'generate', title: 'AI生图', icon: ImagePlus },
  { key: 'upscale', title: '高清放大', icon: Maximize2 },
  { key: 'outpaint', title: '自由扩图', icon: Expand },
  { key: 'cutout', title: '智能抠图', icon: Scissors },
  { key: 'erase', title: '一键消除', icon: Eraser },
]

function handleTabClick(key) {
  if (key === 'generate') {
    emit('generate')
  } else if (key === 'gallery') {
    emit('open-gallery')
  } else if (key === 'profile') {
    emit('open-profile')
  } else if (key === 'create') {
    emit('open-create')
  } else if (key === 'tools') {
    emit('open-tools')
  }
}

function isActive(key) {
  if (key === 'create') {
    return props.activeTool === 'generate'
  }
  if (key === 'tools') {
    return toolItems.some((item) => item.key !== 'generate' && item.key === props.activeTool)
  }
  return false
}
</script>

<template>
  <nav class="bottom-tab-bar" role="navigation" aria-label="主导航">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="bottom-tab-item"
      :class="{ active: isActive(tab.key), 'tab-cta': tab.isCTA }"
      :aria-label="tab.label"
      :aria-current="isActive(tab.key) ? 'page' : undefined"
      :disabled="tab.isCTA && loading"
      @click="handleTabClick(tab.key)"
    >
      <span v-if="!tab.isCTA" class="bottom-tab-icon">
        <component :is="tab.icon" aria-hidden="true" />
      </span>
      <span class="bottom-tab-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>
