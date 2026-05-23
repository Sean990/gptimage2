<script setup>
import {
  ChevronDown,
  Download,
  Eraser,
  Expand,
  Layers,
  Maximize2,
  MousePointerClick,
  Scissors,
  ScissorsLineDashed,
  Split,
} from 'lucide-vue-next'
import { ref } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  hasOriginalImage: {
    type: Boolean,
    default: false,
  },
  isCompareActive: {
    type: Boolean,
    default: false,
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  isBusy: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['download', 'toggle-layer-panel', 'toggle-compare', 'toggle-edit', 'use-as-tool'])

const continuationMenuOpen = ref(false)

const continuationTools = [
  { key: 'upscale', label: '放大', icon: Maximize2 },
  { key: 'outpaint', label: '扩图', icon: Expand },
  { key: 'cutout', label: '抠图', icon: Scissors },
  { key: 'erase', label: '消除', icon: Eraser },
]

function toggleContinuationMenu() {
  continuationMenuOpen.value = !continuationMenuOpen.value
}

function closeContinuationMenu() {
  continuationMenuOpen.value = false
}

function useContinuationTool(toolKey) {
  emit('use-as-tool', toolKey, props.item, props.index)
  closeContinuationMenu()
}
</script>

<template>
  <figcaption class="output-actions" :class="{ 'output-actions--compact': compact }">
    <div v-if="compact" class="output-continuation-menu" @keydown.escape.stop="closeContinuationMenu">
      <button
        class="output-continuation-trigger"
        type="button"
        aria-haspopup="menu"
        :aria-expanded="continuationMenuOpen"
        :aria-label="`继续处理 ${item.title || '当前结果'}`"
        @click.stop="toggleContinuationMenu"
      >
        <Maximize2 aria-hidden="true" />
        <span>续作</span>
        <ChevronDown :class="{ rotate: continuationMenuOpen }" aria-hidden="true" />
      </button>
      <div v-if="continuationMenuOpen" class="output-continuation-popover" role="menu">
        <button
          v-for="tool in continuationTools"
          :key="tool.key"
          type="button"
          role="menuitem"
          @click.stop="useContinuationTool(tool.key)"
        >
          <component :is="tool.icon" aria-hidden="true" />
          <span>{{ tool.label }}</span>
        </button>
      </div>
    </div>

    <button class="icon-button output-action-button" type="button" :aria-label="`下载 ${item.title}`" @click.stop="$emit('download', item)">
      <Download aria-hidden="true" />
      <span>下载</span>
    </button>
    <button
      class="icon-button output-action-button"
      type="button"
      :aria-label="item.layers?.length ? `查看 ${item.title} 图层` : `打开 ${item.title} 智能分层面板`"
      :disabled="isBusy"
      @click.stop="$emit('toggle-layer-panel', item, index)"
    >
      <Layers v-if="item.layers?.length" aria-hidden="true" />
      <ScissorsLineDashed v-else aria-hidden="true" />
      <span>{{ item.layers?.length ? '图层' : '分层' }}</span>
    </button>
    <button
      v-if="hasOriginalImage"
      class="icon-button output-action-button"
      type="button"
      :aria-label="`${isCompareActive ? '关闭' : '打开'} ${item.title} 原图对比`"
      @click.stop="$emit('toggle-compare', item, index)"
    >
      <Split aria-hidden="true" />
      <span>对比</span>
    </button>
    <button
      class="icon-button output-action-button"
      type="button"
      :aria-label="`${isEditing ? '关闭' : '打开'} ${item.title} 局部改图`"
      @click.stop="$emit('toggle-edit', item, index)"
    >
      <MousePointerClick aria-hidden="true" />
      <span>改图</span>
    </button>
  </figcaption>
</template>
