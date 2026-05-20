<script setup>
import { Eraser, Expand, ImagePlus, Maximize2, Scissors } from 'lucide-vue-next'

const props = defineProps({
  activeTool: {
    type: String,
    default: 'generate',
  },
})

const emit = defineEmits(['update:activeTool'])

const items = [
  { key: 'generate', title: 'AI生图', caption: '创作', icon: ImagePlus },
  { key: 'upscale', title: '高清放大', caption: '清晰', icon: Maximize2 },
  { key: 'outpaint', title: '自由扩图', caption: '扩图', icon: Expand },
  { key: 'cutout', title: '智能抠图', caption: '抠图', icon: Scissors },
  { key: 'erase', title: '一键消除', caption: '消除', icon: Eraser },
]

function select(key) {
  emit('update:activeTool', key)
}
</script>

<template>
  <nav class="generate-side-rail" aria-label="图片处理工具">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="generate-side-rail-item"
      :class="[`rail-item-${item.key}`, { active: props.activeTool === item.key }]"
      :aria-pressed="props.activeTool === item.key"
      :title="item.title"
      @click="select(item.key)"
    >
      <span class="rail-item-icon">
        <component :is="item.icon" aria-hidden="true" />
      </span>
      <span class="rail-item-caption">{{ item.caption }}</span>
    </button>
  </nav>
</template>
