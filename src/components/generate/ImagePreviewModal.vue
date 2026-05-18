<script setup>
import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from 'lucide-vue-next'
import { ref } from 'vue'
import ModalDialog from '../ModalDialog.vue'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const {
  closeImagePreview,
  currentPreviewImage,
  downloadPreviewImage,
  imagePreview,
  openPreviewSource,
  previewCount,
  previewImages,
  previewPosition,
  setPreviewIndex,
  showNextPreviewImage,
  showPreviousPreviewImage,
} = props.task

const stageRef = ref(null)
const dragOffset = ref(0)
const dragging = ref(false)
const releasing = ref(false)

let pointerActive = false
let startX = 0
let startY = 0
let startTime = 0
let stageWidth = 0
let direction = null

function shouldEnableSwipe() {
  return previewCount.value > 1
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
        <p>{{ [previewPosition, currentPreviewImage?.meta].filter(Boolean).join(' · ') }}</p>
      </div>
      <div class="image-preview-actions">
        <button class="icon-button" type="button" aria-label="下载当前图片" @click="downloadPreviewImage">
          <Download aria-hidden="true" />
        </button>
        <button class="icon-button" type="button" aria-label="打开原图" @click="openPreviewSource">
          <ExternalLink aria-hidden="true" />
        </button>
        <button class="icon-button" type="button" aria-label="关闭预览" @click="closeImagePreview">
          <X aria-hidden="true" />
        </button>
      </div>
    </div>
    <div
      ref="stageRef"
      class="image-preview-stage"
      :class="{ 'is-dragging': dragging, 'is-releasing': releasing }"
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
      <img
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
  </ModalDialog>
</template>
