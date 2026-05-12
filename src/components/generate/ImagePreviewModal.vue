<script setup>
import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from 'lucide-vue-next'
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
    <div class="image-preview-stage">
      <button
        v-if="previewCount > 1"
        class="icon-button image-preview-nav image-preview-nav-prev"
        type="button"
        aria-label="上一张"
        @click="showPreviousPreviewImage"
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <img :src="currentPreviewImage?.src" :alt="currentPreviewImage?.title" />
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
