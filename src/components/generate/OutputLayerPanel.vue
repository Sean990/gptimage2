<script setup>
import { Download, Eye, Loader2, ScissorsLineDashed } from 'lucide-vue-next'

defineProps({
  item: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  isOutputActionBusy: {
    type: Function,
    required: true,
  },
  floatingPanelStyle: {
    type: Object,
    default: () => ({}),
  },
})

defineEmits(['start-layer-split', 'download-all-layers', 'download-layer', 'preview-layer'])
</script>

<template>
  <div class="output-layer-panel" :style="floatingPanelStyle">
    <div class="output-layer-head">
      <div>
        <strong>透明 PNG 图层</strong>
        <span>{{ item.layers?.length ? `${item.layers.length} 个图层` : '等待分层结果' }}</span>
      </div>
      <button
        v-if="item.layers?.length"
        class="icon-button"
        type="button"
        aria-label="下载全部图层"
        @click="$emit('download-all-layers', item)"
      >
        <Download aria-hidden="true" />
      </button>
    </div>
    <div v-if="!item.layers?.length" class="output-layer-empty">
      <span class="output-layer-guide" aria-hidden="true">
        <span class="output-layer-guide-card output-layer-guide-card-back"></span>
        <span class="output-layer-guide-card output-layer-guide-card-mid"></span>
        <span class="output-layer-guide-card output-layer-guide-card-front"></span>
      </span>
      <span>将结果图拆成主体、文字、背景透明 PNG 图层。</span>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="isOutputActionBusy(item, index, 'layer-split')"
        @click="$emit('start-layer-split', item, index)"
      >
        <ScissorsLineDashed v-if="!isOutputActionBusy(item, index, 'layer-split')" aria-hidden="true" />
        <Loader2 v-else class="spinner" aria-hidden="true" />
        {{ isOutputActionBusy(item, index, 'layer-split') ? '分层中' : '开始分层' }}
      </button>
    </div>
    <div v-for="layer in item.layers || []" :key="layer.src || layer.url" class="output-layer-row">
      <button
        class="output-layer-thumb"
        type="button"
        :aria-label="`预览 ${layer.label || layer.layerLabel || '图层'}`"
        @click="$emit('preview-layer', layer)"
      >
        <img :src="layer.src || layer.url" :alt="layer.label || layer.layerLabel" draggable="false" />
        <Eye class="output-layer-thumb-icon" aria-hidden="true" />
      </button>
      <span>{{ layer.label || layer.layerLabel || '图层' }}</span>
      <button
        class="icon-button"
        type="button"
        :aria-label="`下载 ${layer.label || layer.layerLabel || '图层'}`"
        @click="$emit('download-layer', layer)"
      >
        <Download aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
