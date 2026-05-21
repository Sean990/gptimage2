<script setup>
import { ChevronLeft, ChevronRight, Copy, Download, Save, Split, Trash2, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import ModalDialog from '../ModalDialog.vue'
import { getGenerationRecordToolKey } from '../../composables/useGenerationPayload'
import { formatGenerationModelLabel } from '../../composables/useModelPicker'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const {
  canReuseGalleryRecord,
  closeImagePreview,
  copyGalleryPrompt,
  currentPreviewImage,
  downloadPreviewImage,
  imagePreview,
  removeGalleryRecord,
  previewCount,
  previewImages,
  previewPosition,
  setPreviewIndex,
  showNextPreviewImage,
  showPreviousPreviewImage,
  useGalleryRecord,
} = props.task

const stageRef = ref(null)
const compareStageRef = ref(null)
const compareResultImageRef = ref(null)
const dragOffset = ref(0)
const dragging = ref(false)
const releasing = ref(false)
const compareActive = ref(false)
const comparePosition = ref(50)
const compareFrame = ref({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
})
const currentPreviewRecord = computed(() => currentPreviewImage.value?.record || null)
const currentPreviewModelLabel = computed(
  () =>
    currentPreviewImage.value?.modelLabel ||
    formatGenerationModelLabel(currentPreviewImage.value?.model || currentPreviewRecord.value?.model || ''),
)
const canReuseCurrentPreview = computed(
  () => Boolean(currentPreviewRecord.value) && Boolean(canReuseGalleryRecord?.(currentPreviewRecord.value)),
)
const canDeleteCurrentPreview = computed(() => Boolean(currentPreviewRecord.value?.id) && Boolean(removeGalleryRecord))
const compareToolKeys = new Set(['upscale', 'outpaint', 'cutout', 'erase'])
const compareModeKeys = new Set(['image', 'edit'])
const currentPreviewToolKey = computed(
  () => getGenerationRecordToolKey(currentPreviewImage.value || {}) || getGenerationRecordToolKey(currentPreviewRecord.value || {}),
)
const currentPreviewModeKey = computed(() => String(currentPreviewImage.value?.mode || currentPreviewRecord.value?.mode || '').trim())
const canCompareCurrentPreview = computed(() => {
  const image = currentPreviewImage.value
  return Boolean(
    image?.src &&
      image?.originalSrc &&
      image.originalSrc !== image.src &&
      (compareToolKeys.has(currentPreviewToolKey.value) || compareModeKeys.has(currentPreviewModeKey.value)),
  )
})

let pointerActive = false
let startX = 0
let startY = 0
let startTime = 0
let stageWidth = 0
let direction = null
let compareDragState = null
let compareResizeObserver = null
let compareResizeListening = false

const compareFrameStyle = computed(() => {
  if (!compareFrame.value.width || !compareFrame.value.height) return {}
  return {
    width: `${compareFrame.value.width}px`,
    height: `${compareFrame.value.height}px`,
    transform: `translate3d(${compareFrame.value.left}px, ${compareFrame.value.top}px, 0)`,
  }
})

function shouldEnableSwipe() {
  return previewCount.value > 1 && !compareActive.value
}

function onTouchStart(event) {
  if (!shouldEnableSwipe() || event.touches.length !== 1) return
  const touch = event.touches[0]
  pointerActive = true
  startX = touch.clientX
  startY = touch.clientY
  startTime = event.timeStamp
  stageWidth = stageRef.value?.clientWidth || window.innerWidth
  direction = null
  releasing.value = false
  dragging.value = false
  dragOffset.value = 0
}

function onTouchMove(event) {
  if (!pointerActive || event.touches.length !== 1) return
  const touch = event.touches[0]
  const dx = touch.clientX - startX
  const dy = touch.clientY - startY

  if (!direction) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
    direction = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    if (direction === 'y') {
      pointerActive = false
      return
    }
    dragging.value = true
  }

  if (direction === 'x') {
    event.preventDefault()
    dragOffset.value = dx
  }
}

function onTouchEnd(event) {
  if (!pointerActive) return
  pointerActive = false

  if (direction !== 'x' || !dragging.value) {
    dragging.value = false
    dragOffset.value = 0
    return
  }

  const dx = dragOffset.value
  const dt = Math.max(1, event.timeStamp - startTime)
  const velocity = Math.abs(dx) / dt
  const threshold = Math.min(stageWidth * 0.25, 72)
  const shouldSwitch = Math.abs(dx) > threshold || velocity > 0.5

  dragging.value = false
  releasing.value = true
  dragOffset.value = 0

  if (shouldSwitch) {
    if (dx < 0) showNextPreviewImage()
    else showPreviousPreviewImage()
  }

  window.setTimeout(() => {
    releasing.value = false
  }, 220)
}

function onTouchCancel() {
  pointerActive = false
  dragging.value = false
  releasing.value = true
  dragOffset.value = 0
  window.setTimeout(() => {
    releasing.value = false
  }, 220)
}

