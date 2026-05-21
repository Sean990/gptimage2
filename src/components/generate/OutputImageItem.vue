<script setup>
import { computed } from 'vue'
import {
  Copy,
  Download,
  Eye,
  EyeOff,
  Layers,
  MousePointerClick,
  ScissorsLineDashed,
  Split,
} from 'lucide-vue-next'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  itemKey: {
    type: String,
    required: true,
  },
  isCompareActive: {
    type: Boolean,
    default: false,
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  isLayerPanelActive: {
    type: Boolean,
    default: false,
  },
  isOutputActionBusy: {
    type: Function,
    required: true,
  },
  comparePosition: {
    type: Number,
    default: 50,
  },
  editSelection: {
    type: Object,
    default: null,
  },
  editDragActive: {
    type: Boolean,
    default: false,
  },
  outputRatioStyle: {
    type: Object,
    default: () => ({}),
  },
})

defineEmits([
  'toggle-compare',
  'toggle-edit',
  'toggle-layer-panel',
  'download',
  'copy-prompt',
  'open-preview',
  'start-edit-drag',
  'cancel-edit',
  'stage-keydown',
  'update-compare',
  'stop-compare',
])

const compareSliderStyle = computed(() => ({
  left: `${props.comparePosition}%`,
}))

const compareClipStyle = computed(() => ({
  clipPath: `inset(0 ${100 - props.comparePosition}% 0 0)`,
}))

const editSelectionStyle = computed(() => {
  if (!props.editSelection) return {}
  return {
    left: `${props.editSelection.x * 100}%`,
    top: `${props.editSelection.y * 100}%`,
    width: `${props.editSelection.width * 100}%`,
    height: `${props.editSelection.height * 100}%`,
  }
})

const stageClass = computed(() => ({
  'output-image-stage--compare': props.isCompareActive,
  'output-image-stage--editing': props.isEditing,
  'output-image-stage--dragging': props.editDragActive,
}))
</script>

<template>
  <figure class="output-item">
    <div
      class="output-image-stage"
      :class="stageClass"
      :style="outputRatioStyle"
      tabindex="0"
      role="button"
      :aria-label="`预览 ${item.title}`"
      @click="$emit('open-preview', item, index)"
      @pointerdown="isEditing ? $emit('start-edit-drag', $event, item, index) : null"
      @contextmenu="isEditing ? $emit('cancel-edit', $event, item, index) : null"
      @keydown="$emit('stage-keydown', $event, item, index)"
    >
      <img :src="item.src || item.url" :alt="item.title" loading="lazy" draggable="false" />

      <template v-if="isCompareActive && item.originalSrc">
        <div class="output-compare-overlay">
          <img
            class="output-compare-original"
            :src="item.originalSrc"
            :alt="`${item.title} 原图`"
            :style="compareClipStyle"
            draggable="false"
          />
          <button
            class="output-compare-slider"
            type="button"
            :style="compareSliderStyle"
            aria-label="拖动对比原图"
            @pointerdown.stop="$emit('update-compare', $event, item, index)"
          >
            <span class="output-compare-handle" aria-hidden="true">
              <EyeOff />
              <Eye />
            </span>
          </button>
        </div>
      </template>

      <div v-if="isEditing && editSelection" class="output-edit-selection" :style="editSelectionStyle" aria-hidden="true">
        <span class="output-edit-selection-border"></span>
      </div>
    </div>

    <figcaption class="output-actions">
      <button
        v-if="item.originalSrc"
        class="icon-button"
        type="button"
        :aria-label="`${isCompareActive ? '关闭' : '打开'} ${item.title} 原图对比`"
        @click.stop="$emit('toggle-compare', item, index)"
      >
        <Split aria-hidden="true" />
      </button>
      <button
        class="icon-button"
        type="button"
        :aria-label="`${isEditing ? '关闭' : '打开'} ${item.title} 局部改图`"
        @click.stop="$emit('toggle-edit', item, index)"
      >
        <MousePointerClick aria-hidden="true" />
      </button>
      <button
        class="icon-button"
        type="button"
        :aria-label="item.layers?.length ? `查看 ${item.title} 图层` : `打开 ${item.title} 智能分层面板`"
        :disabled="isOutputActionBusy(item, index)"
        @click.stop="$emit('toggle-layer-panel', item, index)"
      >
        <Layers v-if="item.layers?.length" aria-hidden="true" />
        <ScissorsLineDashed v-else aria-hidden="true" />
      </button>
      <button
        class="icon-button"
        type="button"
        :aria-label="`下载 ${item.title}`"
        @click.stop="$emit('download', item, '生成图片')"
      >
        <Download aria-hidden="true" />
      </button>
      <button class="icon-button" type="button" aria-label="复制当前提示词" @click.stop="$emit('copy-prompt')">
        <Copy aria-hidden="true" />
      </button>
    </figcaption>
  </figure>
</template>
