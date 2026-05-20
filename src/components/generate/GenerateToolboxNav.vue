<script setup>
import { ArrowRight, Eraser, Expand, ImagePlus, Maximize2, Scissors } from 'lucide-vue-next'

const props = defineProps({
  activeTool: {
    type: String,
    default: 'generate',
  },
})

const emit = defineEmits(['update:activeTool'])

const toolboxItems = [
  {
    key: 'generate',
    title: 'AI生图',
    label: 'Prompt 创作',
    description: '从提示词到成图',
    icon: ImagePlus,
  },
  {
    key: 'upscale',
    title: '高清放大',
    label: '清晰增强',
    description: '细节、纹理、边缘',
    icon: Maximize2,
  },
  {
    key: 'outpaint',
    title: '自由扩图',
    label: '边界延展',
    description: '自然补全画面',
    icon: Expand,
  },
  {
    key: 'cutout',
    title: '智能抠图',
    label: '主体分离',
    description: '透明背景输出',
    icon: Scissors,
  },
  {
    key: 'erase',
    title: '一键消除',
    label: '瑕疵清理',
    description: '移除多余元素',
    icon: Eraser,
  },
]

function selectTool(key) {
  emit('update:activeTool', key)
}
</script>

<template>
  <section class="generate-toolbox" aria-label="图片处理工具">
    <div class="generate-toolbox-grid" role="group" aria-label="图片处理工具">
      <button
        v-for="item in toolboxItems"
        :key="item.key"
        class="generate-toolbox-card"
        :class="[`toolbox-card-${item.key}`, { active: props.activeTool === item.key }]"
        type="button"
        :aria-pressed="props.activeTool === item.key"
        @click="selectTool(item.key)"
      >
        <span class="toolbox-card-kicker">
          <component :is="item.icon" aria-hidden="true" />
          {{ item.label }}
        </span>
        <strong>{{ item.title }}</strong>
        <small>{{ item.description }}</small>
        <em class="toolbox-card-state">
          <span>{{ props.activeTool === item.key ? '当前' : '进入' }}</span>
          <ArrowRight aria-hidden="true" />
        </em>
      </button>
    </div>
  </section>
</template>