function setComparePosition(value) {
  const numericValue = Number(value)
  comparePosition.value = Math.min(100, Math.max(0, Number.isFinite(numericValue) ? numericValue : 50))
}

function resetCompareFrame() {
  compareFrame.value = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  }
}

function updateCompareFrame() {
  const stage = compareStageRef.value
  const image = compareResultImageRef.value
  if (!stage || !image?.naturalWidth || !image?.naturalHeight) return

  const rect = stage.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale

  compareFrame.value = {
    left: (rect.width - width) / 2,
    top: (rect.height - height) / 2,
    width,
    height,
  }
}

function stopCompareFrameObserver() {
  if (compareResizeObserver) {
    compareResizeObserver.disconnect()
    compareResizeObserver = null
  }

  if (compareResizeListening) {
    window.removeEventListener('resize', updateCompareFrame)
    compareResizeListening = false
  }
}

function startCompareFrameObserver() {
  stopCompareFrameObserver()

  if (typeof ResizeObserver !== 'undefined' && compareStageRef.value) {
    compareResizeObserver = new ResizeObserver(updateCompareFrame)
    compareResizeObserver.observe(compareStageRef.value)
  }

  window.addEventListener('resize', updateCompareFrame)
  compareResizeListening = true
}

function updateComparePositionFromPointer(event) {
  if (!compareDragState?.frame) return
  const rect = compareDragState.frame.getBoundingClientRect()
  if (!rect.width) return
  setComparePosition(((event.clientX - rect.left) / rect.width) * 100)
}

function stopCompareDrag() {
  if (!compareDragState) return
  window.removeEventListener('pointermove', updateComparePositionFromPointer)
  window.removeEventListener('pointerup', stopCompareDrag)
  window.removeEventListener('pointercancel', stopCompareDrag)
  compareDragState = null
}

function startCompareDrag(event) {
  const frame = event.currentTarget.closest('.image-compare-frame')
  if (!frame) return
  event.currentTarget.focus?.({ preventScroll: true })
  event.preventDefault()
  event.stopPropagation()
  stopCompareDrag()
  compareDragState = { frame }
  updateComparePositionFromPointer(event)
  window.addEventListener('pointermove', updateComparePositionFromPointer)
  window.addEventListener('pointerup', stopCompareDrag)
  window.addEventListener('pointercancel', stopCompareDrag)
}

function handleCompareDividerKeydown(event) {
  const keyMap = {
    ArrowLeft: -2,
    ArrowDown: -2,
    ArrowRight: 2,
    ArrowUp: 2,
    Home: -100,
    End: 100,
  }
  const delta = keyMap[event.key]
  if (delta === undefined) return
  event.preventDefault()
  event.stopPropagation()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 100 : comparePosition.value + delta
  setComparePosition(next)
}

function togglePreviewCompare() {
  if (!canCompareCurrentPreview.value) return
  compareActive.value = !compareActive.value
  if (compareActive.value) {
    dragging.value = false
    releasing.value = false
    dragOffset.value = 0
  } else {
    stopCompareDrag()
  }
}

function useCurrentPreviewRecord() {
  if (!canReuseCurrentPreview.value || !useGalleryRecord) return
  const used = useGalleryRecord(currentPreviewRecord.value)
  if (used !== false) closeImagePreview()
}

function copyCurrentPreviewPrompt() {
  if (!canReuseCurrentPreview.value || !copyGalleryPrompt) return
  copyGalleryPrompt(currentPreviewRecord.value)
}

function deleteCurrentPreviewRecord() {
  if (!canDeleteCurrentPreview.value) return
  removeGalleryRecord(currentPreviewRecord.value.id)
  closeImagePreview()
}

watch(
  () => currentPreviewImage.value?.src,
  () => {
    stopCompareDrag()
    compareActive.value = false
    comparePosition.value = 50
  },
)

watch(canCompareCurrentPreview, (canCompare) => {
  if (!canCompare) compareActive.value = false
})

watch(
  () => compareActive.value && canCompareCurrentPreview.value,
  async (active) => {
    if (!active) {
      stopCompareFrameObserver()
      resetCompareFrame()
      return
    }

    await nextTick()
    updateCompareFrame()
    startCompareFrameObserver()
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  stopCompareDrag()
  stopCompareFrameObserver()
})
</script>

