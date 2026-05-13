<script setup>
import { Copy, Download, Eye, ImagePlus, Layers3 } from 'lucide-vue-next'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const {
  activeMode,
  activeModelLabel,
  batchMode,
  copyCurrentPrompt,
  downloadImage,
  generationSubmittedTip,
  gptLoadingDots,
  loading,
  loadingHint,
  loadingStatusText,
  loadingTileCount,
  loadingTitle,
  loadingVariant,
  normalizedImageCount,
  openImagePreview,
  output,
  outputAspectStyle,
  outputGridClass,
  outputPlaceholders,
  resolutionLabel,
  selectedModel,
} = props.task
</script>

<template>
  <aside class="card output-panel">
    <div class="output-panel-head">
      <div class="output-title">
        <Layers3 aria-hidden="true" />
        <div>
          <h2>{{ batchMode ? '生成结果' : 'AI 生成结果' }}</h2>
          <p>{{ batchMode ? '批量生成的图片会显示在这里' : `${activeMode.label} · ${resolutionLabel}` }}</p>
        </div>
      </div>
      <div class="output-meta-row">
        <span>{{ selectedModel.name }}</span>
        <span>{{ activeMode.label }}</span>
        <span>{{ normalizedImageCount }} 张</span>
      </div>
    </div>

    <div class="output-workbench">
      <div
        v-if="loading"
        class="model-loading-state"
        :class="`model-loading-state--${loadingVariant}`"
        role="status"
        aria-live="polite"
      >
        <template v-if="loadingVariant === 'gpt-image-2'">
          <div class="gpt-loading-card" aria-hidden="true">
            <div class="gpt-loading-dot-field">
              <svg viewBox="0 0 280 280" focusable="false" aria-hidden="true">
                <circle
                  v-for="dot in gptLoadingDots"
                  :key="`rest-${dot.id}`"
                  class="gpt-loading-dot"
                  :cx="dot.cx"
                  :cy="dot.cy"
                  :r="dot.restRadius"
                  :opacity="dot.restOpacity"
                />
              </svg>
              <svg class="gpt-loading-dot-reveal" viewBox="0 0 280 280" focusable="false" aria-hidden="true">
                <circle
                  v-for="dot in gptLoadingDots"
                  :key="`lit-${dot.id}`"
                  class="gpt-loading-lit-dot"
                  :cx="dot.cx"
                  :cy="dot.cy"
                  :r="dot.litRadius"
                  :opacity="dot.opacity"
                />
              </svg>
            </div>
          </div>
        </template>
        <template v-else-if="loadingVariant === 'nano-banana-2' || loadingVariant === 'nano-banana'">
          <div class="banana-thinking-loading" aria-hidden="true">
            <div class="banana-thinking-canvas"></div>
          </div>
        </template>
        <template v-else>
          <div class="loading-output-grid output-canvas" :class="outputGridClass" :style="outputAspectStyle">
            <div
              v-for="index in loadingTileCount"
              :key="index"
              class="loading-image-tile"
              :style="{ '--tile-delay': `${(index - 1) * 160}ms` }"
              aria-hidden="true"
            >
              <div class="loading-image-surface">
                <span class="loading-image-glow"></span>
                <span class="loading-image-scan"></span>
              </div>
            </div>
          </div>
        </template>

        <div class="loading-status">
          <div class="loading-status-head">
            <span class="loading-status-dot" aria-hidden="true"></span>
            <div>
              <strong>{{ loadingTitle }}</strong>
              <small>{{ activeModelLabel }} · {{ loadingStatusText }}</small>
            </div>
          </div>
          <div class="loading-status-track" aria-hidden="true">
            <span></span>
          </div>
          <div class="loading-status-body">
            <p>{{ loadingHint }}</p>
            <p class="loading-progress-tip">{{ generationSubmittedTip }}</p>
          </div>
          <small class="loading-review-note">审核设置不等于发布许可，商用和公开传播前仍需人工复核。</small>
        </div>
      </div>
      <div
        v-else-if="output.length"
        class="generated-output output-canvas"
        :class="outputGridClass"
        :style="outputAspectStyle"
      >
        <figure v-for="(item, index) in output" :key="item.src" class="output-item">
          <button
            class="image-preview-trigger"
            type="button"
            :aria-label="`预览 ${item.title}`"
            @click="openImagePreview(output, index, '生成图片')"
          >
            <img :src="item.src" :alt="item.title" />
          </button>
          <figcaption class="output-actions">
            <button
              class="icon-button"
              type="button"
              :aria-label="`预览 ${item.title}`"
              @click="openImagePreview(output, index, '生成图片')"
            >
              <Eye aria-hidden="true" />
            </button>
            <button
              class="icon-button"
              type="button"
              :aria-label="`下载 ${item.title}`"
              @click="downloadImage(item, '生成图片')"
            >
              <Download aria-hidden="true" />
            </button>
            <button class="icon-button" type="button" aria-label="复制当前提示词" @click="copyCurrentPrompt">
              <Copy aria-hidden="true" />
            </button>
          </figcaption>
        </figure>
      </div>
      <div v-else class="empty-output output-canvas output-grid--single" :style="outputAspectStyle">
        <div v-for="slot in outputPlaceholders" :key="slot" class="empty-output-slot">
          <ImagePlus v-if="slot === 1" aria-hidden="true" />
          <strong>{{ batchMode ? '批量生成的图片会显示在这里' : '生成的图片会显示在这里' }}</strong>
          <span>{{ batchMode ? '选择数量并点击“批量生成”' : '输入提示词并点击“开始生成”' }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>
