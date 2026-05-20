<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, Copy, Download, Eye, ImagePlus, Layers3, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const {
  activeMode,
  activeModelLabel,
  batchMode,
  canPreviewGalleryRecord,
  canReuseGalleryRecord,
  copyCurrentPrompt,
  downloadImage,
  formatGalleryDate,
  gallery,
  galleryRecordCover,
  galleryRecordMeta,
  galleryRecordMode,
  galleryRecordStatusLabel,
  generationSubmittedTip,
  gptLoadingDots,
  isGalleryRecordPending,
  loadingHint,
  loadingStatusText,
  loadingTileCount,
  loadingTitle,
  loadingVariant,
  normalizedImageCount,
  openGalleryImage,
  openImagePreview,
  output,
  outputLoading,
  outputAspectStyle,
  outputGridClass,
  outputPlaceholders,
  queuePosition,
  resolutionLabel,
  selectedModel,
} = props.task

const prefersLightweightLoading = ref(false)
const recentStartIndex = ref(0)
const recentTaskLimit = 5
let lightweightLoadingMedia = null

const recentTasks = computed(() => gallery.value.slice(0, 20))
const maxRecentStartIndex = computed(() => Math.max(0, recentTasks.value.length - recentTaskLimit))
const visibleRecentTasks = computed(() =>
  recentTasks.value.slice(recentStartIndex.value, recentStartIndex.value + recentTaskLimit),
)
const canSlideRecentPrev = computed(() => recentStartIndex.value > 0)
const canSlideRecentNext = computed(() => recentStartIndex.value < maxRecentStartIndex.value)

function syncLightweightLoadingPreference(event) {
  prefersLightweightLoading.value = Boolean(event.matches)
}

function slideRecentTasks(direction) {
  recentStartIndex.value = Math.min(
    maxRecentStartIndex.value,
    Math.max(0, recentStartIndex.value + direction * recentTaskLimit),
  )
}

watch(recentTasks, () => {
  if (recentStartIndex.value > maxRecentStartIndex.value) {
    recentStartIndex.value = maxRecentStartIndex.value
  }
})

onMounted(() => {
  lightweightLoadingMedia = window.matchMedia('(max-width: 820px), (prefers-reduced-motion: reduce)')
  syncLightweightLoadingPreference(lightweightLoadingMedia)
  lightweightLoadingMedia.addEventListener('change', syncLightweightLoadingPreference)
})

onBeforeUnmount(() => {
  lightweightLoadingMedia?.removeEventListener('change', syncLightweightLoadingPreference)
})
</script>

<template>
  <aside class="card output-panel" :class="{ 'output-panel--compact': compact }">
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
      <Transition name="fade-fast" mode="out-in">
        <div
          v-if="outputLoading"
          key="loading"
          class="model-loading-state"
          :class="`model-loading-state--${loadingVariant}`"
          role="status"
          aria-live="polite"
        >
          <template v-if="loadingVariant === 'gpt-image-2' && !prefersLightweightLoading">
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
          <template
            v-else-if="
              (loadingVariant === 'nano-banana-2' || loadingVariant === 'nano-banana') && !prefersLightweightLoading
            "
          >
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
              <p v-if="queuePosition && queuePosition.position > 0" class="loading-queue-tip">
                <strong>队列位置：</strong>第 {{ queuePosition.position }} / {{ queuePosition.total }} 位
                <span v-if="queuePosition.position > 1">（前面还有 {{ queuePosition.position - 1 }} 个任务）</span>
              </p>
              <p class="loading-progress-tip">{{ generationSubmittedTip }}</p>
            </div>
            <small class="loading-review-note">审核设置不等于发布许可，商用和公开传播前仍需人工复核。</small>
          </div>
        </div>
        <div
          v-else-if="output.length"
          key="output"
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
        <div v-else key="empty" class="empty-output output-canvas output-grid--single" :style="outputAspectStyle">
          <div v-for="slot in outputPlaceholders" :key="slot" class="empty-output-slot">
            <ImagePlus v-if="slot === 1" aria-hidden="true" />
            <strong>{{ batchMode ? '批量生成的图片会显示在这里' : '生成的图片会显示在这里' }}</strong>
            <span>{{ batchMode ? '选择数量并点击“批量生成”' : '输入提示词并点击“开始生成”' }}</span>
          </div>
        </div>
      </Transition>
    </div>

    <div v-if="recentTasks.length" class="recent-task-strip" aria-label="最近任务">
      <div class="recent-task-head">
        <div>
          <strong>最近任务</strong>
          <span>固定显示 5 个，可左右切换</span>
        </div>
        <div class="recent-task-controls">
          <button
            class="icon-button"
            type="button"
            aria-label="查看上一组最近任务"
            :disabled="!canSlideRecentPrev"
            @click="slideRecentTasks(-1)"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            class="icon-button"
            type="button"
            aria-label="查看更多最近任务"
            :disabled="!canSlideRecentNext"
            @click="slideRecentTasks(1)"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <div class="recent-task-list">
        <article v-for="record in visibleRecentTasks" :key="record.id" class="recent-task-card">
          <button
            class="recent-task-cover"
            type="button"
            :disabled="!canPreviewGalleryRecord(record)"
            :aria-label="
              canPreviewGalleryRecord(record)
                ? `预览最近任务 ${canReuseGalleryRecord(record) ? record.prompt || '' : galleryRecordMode(record)}`
                : galleryRecordStatusLabel(record)
            "
            @click="openGalleryImage(record)"
          >
            <img
              v-if="canPreviewGalleryRecord(record)"
              :src="galleryRecordCover(record)"
              :alt="canReuseGalleryRecord(record) ? record.prompt || '最近任务图片' : galleryRecordMode(record)"
            />
            <span v-else>
              <Loader2 v-if="isGalleryRecordPending(record)" class="spinner" aria-hidden="true" />
              <ImagePlus v-else aria-hidden="true" />
            </span>
            <em :class="{ pending: isGalleryRecordPending(record) }">{{
              galleryRecordStatusLabel(record) || '已记录'
            }}</em>
          </button>
          <div class="recent-task-copy">
            <strong>{{
              canReuseGalleryRecord(record) ? record.prompt || '无提示词记录' : galleryRecordMode(record)
            }}</strong>
            <span>{{ formatGalleryDate(record.createdAt) }} · {{ galleryRecordMeta(record) }}</span>
          </div>
        </article>
      </div>
    </div>
  </aside>
</template>