<template>
  <ModalDialog
    :open="Boolean(imagePreview)"
    title-id="image-preview-title"
    backdrop-class="preview-backdrop"
    card-class="image-preview-modal"
    @close="closeImagePreview"
  >
    <div class="modal-head image-preview-head">
      <div>
        <h2 id="image-preview-title">{{ currentPreviewImage?.title }}</h2>
        <div class="image-preview-meta">
          <p>{{ [previewPosition, currentPreviewImage?.meta].filter(Boolean).join(' · ') }}</p>
          <span v-if="currentPreviewModelLabel" class="image-preview-model">模型：{{ currentPreviewModelLabel }}</span>
        </div>
      </div>
      <button class="icon-button" type="button" aria-label="关闭预览" @click="closeImagePreview">
        <X aria-hidden="true" />
      </button>
    </div>
    <div
      ref="stageRef"
      class="image-preview-stage"
      :class="{
        'is-dragging': dragging,
        'is-releasing': releasing,
        'image-preview-stage--compare': compareActive && canCompareCurrentPreview,
      }"
      @touchstart.passive="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchCancel"
    >
      <button
        v-if="previewCount > 1"
        class="icon-button image-preview-nav image-preview-nav-prev"
        type="button"
        aria-label="上一张"
        @click="showPreviousPreviewImage"
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <span
        v-if="compareActive && canCompareCurrentPreview"
        ref="compareStageRef"
        class="image-compare-stage image-preview-compare-stage"
      >
        <span class="image-compare-frame" :style="compareFrameStyle">
          <img
            class="image-compare-base image-compare-before"
            :src="currentPreviewImage?.originalSrc"
            :alt="`${currentPreviewImage?.title || '预览图片'} 原图`"
            draggable="false"
          />
          <span
            class="image-compare-result-pane"
            :style="{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }"
            aria-hidden="true"
          >
            <img
              ref="compareResultImageRef"
              class="image-compare-image image-compare-result"
              :src="currentPreviewImage?.src"
              :alt="`${currentPreviewImage?.title || '预览图片'} 结果`"
              draggable="false"
              @load="updateCompareFrame"
            />
          </span>
          <span
            class="image-compare-divider"
            :style="{ left: `${comparePosition}%` }"
            role="slider"
            tabindex="0"
            :aria-label="`拖动 ${currentPreviewImage?.title || '预览图片'} 原图对比分割线`"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="comparePosition"
            :aria-valuetext="`${comparePosition}%`"
            @click.stop.prevent
            @pointerdown="startCompareDrag"
            @keydown="handleCompareDividerKeydown"
          ></span>
          <span class="image-compare-badge image-compare-badge-before">结果</span>
          <span class="image-compare-badge image-compare-badge-after">原图</span>
        </span>
      </span>
      <img
        v-else
        :src="currentPreviewImage?.src"
        :alt="currentPreviewImage?.title"
        :style="{ transform: `translate3d(${dragOffset}px, 0, 0)` }"
      />
      <button
        v-if="previewCount > 1"
        class="icon-button image-preview-nav image-preview-nav-next"
        type="button"
        aria-label="下一张"
        @click="showNextPreviewImage"
      >
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
    <div v-if="previewCount > 1" class="image-preview-strip" aria-label="预览缩略图">
      <button
        v-for="(item, index) in previewImages"
        :key="`${item.src}-${index}`"
        class="image-preview-thumb"
        :class="{ active: index === imagePreview.index }"
        type="button"
        :aria-label="`查看第 ${index + 1} 张`"
        :aria-current="index === imagePreview.index"
        @click="setPreviewIndex(index)"
      >
        <img :src="item.src" :alt="item.title" />
      </button>
    </div>
    <p v-if="currentPreviewImage?.prompt" class="image-preview-prompt">{{ currentPreviewImage.prompt }}</p>
    <div class="gallery-actions image-preview-actions" aria-label="图片预览操作">
      <button
        v-if="canReuseCurrentPreview"
        class="btn btn-soft image-preview-action-reuse"
        type="button"
        title="复用这组任务参数"
        @click="useCurrentPreviewRecord"
      >
        <Save aria-hidden="true" />
        复用
      </button>
      <button
        v-if="canReuseCurrentPreview"
        class="btn btn-soft image-preview-action-copy"
        type="button"
        title="复制这组任务提示词"
        aria-label="复制提示词"
        @click="copyCurrentPreviewPrompt"
      >
        <Copy aria-hidden="true" />
        复制
      </button>
      <button
        class="btn btn-soft image-preview-action-download"
        type="button"
        aria-label="下载当前图片"
        @click="downloadPreviewImage"
      >
        <Download aria-hidden="true" />
        下载
      </button>
      <button
        v-if="canCompareCurrentPreview"
        class="btn btn-soft image-preview-action-compare"
        :class="{ active: compareActive }"
        type="button"
        :aria-label="`${compareActive ? '关闭' : '打开'}原图对比`"
        @click="togglePreviewCompare"
      >
        <Split aria-hidden="true" />
        {{ compareActive ? '关闭对比' : '原图对比' }}
      </button>
      <button
        v-if="canDeleteCurrentPreview"
        class="btn btn-soft image-preview-action-delete"
        type="button"
        title="删除这组图库记录"
        aria-label="删除图库记录"
        @click="deleteCurrentPreviewRecord"
      >
        <Trash2 aria-hidden="true" />
        删除
      </button>
    </div>
  </ModalDialog>
</template>
