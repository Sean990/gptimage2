<script setup>
import { Copy, Download, ImagePlus, Loader2, RefreshCw, Save, Trash2, X } from 'lucide-vue-next'
import EmptyState from '../EmptyState.vue'
import ModalDialog from '../ModalDialog.vue'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const {
  canPreviewGalleryRecord,
  canRetryGalleryRecord = () => false,
  canReuseGalleryRecord,
  clearGallery,
  closeGallery,
  copyGalleryPrompt,
  downloadGalleryRecord,
  formatGalleryDate,
  gallery,
  galleryCloudStatusText,
  galleryOpen,
  galleryRecordCover,
  galleryRecordMeta,
  galleryRecordModelLabel = () => '',
  galleryRecordMode,
  galleryRecordNotice,
  galleryRecordProgressText,
  galleryRecordStatusLabel,
  gallerySummary,
  gallerySyncError,
  gallerySyncing,
  gallerySyncMessage,
  isAuthenticated,
  isGalleryRecordPending,
  maxLocalGalleryRecords,
  openGalleryImage,
  removeGalleryRecord,
  retryGalleryRecord = () => false,
  syncCloudGallery,
  useGalleryRecord,
} = props.task
</script>

<template>
  <ModalDialog :open="galleryOpen" title-id="gallery-title" card-class="gallery-modal" @close="closeGallery">
    <div class="modal-head">
      <div>
        <h2 id="gallery-title">我的图库</h2>
        <p>{{ gallerySummary }}</p>
      </div>
      <button class="icon-button" type="button" aria-label="关闭图库" @click="closeGallery">
        <X aria-hidden="true" />
      </button>
    </div>

    <div class="gallery-toolbar">
      <div class="gallery-cloud-status" :class="{ error: gallerySyncError }" role="status" aria-live="polite">
        <span>
          <Loader2 v-if="gallerySyncing" class="spinner" aria-hidden="true" />
          <RefreshCw v-else aria-hidden="true" />
        </span>
        <div>
          <strong>{{ gallerySyncMessage || galleryCloudStatusText }}</strong>
          <small>本地保留最近 {{ maxLocalGalleryRecords }} 组记录，云端结果以账户图库为准。</small>
        </div>
      </div>
      <div class="gallery-toolbar-actions">
        <button
          class="btn btn-soft"
          type="button"
          :disabled="gallerySyncing || !isAuthenticated"
          @click="syncCloudGallery({ silent: false })"
        >
          <RefreshCw :class="{ spinner: gallerySyncing }" aria-hidden="true" />
          同步云端
        </button>
        <button class="btn btn-ghost" type="button" :disabled="!gallery.length" @click="clearGallery">
          <Trash2 aria-hidden="true" />
          清空本地
        </button>
      </div>
    </div>

    <div v-if="gallery.length" class="gallery-grid">
      <article v-for="record in gallery" :key="record.id" class="gallery-card">
        <component
          :is="canPreviewGalleryRecord(record) ? 'button' : 'div'"
          class="gallery-cover"
          :class="{ 'gallery-cover--status': !canPreviewGalleryRecord(record) }"
          v-bind="
            canPreviewGalleryRecord(record)
              ? {
                  type: 'button',
                  'aria-label': `预览 ${
                    canReuseGalleryRecord(record) ? record.prompt || '图库图片' : galleryRecordMode(record)
                  }`,
                }
              : {
                  role: 'img',
                  'aria-label': `${galleryRecordStatusLabel(record)} ${
                    canReuseGalleryRecord(record) ? record.prompt || '生成任务' : galleryRecordMode(record)
                  }`,
                }
          "
          @click="canPreviewGalleryRecord(record) ? openGalleryImage(record) : null"
        >
          <img
            v-if="canPreviewGalleryRecord(record)"
            :src="galleryRecordCover(record)"
            :alt="canReuseGalleryRecord(record) ? record.prompt || '图库图片' : galleryRecordMode(record)"
          />
          <span v-else class="gallery-task-placeholder" :class="{ active: isGalleryRecordPending(record) }">
            <span class="gallery-task-icon" aria-hidden="true">
              <Loader2 v-if="isGalleryRecordPending(record)" class="spinner" />
              <ImagePlus v-else />
            </span>
            <span class="gallery-task-copy">
              <strong>{{ galleryRecordStatusLabel(record) || '生成任务' }}</strong>
              <small>{{ galleryRecordProgressText(record) }}</small>
            </span>
          </span>
          <span class="gallery-cover-chips">
            <span class="thumb-chip">{{ galleryRecordMode(record) }}</span>
            <span v-if="galleryRecordModelLabel(record)" class="thumb-chip thumb-chip--model">
              模型：{{ galleryRecordModelLabel(record) }}
            </span>
          </span>
        </component>
        <div class="gallery-card-body">
          <div class="gallery-card-meta">
            <span>{{ formatGalleryDate(record.createdAt) }}</span>
            <span>{{ galleryRecordMeta(record) }}</span>
          </div>
          <p v-if="canReuseGalleryRecord(record)">{{ record.prompt || '无提示词记录' }}</p>
          <p v-if="galleryRecordNotice(record)" class="gallery-card-notice">
            {{ galleryRecordNotice(record) }}
          </p>
          <div class="gallery-actions">
            <button
              v-if="canRetryGalleryRecord(record)"
              class="btn btn-soft"
              type="button"
              :disabled="gallerySyncing"
              @click="retryGalleryRecord(record)"
            >
              <RefreshCw aria-hidden="true" />
              重试
            </button>
            <button
              v-if="canReuseGalleryRecord(record)"
              class="btn btn-soft"
              type="button"
              @click="useGalleryRecord(record)"
            >
              <Save aria-hidden="true" />
              复用
            </button>
            <button
              v-if="canPreviewGalleryRecord(record)"
              class="icon-button"
              type="button"
              aria-label="下载该批图片"
              @click="downloadGalleryRecord(record)"
            >
              <Download aria-hidden="true" />
            </button>
            <button
              v-if="canReuseGalleryRecord(record)"
              class="icon-button"
              type="button"
              aria-label="复制提示词"
              @click="copyGalleryPrompt(record)"
            >
              <Copy aria-hidden="true" />
            </button>
            <button class="icon-button" type="button" aria-label="删除记录" @click="removeGalleryRecord(record.id)">
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    </div>
    <EmptyState
      v-else
      :title="isAuthenticated ? '云端图库暂无记录' : '本地暂无生成记录'"
      :description="
        isAuthenticated ? '完成一次生成后，任务进度和图片结果会同步到这里。' : '登录后可以同步云端图库和生成进度。'
      "
    >
      <template #icon>
        <ImagePlus aria-hidden="true" />
      </template>
    </EmptyState>
  </ModalDialog>
</template>
